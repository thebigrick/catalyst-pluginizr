const fs = require('node:fs');

const pluginizr = require('./pluginizr');

global.console.error = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock getPluginizedComponents to return only myPluginizedFunction
jest.mock('./get-pluginized-components', () => () => ['test-package/file:myPluginizedFunction']);

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
        return JSON.stringify({ compilerOptions: { baseUrl: '.' } });
      }

      return '';
    });
  });

  describe('withPluginsFn', () => {
    test('should pluginize arrow function', () => {
      const sampleCode = `
      const myFunction = () => {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/file", () => {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize function declaration', () => {
      const sampleCode = `
      function myFunction() {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/file", function () {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize referenced function declaration', () => {
      const sampleCode = `
      const myFunction = function () {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/file", function () {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize anonymous arrow function declaration', () => {
      const sampleCode = `     
      export default () => {
        console.log('Hello World');
      }
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export default withPluginsFn("test-package/file", () => {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize anonymous function declaration', () => {
      const sampleCode = `     
      export default function() {
        console.log('Hello World');
      }`;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export default withPluginsFn("test-package/file", function () {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize function and parameters', () => {
      const sampleCode = `
      function myFunction(param1: string, param2: number) {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/file", function (param1: string, param2: number) {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize arrow function and parameters', () => {
      const sampleCode = `
      const myFunction = (param1: string, param2: number) => {
        console.log('Hello World');
      }
      
      export default myFunction;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myFunction = withPluginsFn("test-package/file", (param1: string, param2: number) => {
  console.log('Hello World');
});
export default myFunction;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize named export on arrow function ', () => {
      const sampleCode = `
      export const myFunction = () => {
        console.log('Hello World');
      }
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export const myFunction = withPluginsFn("test-package/file:myFunction", () => {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize named export on function ', () => {
      const sampleCode = `
      export function myFunction() {
        console.log('Hello World');
      }
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export const myFunction = withPluginsFn("test-package/file:myFunction", function () {
  console.log('Hello World');
});`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });
  });

  describe('withPluginsFc', () => {
    test('should pluginize arrow function', () => {
      const sampleCode = `
      const myComponent = () => {
        return <div>Hello World</div>;
      }
      
      export default myComponent;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myComponent = withPluginsFC("test-package/file", () => {
  return <div>Hello World</div>;
});
export default myComponent;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize function', () => {
      const sampleCode = `
      function myComponent () {
        return <div>Hello World</div>;
      }
      
      export default myComponent;
    `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myComponent = withPluginsFC("test-package/file", function () {
  return <div>Hello World</div>;
});
export default myComponent;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });
  });

  describe('withPluginsVal', () => {
    test('should pluginize non-function-value', () => {
      const sampleCode = `     
      const a = 5;
      export default a;`;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const a = withPluginsVal("test-package/file", 5);
export default a;`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize anonymous non-function-value', () => {
      const sampleCode = `     
      export default 5;`;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export default withPluginsVal("test-package/file", 5);`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });

    test('should pluginize default export on anonymous value', () => {
      const sampleCode = `
        export default 5;
      `;

      const expectedCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export default withPluginsVal("test-package/file", 5);`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(expectedCode);
    });
  });

  describe('production mode', () => {
    test('should not pluginize unnecessary items', () => {
      const sampleCode = `const myNonPluginizedFunction = () => {
        console.log('Hello World');
      }
      
      export const myPluginizedFunction = () => {
        console.log('Hello World');
      }
      
      export default myNonPluginizedFunction;
    `;

      // Fake build mode
      const prevNodeEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';

      const res = pluginizr(sampleCode, '/some/file.ts', true);

      process.env.NODE_ENV = prevNodeEnv;

      expect(res)
        .toEqual(`import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
const myNonPluginizedFunction = () => {
  console.log('Hello World');
};
export const myPluginizedFunction = withPluginsFn("test-package/file:myPluginizedFunction", () => {
  console.log('Hello World');
});
export default myNonPluginizedFunction;`);
    });
  });

  describe('should not pluginize', () => {
    test('interfaces', () => {
      const sampleCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export interface MyInterface {
  name: string;
}`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(sampleCode);
    });

    test('type aliases', () => {
      const sampleCode = `import { withPluginsFC, withPluginsFn, withPluginsVal } from "@thebigrick/catalyst-pluginizr";
export type MyType = {
  name: string;
};`;

      const res = pluginizr(sampleCode, '/some/file.ts');

      expect(res).toEqual(sampleCode);
    });
  });
});
