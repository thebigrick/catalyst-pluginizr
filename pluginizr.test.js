const fs = require('node:fs');

const pluginizr = require('./pluginizr');

global.console.error = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('pluginizr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup common fs mocks
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((file) => {
      if (file.includes('package.json')) {
        return JSON.stringify({ name: 'test-package' });
      }

      if (file.includes('tsconfig.json')) {
        return JSON.stringify({ compilerOptions: { baseUrl: 'src' } });
      }

      return '';
    });
  });

  describe('should add withPluginsFn', () => {
    test('with: arrow function', () => {
      const sampleCode = `
      const myFunction = () => {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/../file", () => {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: function declaration', () => {
      const sampleCode = `
      function myFunction() {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/../file", function () {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: referenced function declaration', () => {
      const sampleCode = `
      const myFunction = function () {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/../file", function () {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: anonymous arrow function declaration', () => {
      const sampleCode = `     
      export default () => {
        console.log('Hello World');
      }
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export default withPluginsFn("test-package/../file", () => {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: anonymous function declaration', () => {
      const sampleCode = `     
      export default function() {
        console.log('Hello World');
      }`;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export default withPluginsFn("test-package/../file", function () {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: non-function-value', () => {
      const sampleCode = `     
      const a = 5;
      export default a;`;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const a = withPluginsFn("test-package/../file", 5);
export default a;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: anonymous non-function-value', () => {
      const sampleCode = `     
      export default 5;`;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export default withPluginsFn("test-package/../file", 5);`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: function and parameters', () => {
      const sampleCode = `
      function myFunction(param1: string, param2: number) {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/../file", function (param1: string, param2: number) {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: arrow function and parameters', () => {
      const sampleCode = `
      const myFunction = (param1: string, param2: number) => {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/../file", (param1: string, param2: number) => {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: named export on arrow function ', () => {
      const sampleCode = `
      export const myFunction = () => {
        console.log('Hello World');
      }
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export const myFunction = withPluginsFn("test-package/../file:myFunction", () => {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: named export on function ', () => {
      const sampleCode = `
      export function myFunction() {
        console.log('Hello World');
      }
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export const myFunction = withPluginsFn("test-package/../file:myFunction", function () {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: default export on anonymous value', () => {
      const sampleCode = `
        export default 5;
      `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export default withPluginsFn("test-package/../file", 5);`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });
  });

  describe('should add withPluginsFc', () => {
    test('with: arrow function', () => {
      const sampleCode = `
      const myComponent = () => {
        return <div>Hello World</div>;
      }
      
      export default myComponent;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const myComponent = withPluginsFC("test-package/../file", () => {
  return <div>Hello World</div>;
});
export default myComponent;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('with: function', () => {
      const sampleCode = `
      function myComponent () {
        return <div>Hello World</div>;
      }
      
      export default myComponent;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
const myComponent = withPluginsFC("test-package/../file", function () {
  return <div>Hello World</div>;
});
export default myComponent;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });
  });

  describe('should not pluginize', () => {
    test('interfaces', () => {
      const sampleCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export interface MyInterface {
  name: string;
}`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(sampleCode);
    });

    test('type aliases', () => {
      const sampleCode = `import { withPluginsFC, withPluginsFn } from "@thebigrick/catalyst-pluginizr";
export type MyType = {
  name: string;
};`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(sampleCode);
    });
  });
});
