/**
 * @fileoverview A webpack loader that wraps React components and exported values with appropriate plugin systems.
 * React components are wrapped with withComponentPlugins while other values (functions, classes, arrays, objects, strings, numbers, etc.) use withFunctionPlugins.
 * @module @thebigrick/catalyst-pluginizr
 */

const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const fs = require('node:fs');
const path = require('node:path');

const { getPluginHash } = require('./get-plugin-hash');
const { getPluginizedComponents } = require('./get-pluginized-components');
const isBuild = require('./is-build');

const packagesNameCache = {};
const tsConfigBaseUrlCache = {};

/**
 * Determines if a function node represents a React component by checking for JSX elements.
 * @param {Object} funcNode - The function node to analyze.
 * @returns {boolean} True if the function contains JSX elements.
 */
const isReactComponentFunction = (funcNode) => {
  let hasJSX = false;
  const bodyNode = t.isFunctionDeclaration(funcNode)
    ? [funcNode]
    : [t.expressionStatement(funcNode)];
  const tempAST = t.file(t.program(bodyNode));

  traverse(tempAST, {
    JSXElement() {
      hasJSX = true;
    },
    JSXFragment() {
      hasJSX = true;
    },
    ReturnStatement(declPath) {
      traverse(
        declPath.node,
        {
          JSXElement() {
            hasJSX = true;
          },
          JSXFragment() {
            hasJSX = true;
          },
        },
        declPath.scope,
      );
    },
  });

  return hasJSX;
};

/**
 * Searches for a file by walking up the directory tree from a starting point.
 * @param {string} filename - The name of the file to find.
 * @param {string} startDir - The directory to start searching from.
 * @returns {string|null} The full path to the found file, or null if not found.
 */
const findUp = (filename, startDir) => {
  let dir = startDir;

  while (dir !== path.parse(dir).root) {
    const candidate = path.join(dir, filename);

    if (fs.existsSync(candidate)) {
      return candidate;
    }

    dir = path.dirname(dir);
  }

  return null;
};

/**
 * Extracts package name from package.json file.
 * @param {string} packageJsonPath - Path to package.json file.
 * @returns {string} Package name or 'unknown-package' if not found.
 */
const getPackageName = (packageJsonPath) => {
  if (!packagesNameCache[packageJsonPath]) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    packagesNameCache[packageJsonPath] = pkg.name || 'unknown-package';
  }

  return packagesNameCache[packageJsonPath];
};

/**
 * Gets baseUrl from tsconfig.json file.
 * @param {string|null} tsconfigPath - Path to tsconfig.json file.
 * @returns {string|null} baseUrl from compiler options or null if not found.
 */
const getBaseUrl = (tsconfigPath) => {
  if (!tsconfigPath) return null;

  if (!tsConfigBaseUrlCache[tsconfigPath]) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    tsConfigBaseUrlCache[tsconfigPath] = tsconfig.compilerOptions?.baseUrl || null;
  }

  return tsConfigBaseUrlCache[tsconfigPath];
};

/**
 * Removes file extension from path.
 * @param {string} filePath - File path with extension.
 * @returns {string} File path without extension.
 */
const removeExtension = (filePath) => filePath.replace(/\.[jt]sx?$/, '');

/**
 * Calculates relative path without baseUrl.
 * @param {string} fileFullPath - Absolute file path.
 * @param {string} projectDir - Project root directory.
 * @param {string|null} baseUrl - Base URL from tsconfig.
 * @returns {string} Relative path using forward slashes.
 */
const relativePathWithoutBaseUrl = (fileFullPath, projectDir, baseUrl) => {
  const relativeToProject = path.relative(path.join(projectDir, baseUrl || ''), fileFullPath);

  return relativeToProject.split(path.sep).join('/');
};

/**
 * Gets project root directory from package.json location.
 * @param {string} packageJsonPath - Path to package.json.
 * @returns {string} Project root directory.
 */
const getProjectRootFromPackageJson = (packageJsonPath) => path.dirname(packageJsonPath);

/**
 * Generates component code path for plugins.
 * @param {string} filename - Component file name.
 * @param {string} identifierName - Component identifier name.
 * @param {boolean} [isDefaultExport=false] - Whether component is default export.
 * @returns {string} Formatted component code path.
 * @throws {Error} If package.json is not found.
 */
const getComponentCode = (filename, identifierName, isDefaultExport = false) => {
  const absolutePath = path.isAbsolute(filename) ? filename : path.resolve(process.cwd(), filename);
  const packageJsonPath = findUp('package.json', path.dirname(absolutePath));

  if (!packageJsonPath) {
    throw new Error(`No package.json was found for ${filename}`);
  }

  const tsconfigPath = findUp('tsconfig.json', path.dirname(absolutePath));

  const info = {
    packageJsonPath,
    packageName: getPackageName(packageJsonPath),
    tsconfigPath,
    baseUrl: getBaseUrl(tsconfigPath),
    projectRoot: getProjectRootFromPackageJson(packageJsonPath),
  };

  const relativePath = relativePathWithoutBaseUrl(absolutePath, info.projectRoot, info.baseUrl);
  let relativePathNoExt = removeExtension(relativePath);

  const parts = relativePathNoExt.split('/');

  if (parts[parts.length - 1] === 'index') {
    parts.pop();
  }

  relativePathNoExt = parts.join('/');

  return isDefaultExport
    ? `${info.packageName}/${relativePathNoExt}`
    : `${info.packageName}/${relativePathNoExt}:${identifierName}`;
};

/**
 * Normalizes function body to ensure it has a block statement.
 * @param {Object} funcNode - Function node to normalize.
 * @returns {void}
 */
const normalizeFunctionBody = (funcNode) => {
  if (
    (t.isArrowFunctionExpression(funcNode) || t.isFunctionExpression(funcNode)) &&
    !t.isBlockStatement(funcNode.body)
  ) {
    funcNode.body = t.blockStatement([t.returnStatement(funcNode.body)]);
  }
};

/**
 * Creates import declaration for the plugin module
 * @param {Object} pluginInfo
 * @returns {Object} Import node and its identifier
 */
const createPluginModuleImport = (pluginInfo) => {
  const identifier = t.identifier(pluginInfo.hash);
  const importDecl = t.importDeclaration(
    [t.importDefaultSpecifier(identifier)],
    t.stringLiteral(`@thebigrick/catalyst-pluginizr/generated/${pluginInfo.hash}`),
  );

  return { importDecl, identifier };
};

/**
 * Wraps an exported value with the appropriate plugin wrapper and tracks dependencies
 * @param {Object} node - The AST node of the exported item
 * @param {string} identifierName - The identifier name of the variable or function being exported
 * @param {string} filename - The source file path
 * @param {boolean} isDefaultExport - True if it is a default export
 * @param {Object} loader
 * @returns {Object} The transformed AST node
 */
const wrapExportedValue = (
  node,
  identifierName,
  filename,
  isDefaultExport,
  loader,
) => {
  const componentCode = getComponentCode(filename, identifierName, isDefaultExport);
  const pluginizedComponents = getPluginizedComponents();

  if (!isBuild()) {
    // Force dependency on the generated plugin module, so it gets recompiled when the plugin is added, changed or removed
    const pluginFile = path.resolve(
      __dirname,
      `../src/generated/${getPluginHash(componentCode)}.ts`,
    );

    // console.log('   Adding dependency:', pluginFile);
    loader.addDependency(pluginFile);
    loader.addMissingDependency(pluginFile);
  }

  // Get plugin info for this component
  const pluginInfo = pluginizedComponents[componentCode];

  if (!pluginInfo) {
    return null;
  }

  console.log('   Applying plugins to:', componentCode);

  // Create import declaration for the generated plugin module
  const { importDecl, identifier } = createPluginModuleImport(pluginInfo);

  const isFunctionNode =
    t.isFunctionExpression(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionDeclaration(node);

  if (isFunctionNode) {
    const cloned = t.cloneNode(node, true);
    const isReactComponent = isReactComponentFunction(node);

    normalizeFunctionBody(cloned);

    const wrapperName = isReactComponent ? 'withComponentPlugins' : 'withFunctionPlugins';

    const wrappedFn = t.isArrowFunctionExpression(node)
      ? t.arrowFunctionExpression(cloned.params, cloned.body, cloned.async)
      : t.functionExpression(null, cloned.params, cloned.body, cloned.generator, cloned.async);

    return {
      node: t.callExpression(t.identifier(wrapperName), [identifier, wrappedFn]),
      imports: [{ importDecl, identifier }],
    };
  }

  // Not a function, wrap with withValuePlugins
  return {
    node: t.callExpression(t.identifier('withValuePlugins'), [identifier, node]),
    imports: [{ importDecl, identifier }],
  };
};

/**
 * Handles export declarations
 * @param {Object} decl
 * @param {string} filename
 * @param {boolean} isDefaultExport
 * @param {Object} loader
 * @returns {void}
 */
const handleExport = (decl, filename, isDefaultExport, loader) => {
  const nodeDecl = decl.node.declaration;

  if (!nodeDecl) {
    return;
  }

  const namedReference = nodeDecl.name;

  if (t.isVariableDeclaration(nodeDecl)) {
    const { declarations } = nodeDecl;
    let modified = false;

    for (const d of declarations) {
      const { id, init } = d;

      if (t.isIdentifier(id) && init) {
        const result = wrapExportedValue(init, id.name, filename, false, loader);

        if (!result) {
          continue;
        }

        d.init = result.node;
        modified = true;

        if (result.imports[0].importDecl) {
          decl.insertBefore(result.imports[0].importDecl);
        }
      }
    }

    if (modified) {
      decl.replaceWith(
        t.exportNamedDeclaration(t.variableDeclaration(nodeDecl.kind, declarations), []),
      );
      decl.skip();
    }
  } else if (
    t.isFunctionDeclaration(nodeDecl) ||
    t.isIdentifier(nodeDecl) ||
    t.isExpression(nodeDecl)
  ) {
    const funcName = isDefaultExport ? null : nodeDecl.id?.name;

    if (namedReference) {
      const binding = decl.scope.getBinding(namedReference);

      if (binding && binding.path.isVariableDeclarator()) {
        const result = wrapExportedValue(
          binding.path.node.init,
          funcName,
          filename,
          isDefaultExport,
          loader,
        );

        if (!result) {
          return;
        }

        if (result.imports[0].importDecl) {
          binding.path.parentPath.insertBefore(result.imports[0].importDecl);
        }

        binding.path.get('init').replaceWith(result.node);
      } else if (binding && binding.path.isFunctionDeclaration()) {
        const result = wrapExportedValue(
          binding.path.node,
          funcName,
          filename,
          isDefaultExport,
          loader,
        );

        if (!result) {
          return;
        }

        if (result.imports[0].importDecl) {
          binding.path.insertBefore(result.imports[0].importDecl);
        }

        const varDecl = t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier(namedReference), result.node),
        ]);

        binding.path.replaceWith(varDecl);
      }
    } else {
      const result = wrapExportedValue(
        nodeDecl,
        funcName,
        filename,
        isDefaultExport,
        loader,
      );

      if (!result) {
        return;
      }

      if (result.imports[0].importDecl) {
        decl.insertBefore(result.imports[0].importDecl);
      }

      if (isDefaultExport) {
        decl.replaceWith(t.exportDefaultDeclaration(result.node));
      } else {
        const varDecl = t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier(nodeDecl.id?.name), result.node),
        ]);

        decl.replaceWith(t.exportNamedDeclaration(varDecl, []));
      }
    }

    decl.skip();
  }
};

/**
 * Main pluginizr function
 * This function is called by webpack for each module that needs transformation
 * @param {string} code - The source code to transform
 * @param {string} [sourcePath] - The source file path (for webpack loaders)
 * @param {Object} [loader] - The webpack loader context
 * @returns {string} The transformed code
 */
function pluginizr(code, sourcePath, loader) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  let withComponentPluginsImported = false;
  let withFunctionPluginsImported = false;
  let withValuePluginsImported = false;

  traverse(ast, {
    ImportDeclaration: (declPath) => {
      if (declPath.node.source.value === '@thebigrick/catalyst-pluginizr') {
        declPath.node.specifiers.forEach((spec) => {
          if (t.isImportSpecifier(spec)) {
            if (spec.imported.name === 'withComponentPlugins') withComponentPluginsImported = true;
            if (spec.imported.name === 'withFunctionPlugins') withFunctionPluginsImported = true;
            if (spec.imported.name === 'withValuePlugins') withValuePluginsImported = true;
          }
        });
      }
    },
  });

  const importSpecifiers = [];

  if (!withComponentPluginsImported) {
    importSpecifiers.push(
      t.importSpecifier(t.identifier('withComponentPlugins'), t.identifier('withComponentPlugins')),
    );
  }

  if (!withFunctionPluginsImported) {
    importSpecifiers.push(
      t.importSpecifier(t.identifier('withFunctionPlugins'), t.identifier('withFunctionPlugins')),
    );
  }

  if (!withValuePluginsImported) {
    importSpecifiers.push(
      t.importSpecifier(t.identifier('withValuePlugins'), t.identifier('withValuePlugins')),
    );
  }

  if (importSpecifiers.length > 0) {
    ast.program.body.unshift(
      t.importDeclaration(importSpecifiers, t.stringLiteral('@thebigrick/catalyst-pluginizr')),
    );
  }

  traverse(ast, {
    ExportNamedDeclaration: (declPath) => {
      handleExport(declPath, sourcePath, false, loader);
    },
    ExportDefaultDeclaration: (declPath) => {
      handleExport(declPath, sourcePath, true, loader);
    },
  });

  return generate(ast, {}, code).code;
}

module.exports = pluginizr;
