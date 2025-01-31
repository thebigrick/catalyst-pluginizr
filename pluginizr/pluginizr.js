/**
 * @fileoverview A webpack loader that enhances React components and exported values with plugin capabilities.
 * This module wraps React components with withComponentPlugins and other values with withFunctionPlugins.
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

// Cache storage
const CACHE = {
  packageNames: {},
  tsConfigBaseUrl: {},
};

/**
 * Searches for a file by walking up the directory tree from a starting point.
 * @param {string} filename - The name of the file to find
 * @param {string} startDir - The directory to start searching from
 * @returns {string|null} The full path to the found file, or null if not found
 */
const findUp = (filename, startDir) => {
  let currentDir = startDir;
  const { root } = path.parse(currentDir);

  while (currentDir !== root) {
    const candidatePath = path.join(currentDir, filename);

    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
};

/**
 * Extracts package name from package.json file with caching.
 * @param {string} packageJsonPath - Path to package.json file
 * @returns {string} Package name or 'unknown-package' if not found
 */
const getPackageName = (packageJsonPath) => {
  if (!CACHE.packageNames[packageJsonPath]) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    CACHE.packageNames[packageJsonPath] = pkg.name || 'unknown-package';
  }

  return CACHE.packageNames[packageJsonPath];
};

/**
 * Gets baseUrl from tsconfig.json file with caching.
 * @param {string|null} tsconfigPath - Path to tsconfig.json file
 * @returns {string|null} baseUrl from compiler options or null if not found
 */
const getBaseUrl = (tsconfigPath) => {
  if (!tsconfigPath) return null;

  if (!CACHE.tsConfigBaseUrl[tsconfigPath]) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    CACHE.tsConfigBaseUrl[tsconfigPath] = tsconfig.compilerOptions?.baseUrl || null;
  }

  return CACHE.tsConfigBaseUrl[tsconfigPath];
};

/**
 * Removes file extension from path.
 * @param {string} filePath - File path with extension
 * @returns {string} File path without extension
 */
const removeExtension = (filePath) => filePath.replace(/\.[jt]sx?$/, '');

/**
 * Calculates relative path without baseUrl.
 * @param {string} fileFullPath - Absolute file path
 * @param {string} projectDir - Project root directory
 * @param {string|null} baseUrl - Base URL from tsconfig
 * @returns {string} Relative path using forward slashes
 */
const relativePathWithoutBaseUrl = (fileFullPath, projectDir, baseUrl) => {
  const relativeToProject = path.relative(path.join(projectDir, baseUrl || ''), fileFullPath);

  return relativeToProject.split(path.sep).join('/');
};

/**
 * Gets project information including package details and configuration paths.
 * @param {string} filename - The source file path
 * @returns {ProjectInfo} Project information object
 * @throws {Error} If package.json is not found
 */
const getProjectInfo = (filename) => {
  const absolutePath = path.isAbsolute(filename) ? filename : path.resolve(process.cwd(), filename);
  const packageJsonPath = findUp('package.json', path.dirname(absolutePath));

  if (!packageJsonPath) {
    throw new Error(`No package.json was found for ${filename}`);
  }

  const tsconfigPath = findUp('tsconfig.json', path.dirname(absolutePath));

  return {
    packageJsonPath,
    packageName: getPackageName(packageJsonPath),
    tsconfigPath,
    baseUrl: getBaseUrl(tsconfigPath),
    projectRoot: path.dirname(packageJsonPath),
  };
};

/**
 * Generates component code path for plugins.
 * @param {string} filename - Component file name
 * @param {string} identifierName - Component identifier name
 * @param {boolean} [isDefaultExport=false] - Whether component is default export
 * @returns {string} Formatted component code path
 */
const getComponentCode = (filename, identifierName, isDefaultExport = false) => {
  const info = getProjectInfo(filename);
  const relativePath = relativePathWithoutBaseUrl(
    path.isAbsolute(filename) ? filename : path.resolve(process.cwd(), filename),
    info.projectRoot,
    info.baseUrl,
  );

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
 * Determines if a function node represents a React component.
 * @param {Object} funcNode - The function node to analyze
 * @returns {boolean} True if the function contains JSX elements
 */
const isReactComponentFunction = (funcNode) => {
  let hasJSX = false;
  const bodyNode = t.isFunctionDeclaration(funcNode)
    ? [funcNode]
    : [t.expressionStatement(funcNode)];

  traverse(t.file(t.program(bodyNode)), {
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
 * Normalizes function body to ensure it has a block statement.
 * @param {Object} funcNode - Function node to normalize
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
 * Creates import declaration for the plugin module.
 * @param {Object} pluginInfo - Plugin information
 * @returns {PluginImport} Import declaration and identifier
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
 * Creates a temporary variable declaration to hold the original expression result.
 * @param {Object} scope - The scope in which to create the variable
 * @param {Object} originalInit - The original initialization expression
 * @returns {Object} Object containing the temporary identifier and declaration
 */
const createTempVariableDeclaration = (scope, originalInit) => {
  const temp = scope.generateUidIdentifier('temp');

  return {
    temp,
    declaration: t.variableDeclaration('const', [t.variableDeclarator(temp, originalInit)]),
  };
};

/**
 * Creates an expression to access a property from the temporary variable.
 * @param {Object} temp - The temporary variable identifier
 * @param {Object} property - The property to access
 * @returns {Object} Member expression node
 */
const createMemberAccessExpression = (temp, property) => {
  if (t.isIdentifier(property.key)) {
    return t.memberExpression(temp, t.identifier(property.key.name));
  }

  return t.memberExpression(temp, property.key, true);
};

/**
 * Finds the property matching a name in the destructuring pattern.
 * @param {Object} pattern - The destructuring pattern
 * @param {string} name - The name to find
 * @returns {Object|null} The matching property or null
 */
const findPropertyForName = (pattern, name) => {
  if (!pattern.properties) return null;

  return pattern.properties.find(
    (p) =>
      (t.isIdentifier(p.value) && p.value.name === name) ||
      (t.isIdentifier(p.key) && p.key.name === name),
  );
};

/**
 * Wraps an exported value with the appropriate plugin wrapper.
 * @param {Object} node - The AST node of the exported item
 * @param {string} identifierName - The identifier name
 * @param {string} filename - The source file path
 * @param {boolean} isDefaultExport - Whether it's a default export
 * @param {Object} loader - The webpack loader context
 * @returns {TransformResult|null} The transformed node and imports, or null if no transformation needed
 */
const wrapExportedValue = (node, identifierName, filename, isDefaultExport, loader) => {
  const componentCode = getComponentCode(filename, identifierName, isDefaultExport);
  const pluginizedComponents = getPluginizedComponents();
  const pluginFile = path.resolve(__dirname, `../src/generated/${getPluginHash(componentCode)}.ts`);

  // Add dependencies
  loader.addDependency(pluginFile);
  loader.addMissingDependency(pluginFile);

  const pluginInfo = pluginizedComponents[componentCode];

  if (!pluginInfo) return null;

  console.log('   Applying plugins to:', componentCode);

  const { importDecl, identifier } = createPluginModuleImport(pluginInfo);

  if (
    t.isFunctionExpression(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionDeclaration(node)
  ) {
    const clonedNode = t.cloneNode(node, true);

    normalizeFunctionBody(clonedNode);

    const wrapperName = isReactComponentFunction(node)
      ? 'withComponentPlugins'
      : 'withFunctionPlugins';

    const wrappedFunction = t.isArrowFunctionExpression(node)
      ? t.arrowFunctionExpression(clonedNode.params, clonedNode.body, clonedNode.async)
      : t.functionExpression(
          null,
          clonedNode.params,
          clonedNode.body,
          clonedNode.generator,
          clonedNode.async,
        );

    return {
      node: t.callExpression(t.identifier(wrapperName), [identifier, wrappedFunction]),
      imports: [{ importDecl, identifier }],
    };
  }

  return {
    node: t.callExpression(t.identifier('withValuePlugins'), [identifier, node]),
    imports: [{ importDecl, identifier }],
  };
};

/**
 * Creates declarations for destructured variables.
 * @param {Object} temp - Temporary variable identifier
 * @param {Array} items - Destructured items
 * @param {string} filename - Source filename
 * @param {Object} loader - Webpack loader
 * @param {Set} imports - Set of imports
 * @returns {Array} Array of variable declarations
 */
const createDestructuredAssignments = (temp, items, filename, loader, imports) => {
  const assignments = [];

  for (const { specifier } of items) {
    const name = specifier.local.name;
    const property = findPropertyForName(items[0].binding.path.node.id, name);

    if (!property) continue;

    const memberExpr = createMemberAccessExpression(temp, property);
    const result = wrapExportedValue(memberExpr, name, filename, false, loader);

    if (result?.imports?.[0]) {
      imports.add(result.imports[0].importDecl);
    }

    assignments.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(name), result ? result.node : memberExpr),
      ]),
    );
  }

  return assignments;
};

/**
 * Groups export specifiers by their binding path.
 * @param {Array} specifiers - Export specifiers
 * @param {Object} scope - Current scope
 * @returns {Map} Map of binding paths to specifiers
 */
const groupSpecifiersByBinding = (specifiers, scope) => {
  const bindings = new Map();

  for (const specifier of specifiers) {
    const binding = scope.getBinding(specifier.local.name);

    if (!binding?.path) continue;

    const bindingPath = binding.path.parentPath;

    if (!bindings.has(bindingPath)) {
      bindings.set(bindingPath, []);
    }

    bindings.get(bindingPath).push({ specifier, binding });
  }

  return bindings;
};

/**
 * Handles the export of destructured variables.
 * @param {Object} bindingPath - The binding path
 * @param {Array} items - Export items
 * @param {Object} decl - Declaration node
 * @param {string} filename - Source filename
 * @param {Object} loader - Webpack loader
 * @param {Set} imports - Set of imports
 * @returns {boolean} True if handled successfully
 */
const handleDestructuredExport = (bindingPath, items, decl, filename, loader, imports) => {
  const firstBinding = items[0].binding;

  if (
    !firstBinding.path.isVariableDeclarator() ||
    (!t.isObjectPattern(firstBinding.path.node.id) && !t.isArrayPattern(firstBinding.path.node.id))
  ) {
    return false;
  }

  const { temp, declaration } = createTempVariableDeclaration(
    decl.scope,
    firstBinding.path.node.init,
  );

  const assignments = createDestructuredAssignments(temp, items, filename, loader, imports);

  decl.insertBefore(declaration);
  decl.insertBefore(assignments);
  bindingPath.remove();

  return true;
};

/**
 * Handles variable declarations in exports.
 * @param {Object} ast - The AST
 * @param {Object} decl - Declaration node
 * @param {Object} nodeDecl - Node declaration
 * @param {string} filename - Source filename
 * @param {Object} loader - Webpack loader
 * @param {Set} imports - Set of imports
 * @returns {boolean} True if changes were made
 */
const handleVariableDeclaration = (ast, decl, nodeDecl, filename, loader, imports) => {
  const { declarations } = nodeDecl;
  let modified = false;

  for (const declaration of declarations) {
    const { id, init } = declaration;

    if (t.isIdentifier(id) && init) {
      const result = wrapExportedValue(init, id.name, filename, false, loader);

      if (!result) continue;

      declaration.init = result.node;
      modified = true;

      if (result.imports?.[0]) {
        imports.add(result.imports[0].importDecl);
      }
    }
  }

  if (modified) {
    decl.replaceWith(
      t.exportNamedDeclaration(t.variableDeclaration(nodeDecl.kind, declarations), []),
    );
    decl.skip();
  }

  return modified;
};

/**
 * Handles named references in exports.
 * @param {Object} ast - The AST
 * @param {Object} decl - Declaration node
 * @param {string} namedReference - Reference name
 * @param {string} funcName - Function name
 * @param {string} filename - Source filename
 * @param {boolean} isDefaultExport - Whether it's a default export
 * @param {Object} loader - Webpack loader
 * @param {Set} imports - Set of imports
 * @returns {boolean} True if changes were made
 */
const handleNamedReference = (
  ast,
  decl,
  namedReference,
  funcName,
  filename,
  isDefaultExport,
  loader,
  imports,
) => {
  const binding = decl.scope.getBinding(namedReference);

  if (!binding) return false;

  if (binding.path.isVariableDeclarator()) {
    const result = wrapExportedValue(
      binding.path.node.init,
      funcName,
      filename,
      isDefaultExport,
      loader,
    );

    if (!result) return false;

    if (result.imports?.[0]) {
      imports.add(result.imports[0].importDecl);
    }

    binding.path.get('init').replaceWith(result.node);

    return true;
  }

  if (binding.path.isFunctionDeclaration()) {
    const result = wrapExportedValue(
      binding.path.node,
      funcName,
      filename,
      isDefaultExport,
      loader,
    );

    if (!result) return false;

    if (result.imports?.[0]) {
      imports.add(result.imports[0].importDecl);
    }

    const varDecl = t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier(namedReference), result.node),
    ]);

    binding.path.replaceWith(varDecl);

    return true;
  }

  return false;
};

/**
 * Handles direct exports without named references.
 * @param {Object} ast - The AST
 * @param {Object} decl - Declaration node
 * @param {Object} nodeDecl - Node declaration
 * @param {string} funcName - Function name
 * @param {string} filename - Source filename
 * @param {boolean} isDefaultExport - Whether it's a default export
 * @param {Object} loader - Webpack loader
 * @param {Set} imports - Set of imports
 * @returns {boolean} True if changes were made
 */
const handleDirectExport = (
  ast,
  decl,
  nodeDecl,
  funcName,
  filename,
  isDefaultExport,
  loader,
  imports,
) => {
  const result = wrapExportedValue(nodeDecl, funcName, filename, isDefaultExport, loader);

  if (!result) return false;

  if (result.imports?.[0]) {
    imports.add(result.imports[0].importDecl);
  }

  if (isDefaultExport) {
    decl.replaceWith(t.exportDefaultDeclaration(result.node));
  } else {
    const varDecl = t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier(nodeDecl.id?.name), result.node),
    ]);

    decl.replaceWith(t.exportNamedDeclaration(varDecl, []));
  }

  decl.skip();

  return true;
};

/**
 * Handles the export of various declaration types.
 * @param {Object} ast - The AST
 * @param {Object} decl - Declaration node
 * @param {string} filename - Source filename
 * @param {boolean} isDefaultExport - Whether it's a default export
 * @param {Object} loader - Webpack loader
 * @param {Set} imports - Set of imports
 * @returns {boolean} True if changes were made
 */
const handleExport = (ast, decl, filename, isDefaultExport, loader, imports) => {
  // Handle indirect exports (export { ... })
  if (decl.node.specifiers?.length > 0 && !decl.node.declaration) {
    let modified = false;
    const bindings = groupSpecifiersByBinding(decl.node.specifiers, decl.scope);

    for (const [bindingPath, items] of bindings) {
      if (handleDestructuredExport(bindingPath, items, decl, filename, loader, imports)) {
        modified = true;
        continue;
      }

      // Handle non-destructured indirect exports
      for (const { specifier, binding } of items) {
        const declarator = binding.path.node;

        if (!t.isVariableDeclarator(declarator)) continue;

        const result = wrapExportedValue(
          declarator.init,
          specifier.exported.name,
          filename,
          isDefaultExport,
          loader,
        );

        if (!result) continue;

        if (result.imports?.[0]) {
          imports.add(result.imports[0].importDecl);
        }

        declarator.init = result.node;
        modified = true;
      }
    }

    return modified;
  }

  const nodeDecl = decl.node.declaration;

  if (!nodeDecl) return false;

  const namedReference = nodeDecl.name;
  const funcName = isDefaultExport ? null : nodeDecl.id?.name;

  if (t.isVariableDeclaration(nodeDecl)) {
    return handleVariableDeclaration(ast, decl, nodeDecl, filename, loader, imports);
  }

  if (t.isFunctionDeclaration(nodeDecl) || t.isIdentifier(nodeDecl) || t.isExpression(nodeDecl)) {
    if (namedReference) {
      return handleNamedReference(
        ast,
        decl,
        namedReference,
        funcName,
        filename,
        isDefaultExport,
        loader,
        imports,
      );
    }

    return handleDirectExport(
      ast,
      decl,
      nodeDecl,
      funcName,
      filename,
      isDefaultExport,
      loader,
      imports,
    );
  }

  return false;
};

/**
 * Adds required imports for plugin wrappers.
 * @param {Object} ast - The AST
 * @param {Set} imports - Set of imports to add
 */
const addRequiredImports = (ast, imports) => {
  let hasComponentPlugins = false;
  let hasFunctionPlugins = false;
  let hasValuePlugins = false;

  traverse(ast, {
    ImportDeclaration: (declPath) => {
      if (declPath.node.source.value === '@thebigrick/catalyst-pluginizr') {
        declPath.node.specifiers.forEach((spec) => {
          if (t.isImportSpecifier(spec)) {
            if (spec.imported.name === 'withComponentPlugins') hasComponentPlugins = true;
            if (spec.imported.name === 'withFunctionPlugins') hasFunctionPlugins = true;
            if (spec.imported.name === 'withValuePlugins') hasValuePlugins = true;
          }
        });
      }
    },
  });

  if (!hasComponentPlugins || !hasFunctionPlugins || !hasValuePlugins) {
    imports.add(
      t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier('withComponentPlugins'),
            t.identifier('withComponentPlugins'),
          ),
          t.importSpecifier(
            t.identifier('withFunctionPlugins'),
            t.identifier('withFunctionPlugins'),
          ),
          t.importSpecifier(t.identifier('withValuePlugins'), t.identifier('withValuePlugins')),
        ],
        t.stringLiteral('@thebigrick/catalyst-pluginizr'),
      ),
    );
  }
};

/**
 * Main pluginizr function that transforms source code by wrapping exports with plugins.
 * @param {string} code - The source code to transform
 * @param {string} [sourcePath] - The source file path
 * @param {Object} [loader] - The webpack loader context
 * @returns {string} The transformed code
 */
function pluginizr(code, sourcePath, loader) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  let isPluginized = false;
  const imports = new Set();

  // Process exports
  traverse(ast, {
    ExportNamedDeclaration: (declPath) => {
      if (handleExport(ast, declPath, sourcePath, false, loader, imports)) {
        isPluginized = true;
      }
    },
    ExportDefaultDeclaration: (declPath) => {
      if (handleExport(ast, declPath, sourcePath, true, loader, imports)) {
        isPluginized = true;
      }
    },
  });

  if (!isPluginized) return code;

  // Add required imports
  addRequiredImports(ast, imports);

  // Add all collected imports at the start of the file
  ast.program.body.unshift(...Array.from(imports));

  return generate(ast, {}, code).code;
}

module.exports = pluginizr;
