/**
 * @fileoverview A webpack loader that wraps React components and exported values with appropriate plugin systems.
 * React components are wrapped with withComponentPlugins while other values (functions, classes, arrays, objects, strings, numbers, etc.) use withFunctionPlugins.
 * @module @thebigrick/catalyst-pluginizr
 */

import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'node:fs';
import path from 'node:path';
import type { LoaderContext } from 'webpack';

import { getPluginHash } from '../config/get-plugin-hash';
import { getPluginizedComponents } from '../config/get-pluginized-components';

interface PluginInfo {
  hash: string;
  plugins: Array<{ id: string; path: string }>;
}

interface ModuleImport {
  importDecl: t.ImportDeclaration;
  identifier: t.Identifier;
}

interface WrapResult {
  node: t.Expression;
  imports: ModuleImport[];
}

interface PackageInfo {
  packageJsonPath: string;
  packageName: string;
  tsconfigPath: string | null;
  baseUrl: string | null;
  projectRoot: string;
}

const packagesNameCache: Record<string, string> = {};
const tsConfigBaseUrlCache: Record<string, string | null> = {};

/**
 * Determines if a function node represents a React component by checking for JSX elements.
 * @param {Object} funcNode - The function node to analyze.
 * @returns {boolean} True if the function contains JSX elements.
 */
const isReactComponentFunction = (funcNode: t.Function): boolean => {
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
const findUp = (filename: string, startDir: string): string | null => {
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
const getPackageName = (packageJsonPath: string): string => {
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
const getBaseUrl = (tsconfigPath: string | null): string | null => {
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
const removeExtension = (filePath: string): string => filePath.replace(/\.[jt]sx?$/, '');

/**
 * Calculates relative path without baseUrl.
 * @param {string} fileFullPath - Absolute file path.
 * @param {string} projectDir - Project root directory.
 * @param {string|null} baseUrl - Base URL from tsconfig.
 * @returns {string} Relative path using forward slashes.
 */
const relativePathWithoutBaseUrl = (
  fileFullPath: string,
  projectDir: string,
  baseUrl: string | null,
): string => {
  const relativeToProject = path.relative(path.join(projectDir, baseUrl || ''), fileFullPath);

  return relativeToProject.split(path.sep).join('/');
};

/**
 * Gets project root directory from package.json location.
 * @param {string} packageJsonPath - Path to package.json.
 * @returns {string} Project root directory.
 */
const getProjectRootFromPackageJson = (packageJsonPath: string): string =>
  path.dirname(packageJsonPath);

/**
 * Generates component code path for plugins.
 * @param {string} filename - Component file name.
 * @param {string} identifierName - Component identifier name.
 * @param {boolean} [isDefaultExport=false] - Whether component is default export.
 * @returns {string} Formatted component code path.
 * @throws {Error} If package.json is not found.
 */
const getComponentCode = (
  filename: string,
  identifierName: string,
  isDefaultExport = false,
): string => {
  const absolutePath = path.isAbsolute(filename) ? filename : path.resolve(process.cwd(), filename);
  const packageJsonPath = findUp('package.json', path.dirname(absolutePath));

  if (!packageJsonPath) {
    throw new Error(`No package.json was found for ${filename}`);
  }

  const tsconfigPath = findUp('tsconfig.json', path.dirname(absolutePath));

  const info: PackageInfo = {
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
const normalizeFunctionBody = (funcNode: t.Function): void => {
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
const createPluginModuleImport = (pluginInfo: PluginInfo): ModuleImport => {
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
  node: t.Node,
  identifierName: string,
  filename: string,
  isDefaultExport: boolean,
  loader: LoaderContext<unknown>,
): WrapResult | null => {
  const componentCode = getComponentCode(filename, identifierName, isDefaultExport);
  const pluginizedComponents = getPluginizedComponents();

  const pluginFile = path.resolve(__dirname, `../src/generated/${getPluginHash(componentCode)}.ts`);

  loader.addDependency(pluginFile);
  loader.addMissingDependency(pluginFile);

  const pluginInfo = pluginizedComponents[componentCode];

  if (!pluginInfo) {
    return null;
  }

  console.log('   Applying plugins to:', componentCode);

  const { importDecl, identifier } = createPluginModuleImport(pluginInfo);

  const isFunctionNode =
    t.isFunctionExpression(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionDeclaration(node);

  if (isFunctionNode) {
    const cloned = t.cloneNode(node, true) as t.Function;
    const isReactComponent = isReactComponentFunction(cloned);

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

  return {
    node: t.callExpression(t.identifier('withValuePlugins'), [identifier, node as t.Expression]),
    imports: [{ importDecl, identifier }],
  };
};

/**
 * Handles the export of various declaration types, modifying them as needed
 * @param {Object} ast - The AST object
 * @param {Object} decl - The declaration object to process
 * @param {string} filename - The file name
 * @param {boolean} isDefaultExport - Indicates if it's a default export
 * @param {Object} loader - The loader to use
 * @returns {boolean} - True if changes were made, false otherwise
 */
const handleExport = (
  ast: t.File,
  decl: traverse.NodePath<t.ExportNamedDeclaration | t.ExportDefaultDeclaration>,
  filename: string,
  isDefaultExport: boolean,
  loader: LoaderContext<unknown>,
): boolean => {
  const nodeDecl = (decl.node as t.ExportNamedDeclaration | t.ExportDefaultDeclaration).declaration;

  if (!nodeDecl) {
    return false;
  }

  const namedReference = (nodeDecl as t.Identifier).name;

  if (t.isVariableDeclaration(nodeDecl)) {
    return handleVariableDeclaration(ast, decl, nodeDecl, filename, loader);
  }

  if (t.isFunctionDeclaration(nodeDecl) || t.isIdentifier(nodeDecl) || t.isExpression(nodeDecl)) {
    const funcName = isDefaultExport ? null : (nodeDecl as t.FunctionDeclaration).id?.name;

    if (namedReference) {
      return handleNamedReference(
        ast,
        decl,
        namedReference,
        funcName,
        filename,
        isDefaultExport,
        loader,
      );
    }

    return handleDirectExport(ast, decl, nodeDecl, funcName, filename, isDefaultExport, loader);
  }

  return false;
};

/**
 * Handles variable declarations
 * @param {Object} ast
 * @param {Object} decl - The main declaration
 * @param {Object} nodeDecl - The declaration node
 * @param {string} filename - The file name
 * @param {Object} loader - The loader to use
 * @returns {boolean} - True if changes were made, false otherwise
 */
const handleVariableDeclaration = (
  ast: t.File,
  decl: traverse.NodePath<t.ExportNamedDeclaration | t.ExportDefaultDeclaration>,
  nodeDecl: t.VariableDeclaration,
  filename: string,
  loader: LoaderContext<unknown>,
): boolean => {
  const { declarations } = nodeDecl;
  let modified = false;

  for (const declaration of declarations) {
    const { id, init } = declaration;

    if (t.isIdentifier(id) && init) {
      const result = wrapExportedValue(init, id.name, filename, false, loader);

      if (!result) continue;

      declaration.init = result.node;
      modified = true;

      if (result.imports[0].importDecl) {
        ast.program.body.unshift(result.imports[0].importDecl);
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
 * Handles named references in exports
 * @param {Object} ast
 * @param {Object} decl - The main declaration
 * @param {string} namedReference - The reference name
 * @param {string} funcName - The function name
 * @param {string} filename - The file name
 * @param {boolean} isDefaultExport - Whether this is a default export
 * @param {Object} loader - The loader to use
 * @returns {boolean} - True if changes were made, false otherwise
 */
const handleNamedReference = (
  ast: t.File,
  decl: traverse.NodePath<t.ExportNamedDeclaration | t.ExportDefaultDeclaration>,
  namedReference: string,
  funcName: string | null,
  filename: string,
  isDefaultExport: boolean,
  loader: LoaderContext<unknown>,
): boolean => {
  const binding = decl.scope.getBinding(namedReference);

  if (!binding) return false;

  if (binding.path.isVariableDeclarator()) {
    const result = wrapExportedValue(
      binding.path.node.init,
      funcName || '',
      filename,
      isDefaultExport,
      loader,
    );

    if (!result) return false;

    if (result.imports[0].importDecl) {
      ast.program.body.unshift(result.imports[0].importDecl);
    }

    binding.path.get('init').replaceWith(result.node);

    return true;
  }

  if (binding.path.isFunctionDeclaration()) {
    const result = wrapExportedValue(
      binding.path.node,
      funcName || '',
      filename,
      isDefaultExport,
      loader,
    );

    if (!result) return false;

    if (result.imports[0].importDecl) {
      ast.program.body.unshift(result.imports[0].importDecl);
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
 * Handles direct exports without named references
 * @param {Object} ast - The AST object
 * @param {Object} decl - The main declaration
 * @param {Object} nodeDecl - The declaration node
 * @param {string} funcName - The function name
 * @param {string} filename - The file name
 * @param {boolean} isDefaultExport - Whether this is a default export
 * @param {Object} loader - The loader to use
 * @returns {boolean} - True if changes were made, false otherwise
 */
const handleDirectExport = (
  ast: t.File,
  decl: traverse.NodePath<t.ExportNamedDeclaration | t.ExportDefaultDeclaration>,
  nodeDecl: t.Node,
  funcName: string | null,
  filename: string,
  isDefaultExport: boolean,
  loader: LoaderContext<unknown>,
): boolean => {
  const result = wrapExportedValue(nodeDecl, funcName || '', filename, isDefaultExport, loader);

  if (!result) return false;

  if (result.imports[0].importDecl) {
    ast.program.body.unshift(result.imports[0].importDecl);
  }

  if (isDefaultExport) {
    decl.replaceWith(t.exportDefaultDeclaration(result.node));
  } else {
    const id = (nodeDecl as t.FunctionDeclaration).id;

    if (id && t.isIdentifier(id)) {
      const varDecl = t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(id.name), result.node),
      ]);

      decl.replaceWith(t.exportNamedDeclaration(varDecl, []));
    }
  }

  decl.skip();

  return true;
};

/**
 * Main pluginizr function
 * This function is called by webpack for each module that needs transformation
 * @param {string} code - The source code to transform
 * @param {string} [sourcePath] - The source file path (for webpack loaders)
 * @param {Object} [loader] - The webpack loader context
 * @returns {string} The transformed code
 */
function pluginizr(code: string, sourcePath?: string, loader?: LoaderContext<unknown>): string {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  let isPluginized = false;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  traverse(ast, {
    ExportNamedDeclaration: (declPath) => {
      if (handleExport(ast, declPath, sourcePath || '', false, loader)) {
        isPluginized = true;
      }
    },
    ExportDefaultDeclaration: (declPath) => {
      if (handleExport(ast, declPath, sourcePath || '', true, loader)) {
        isPluginized = true;
      }
    },
  });

  if (!isPluginized) {
    return code;
  }

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

  const importSpecifiers: t.ImportSpecifier[] = [];

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

  return generate(ast, {}, code).code;
}

export default pluginizr;
