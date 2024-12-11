/**
 * @fileoverview A webpack loader that wraps React components and exported values with appropriate plugin systems.
 * React components are wrapped with withPluginsFC while other values (functions, classes, arrays, objects, strings, numbers, etc.) use withPluginsFn.
 * @module @thebigrick/catalyst-pluginizr
 */

const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const fs = require('node:fs');
const path = require('node:path');

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
 * Wraps an exported value (function or otherwise) with the appropriate plugin wrapper.
 * Functions are wrapped as before:
 * - If it's a React component, use withPluginsFC.
 * - Otherwise, use withPluginsFn.
 * Non-function values (classes, arrays, objects, strings, numbers, etc.) are always wrapped with withPluginsFn.
 * @param {Object} node - The AST node of the exported item.
 * @param {string} identifierName - The identifier name of the variable or function being exported.
 * @param {string} filename - The source file path.
 * @param {boolean} [isDefaultExport=false] - True if it is a default export.
 * @returns {Object} The transformed AST node.
 */
const wrapExportedValue = (node, identifierName, filename, isDefaultExport = false) => {
  const componentCode = getComponentCode(filename, identifierName, isDefaultExport);

  // Check if it is a function
  const isFunctionNode =
    t.isFunctionExpression(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionDeclaration(node);

  if (isFunctionNode) {
    const cloned = t.cloneNode(node, true);
    const isReactComponent = isReactComponentFunction(node);

    normalizeFunctionBody(cloned);

    const wrapperName = isReactComponent ? 'withPluginsFC' : 'withPluginsFn';

    return t.callExpression(t.identifier(wrapperName), [
      t.stringLiteral(componentCode),
      t.functionExpression(
        t.identifier(identifierName),
        cloned.params,
        cloned.body,
        cloned.generator,
        cloned.async,
      ),
    ]);
  }

  // Not a function, wrap with withPluginsFn
  return t.callExpression(t.identifier('withPluginsFn'), [t.stringLiteral(componentCode), node]);
};

/**
 * Wraps exported values with plugins.
 * @param {string} code - The source code.
 * @param {string} filename - The file name.
 * @returns {string} The transformed code with wrapped exports.
 */
const wrapExportedFunctions = (code, filename) => {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  let withPluginsFCImported = false;
  let withPluginsFnImported = false;

  traverse(ast, {
    ImportDeclaration: (declPath) => {
      if (declPath.node.source.value === '@thebigrick/catalyst-pluginizr') {
        declPath.node.specifiers.forEach((spec) => {
          if (t.isImportSpecifier(spec)) {
            if (spec.imported.name === 'withPluginsFC') withPluginsFCImported = true;
            if (spec.imported.name === 'withPluginsFn') withPluginsFnImported = true;
          }
        });
      }
    },
  });

  // Add necessary imports if not present
  const importSpecifiers = [];

  if (!withPluginsFCImported) {
    importSpecifiers.push(
      t.importSpecifier(t.identifier('withPluginsFC'), t.identifier('withPluginsFC')),
    );
  }

  if (!withPluginsFnImported) {
    importSpecifiers.push(
      t.importSpecifier(t.identifier('withPluginsFn'), t.identifier('withPluginsFn')),
    );
  }

  if (importSpecifiers.length > 0) {
    ast.program.body.unshift(
      t.importDeclaration(importSpecifiers, t.stringLiteral('@thebigrick/catalyst-pluginizr')),
    );
  }

  traverse(ast, {
    ExportNamedDeclaration: (declPath) => {
      const { node } = declPath;
      const decl = node.declaration;

      if (decl && t.isFunctionDeclaration(decl) && decl.id) {
        const funcName = decl.id.name;
        const wrapped = wrapExportedValue(decl, funcName, filename);

        declPath.replaceWith(
          t.exportNamedDeclaration(
            t.variableDeclaration('const', [t.variableDeclarator(t.identifier(funcName), wrapped)]),
            [],
          ),
        );
        declPath.skip(); // Prevent re-traversal of the replaced node
      } else if (decl && t.isVariableDeclaration(decl)) {
        const { declarations } = decl;
        let modified = false;

        for (const d of declarations) {
          const { id, init } = d;

          if (t.isIdentifier(id) && init) {
            const wrapped = wrapExportedValue(init, id.name, filename);

            d.init = wrapped;
            modified = true;
          }
        }

        if (modified) {
          declPath.replaceWith(
            t.exportNamedDeclaration(t.variableDeclaration(decl.kind, declarations), []),
          );
          declPath.skip(); // Prevent re-traversal of the replaced node
        }
      }
    },
    ExportDefaultDeclaration: (declPath) => {
      const decl = declPath.node.declaration;
      const baseName = path
        .basename(filename)
        .replace(/\.[jt]sx?$/, '')
        .replace(/[^a-zA-Z0-9]/g, '');
      const funcName = `${baseName}Default`;

      if (
        t.isFunctionDeclaration(decl) ||
        t.isArrowFunctionExpression(decl) ||
        t.isFunctionExpression(decl)
      ) {
        const wrapped = wrapExportedValue(decl, funcName, filename, true);

        declPath.replaceWith(t.exportDefaultDeclaration(wrapped));
        declPath.skip(); // Prevent re-traversal of the replaced node
      } else if (t.isIdentifier(decl)) {
        const name = decl.name;
        const binding = declPath.scope.getBinding(name);

        if (binding && binding.path.isVariableDeclarator()) {
          const init = binding.path.node.init;
          const wrapped = wrapExportedValue(init, name, filename, true);

          binding.path.get('init').replaceWith(wrapped);
          declPath.skip(); // Prevent re-traversal of the replaced node
        }
      } else {
        // The default export is not a function or an identifier; treat it as a value
        const wrapped = wrapExportedValue(decl, funcName, filename, true);

        declPath.replaceWith(t.exportDefaultDeclaration(wrapped));
        declPath.skip(); // Prevent re-traversal of the replaced node
      }
    },
  });

  return generate(ast, {}, code).code;
};

/**
 * Webpack loader that wraps exported items with appropriate plugins.
 * Functions and React components are handled as before.
 * Non-function exports (classes, arrays, objects, strings, numbers, etc.) are also wrapped with withPluginsFn.
 * @param {string} inputCode - The source code to transform.
 * @returns {string} The transformed code.
 */
function pluginizerModifier(inputCode) {
  if (
    inputCode.search(/^['"]use\s*no-plugins['"]\s*;?\s*$/) !== -1 ||
    this.resourcePath.includes('/node_modules/') ||
    this.resourcePath.includes('/packages[/\\]catalyst-pluginizr/')
  ) {
    return inputCode;
  }

  return wrapExportedFunctions(inputCode, this.resourcePath);
}

module.exports = pluginizerModifier;
