const fs = require('node:fs');
const pluginizr = require('./pluginizr');

global.console.log = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('./get-plugin-hash', () => ({
  getPluginHash: () => 'plugin_hash_test'
}));

jest.mock('./get-pluginized-components', () => ({
  getPluginizedComponents: () => ({
    'test-package/MyComponent': {
      hash: 'plugin_hash1',
      plugins: [
        {
          id: 'plugin-package/plugins/MyComponent',
          path: '/some/path/plugin-package/plugins/MyComponent.ts'
        },
      ]
    },
    'test-package/MyComponent:NamedComponent': {
      hash: 'plugin_hash2',
      plugins: [
        {
          id: 'plugin-package/plugins/MyNamedComponent',
          path: '/some/path/plugin-package/plugins/MyNamedComponent.ts'
        },
      ]
    },
    'test-package/myFunction': {
      hash: 'plugin_hash3',
      plugins: [{
        id: 'plugin-package/plugins/myFunction',
        path: '/some/path/plugin-package/plugins/myFunction.ts'
      }]
    },
    'test-package/myFunction:func1': {
      hash: 'plugin_hash3a',
      plugins: [{
        id: 'plugin-package/plugins/myFunction',
        path: '/some/path/plugin-package/plugins/myFunction.ts'
      }]
    },
    'test-package/myFunction:func2': {
      hash: 'plugin_hash3b',
      plugins: [{
        id: 'plugin-package/plugins/myFunction',
        path: '/some/path/plugin-package/plugins/myFunction.ts'
      }]
    },
    'test-package/myGenerator': {
      hash: 'plugin_hash4',
      plugins: [{
        id: 'plugin-package/plugins/myGenerator',
        path: '/some/path/plugin-package/plugins/myGenerator.ts'
      }]
    },
    'test-package/myValue': {
      hash: 'plugin_hash5',
      plugins: [{
        id: 'plugin-package/plugins/myValue',
        path: '/some/path/plugin-package/plugins/myValue.ts'
      }]
    }
  })
}));

jest.mock('./is-build', () => () => false);

describe('pluginizr', () => {
  const mockLoader = {
    addDependency: jest.fn(),
    addMissingDependency: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((file) => {
      if (file.includes('package.json')) {
        return JSON.stringify({ name: 'test-package' });
      }
      if (file.includes('tsconfig.json')) {
        return JSON.stringify({ compilerOptions: { baseUrl: '.' } });
      }
      return '';
    });
  });

  describe('Type Declarations', () => {
    test('should not pluginize interfaces', () => {
      const sampleCode = `
        export interface MyInterface {
          name: string;
        }
      `;

      const result = pluginizr(sampleCode, '/some/file.ts', mockLoader);
      expect(result).toEqual(sampleCode);
    });

    test('should not pluginize type aliases', () => {
      const sampleCode = `
        export type MyType = {
          name: string;
        };
      `;

      const result = pluginizr(sampleCode, '/some/file.ts', mockLoader);
      expect(result).toEqual(sampleCode);
    });
  });

  describe('dependencyManager', () => {
    test('should add dependency to loader', () => {
      const sampleCode = `
        const someFunction = () => 'Hello World';
        export default someFunction;
      `;

      pluginizr(sampleCode, '/test-package/myFunction.ts', mockLoader);

      expect(mockLoader.addDependency).toHaveBeenCalled();
      expect(mockLoader.addDependency.mock.calls[0][0]).toContain('plugin_hash_test');
    });

    test('should add missing dependency to loader', () => {
      const sampleCode = `
        const someFunction = () => 'Hello World';
        export default someFunction;
      `;

      pluginizr(sampleCode, '/test-package/myFunction.ts', mockLoader);

      expect(mockLoader.addMissingDependency).toHaveBeenCalled();
      expect(mockLoader.addMissingDependency.mock.calls[0][0]).toContain('plugin_hash_test');
    });
  });

  describe('withComponentPlugins', () => {
    test('should wrap React component with withComponentPlugins', () => {
      const sampleCode = `
        const MyComponent = () => {
          return <div>Hello World</div>;
        }
        export default MyComponent;
      `;

      const result = pluginizr(sampleCode, '/some/MyComponent.tsx', mockLoader);

      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash1 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash1"');
      expect(result).toContain(
          "const MyComponent = withComponentPlugins(plugin_hash1, () => {\n" +
          "  return <div>Hello World</div>;\n" +
          "});");
    });

    test('should handle named export of React component', () => {
      const sampleCode = `
        export const NamedComponent = () => {
          return <div>Hello World</div>;
        }
      `;

      const result = pluginizr(sampleCode, '/some/MyComponent.tsx', mockLoader);

      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash2 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash2"');
      expect(result).toContain(
          "export const NamedComponent = withComponentPlugins(plugin_hash2, () => {\n" +
          "  return <div>Hello World</div>;\n" +
          "});");
    });

    test('should handle React component with JSX fragment', () => {
      const sampleCode = `
        const MyComponent = () => {
          return <>Hello World</>;
        }
        export default MyComponent;
      `;

      const result = pluginizr(sampleCode, '/some/MyComponent.tsx', mockLoader);
      expect(result).toContain('withComponentPlugins');
    });

    test('should handle React component with nested JSX in return', () => {
      const sampleCode = `
        const MyComponent = () => {
          const content = () => {
            return <div>Nested</div>;
          };
          return content();
        }
        export default MyComponent;
      `;

      const result = pluginizr(sampleCode, '/some/MyComponent.tsx', mockLoader);
      expect(result).toContain('withComponentPlugins');
    });
  });

  describe('withFunctionPlugins', () => {
    test('should handle async functions', () => {
      const sampleCode = `
        async function myFunction() {
          return await Promise.resolve('Hello World');
        }
        export default myFunction;
      `;

      const result = pluginizr(sampleCode, '/some/myFunction.ts', mockLoader);
      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash3 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash3"');
      expect(result).toContain(
          'const myFunction = withFunctionPlugins(plugin_hash3, async function () {\n' +
          '  return await Promise.resolve(\'Hello World\');\n' +
          '});');
    });

    test('should handle generator functions', () => {
      const sampleCode = `
        function* myGenerator() {
          yield 'Hello World';
        }
        export default myGenerator;
      `;

      const result = pluginizr(sampleCode, '/some/myGenerator.ts', mockLoader);
      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash4 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash4"');
      expect(result).toContain(
          'const myGenerator = withFunctionPlugins(plugin_hash4, function* () {\n' +
          '  yield \'Hello World\';\n' +
          '});');
    });

    test('should wrap arrow function with withFunctionPlugins', () => {
      const sampleCode = `
        const myFunction = () => {
          return 'Hello World';
        }
        export default myFunction;
      `;

      const result = pluginizr(sampleCode, '/some/myFunction.ts', mockLoader);

      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash3 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash3"');
      expect(result).toContain(
          'const myFunction = withFunctionPlugins(plugin_hash3, () => {\n' +
          '  return \'Hello World\';\n' +
          '});');
    });

    test('should handle function declaration', () => {
      const sampleCode = `
        function myFunction() {
          return 'Hello World';
        }
        export default myFunction;
      `;

      const result = pluginizr(sampleCode, '/some/myFunction.ts', mockLoader);

      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash3 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash3"');
      expect(result).toContain(
          'const myFunction = withFunctionPlugins(plugin_hash3, function () {\n' +
          '  return \'Hello World\';\n' +
          '});');
    });

    test('should handle arrow function with implicit return', () => {
      const sampleCode = `
        const myFunction = () => 42;
        export default myFunction;
      `;

      const result = pluginizr(sampleCode, '/some/myFunction.ts', mockLoader);
      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash3 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash3"');
      expect(result).toContain(
          'const myFunction = withFunctionPlugins(plugin_hash3, () => {\n' +
          '  return 42;\n' +
          '});');
    });

    test('should handle named exports of multiple functions', () => {
      const sampleCode = `
        export const func1 = () => 'Hello';
        export const func2 = () => { return 'World'; };
      `;

      const result = pluginizr(sampleCode, '/some/myFunction.ts', mockLoader);
      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash3a from "@thebigrick/catalyst-pluginizr/generated/plugin_hash3a"');
      expect(result).toContain('import plugin_hash3b from "@thebigrick/catalyst-pluginizr/generated/plugin_hash3b"');
      expect(result).toContain(
          'export const func1 = withFunctionPlugins(plugin_hash3a, () => {\n' +
          '  return \'Hello\';\n' +
          '});');
      expect(result).toContain(
          'export const func2 = withFunctionPlugins(plugin_hash3b, () => {\n' +
          '  return \'World\';\n' +
          '});');
    });
  });

  describe('withValuePlugins', () => {
    test('should wrap non-function values with withValuePlugins', () => {
      const sampleCode = `
        const config = {
          key: 'value'
        };
        export default config;
      `;

      const result = pluginizr(sampleCode, '/some/myValue.ts', mockLoader);

      expect(result).toContain('import { withComponentPlugins, withFunctionPlugins, withValuePlugins } from "@thebigrick/catalyst-pluginizr"');
      expect(result).toContain('import plugin_hash5 from "@thebigrick/catalyst-pluginizr/generated/plugin_hash5"');
      expect(result).toContain(
          'const config = withValuePlugins(plugin_hash5, {\n' +
          '  key: \'value\'\n' +
          '});');
    });
  });

  describe('Component Code Generation', () => {
    test('should generate correct component code path', () => {
      const sampleCode = `
        const MyComponent = () => <div>Test</div>;
        export default MyComponent;
      `;

      pluginizr(sampleCode, '/some/MyComponent.tsx', mockLoader);

      expect(console.log).toHaveBeenCalledWith(
          '   Applying plugins to:',
          expect.stringContaining('test-package/')
      );
    });
  });

  describe('Error Handling', () => {
    test('should throw error when package.json is not found', () => {
      fs.existsSync.mockReturnValue(false);

      const sampleCode = `
        const MyComponent = () => <div>Test</div>;
        export default MyComponent;
      `;

      expect(() => {
        pluginizr(sampleCode, '/some/MyComponent.tsx', mockLoader);
      }).toThrow('No package.json was found');
    });
  });
});
