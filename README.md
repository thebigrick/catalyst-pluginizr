# Catalyst Pluginizr (by The BigRick)

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
        - [Automatic Installation](#automatic-installation)
        - [Manual Installation](#manual-installation)
- [Plugin Development Guide](#plugin-development-guide)
    - [Basic Concepts](#basic-concepts)
    - [Plugin Types](#plugin-types)
    - [Creating Your First Plugin](#creating-your-first-plugin)
    - [Plugin Execution Order](#plugin-execution-order)
    - [Extending nextjs config](#extending-nextjs-config)
    - [Naming Conventions and Best Practices](#naming-conventions-and-best-practices)
- [Examples](#examples)
    - [Function Plugin](#function-plugin)
    - [Component Plugin](#component-plugin)
    - [Value Plugin](#value-plugin)
- [Contributing](#contributing)
- [License](#license)

## Introduction

**@thebigrick/catalyst-pluginizr** is a drop-in pluginization system designed specifically
for [Catalyst (BigCommerce)](https://www.catalyst.dev/). It enables developers to enhance, override, or augment
functionality at multiple integration points within a Catalyst-based application without modifying core code.

With this tool, you can:

- **Extend UI Components:** Wrap existing React components with additional markup, styling, or logic
- **Enrich Server Actions:** Intercept and modify server actions and other functions
- **Integrate Third-Party Logic:** Inject external business rules, analytics, or A/B testing

> **BETA Notice**: This package is currently in beta. While stable and functional, it may undergo changes before the
> final release.

## Quick Start

### Prerequisites

Just a Catalyst-based project (see [Catalyst on Github](https://github.com/bigcommerce/catalyst/)).

### Installation

You can install Catalyst Pluginizr either automatically using our installation script or manually following step-by-step
instructions.

#### Automatic Installation

1. Clone the package in your `packages` folder as submodule:

   ```bash
   cd /path-to-catalyst
   git submodule add https://github.com/thebigrick/catalyst-pluginizr.git packages/catalyst-pluginizr
   pnpm i
   ```

2. Run the installation script:

   ```bash
   cd /path-to-catalyst/packages/catalyst-pluginizr
   npm run setup
   ```

The script will automatically:

- Add the necessary dependencies
- Configure your workspace
- Update Next.js and Tailwind configurations
- Install all dependencies

#### Manual Installation

If you prefer to install manually or need more control over the installation process, follow these steps:

1. Clone the package in your `package` folder:

   ```bash
   cd /path-to-catalyst/packages
   git clone https://github.com/thebigrick/catalyst-pluginizr.git
   ```

2. Add the pluginizr dependency in `core/package.json` file:

   ```json
   {
     "dependencies": {
       "@thebigrick/catalyst-pluginizr": "workspace:*"
     }
   }
   ```

3. Add a new workspace for plugins in `pnpm-workspace.yaml` file in your root folder:

   ```yaml
   packages:
     - core
     - packages/*
     - plugins/* # <-- Add this line
   ```

4. Configure Next.js to use the pluginizr in `core/next.config.ts`:

   ```typescript
   // Add this line at beginning
   import withCatalystPluginizr from '@thebigrick/catalyst-pluginizr/with-catalyst-pluginizr';
   
   // ... (leave the content as is)
   
   nextConfig = withNextIntl(nextConfig);
   nextConfig = withCatalystPluginizr(nextConfig); // <-- Add this line after withNextIntl
   
   // ... (leave the content as is)
   ```

5. Configure tailwind to use pluginizr in `core/tailwind.config.js` (**only legacy versions of Catalyst**):

   ```javascript
   // Add the following line at the beginning of the file
   const withTailwindPluginizr = require('@thebigrick/catalyst-pluginizr/with-tailwind-pluginizr');
   
   // ... (leave the main content as is)
   
   // Replace the default module.exports line at the end with the following:
   module.exports = withTailwindPluginizr(config);
   ```

6. Install dependencies:

   ```bash
   cd /path-to-catalyst
   pnpm install
   ```

## Plugin Development Guide

### Basic Concepts

Catalyst Pluginizr allows you to enhance your application in three main ways:

1. **Component Enhancement**:
    - Wrap React components with additional functionality
    - Add UI elements without modifying original components
    - Modify component behavior consistently across your application

2. **Function Modification**:
    - Intercept and modify function calls
    - Add pre- and post-processing logic
    - Transform input and output data

3. **Value Transformation**:
    - Transform static values and configuration
    - Modify application constants
    - Override default settings

### Plugin Types

1. **Component Plugins** (using `componentPlugin`):
    - Wrap React components with custom logic
    - Add UI elements (headers, footers, wrappers)
    - Modify component props or behavior
    - Access to the original component through `WrappedComponent`

2. **Function Plugins** (using `functionPlugin`):
    - Modify function inputs and outputs
    - Add logging, analytics, or monitoring
    - Transform data before or after function execution
    - Access to original function and all its arguments

3. **Value Plugins** (using `valuePlugin`):
    - Transform configuration values
    - Modify constants and defaults
    - Chain multiple transformations
    - Access to original value

### Creating Your First Plugin

1. **Set up the plugin structure:**

   ```bash
   cd /path-to-catalyst
   mkdir -p plugins/my-first-plugin
   cd plugins/my-first-plugin
   ```

2. **Create basic configuration files:**

   Sample `package.json` (adapt as needed):

   ```json
   {
     "name": "my-first-plugin",
     "version": "1.0.0",
     "dependencies": {
       "@thebigrick/catalyst-pluginizr": "workspace:*",
       "@bigcommerce/catalyst-core": "workspace:*",
       "react": "^18.3.1"
     },
     "devDependencies": {
       "@types/node": "^20.17.6",
       "@types/react": "^18.3.12",
       "typescript": "^5.6.3"
     }
   }
   ```

   Sample `tsconfig.json` (you will likely need to adjust this):

   ```json
   {
     "$schema": "https://json.schemastore.org/tsconfig",
     "display": "Default",
     "compilerOptions": {
       "baseUrl": "src",
       "composite": false,
       "declaration": true,
       "declarationMap": true,
       "esModuleInterop": true,
       "forceConsistentCasingInFileNames": true,
       "inlineSources": false,
       "incremental": true,
       "isolatedModules": true,
       "moduleResolution": "node",
       "noUnusedLocals": false,
       "noUnusedParameters": false,
       "preserveWatchOutput": true,
       "skipLibCheck": true,
       "strict": true,
       "tsBuildInfoFile": "node_modules/.cache/tsbuildinfo.json",
       "resolveJsonModule": true,
       "jsx": "react"
     },
     "exclude": [
       "node_modules"
     ]
   }
   ```

3. **Create your plugin:**

   Each plugin should be in a separate file within the `plugins` directory at your package's baseUrl. The file must export a default value created using one of the plugin helper functions.

   Example structure:
   ```
   my-first-plugin/
   ├── src/
   │   └── plugins/
   │       ├── header-wrapper.tsx
   │       ├── search-logger.ts
   │       └── product-card-modifier.ts
   ```

   Example of a component plugin (`header-wrapper.tsx`):
   ```typescript
   import React from "react";
   import { componentPlugin } from "@thebigrick/catalyst-pluginizr";
   import { Header } from "@bigcommerce/catalyst-core/components/header";
   
   export default componentPlugin<typeof Header>({
     name: "header-wrapper",
     resourceId: "@bigcommerce/catalyst-core/components/header:Header",
     wrap: ({ WrappedComponent, ...props }) => (
       <div className="w-full">
         <div className="font-bold text-center">Special Offer Today!</div>
         <WrappedComponent {...props} />
       </div>
     ),
   });
   ```

### Plugin Execution Order

Plugins execute based on their `sortOrder` value:

- Lower values run first (e.g., -10 before 0)
- Default value is 0
- Same values <u>have no guaranteed order</u>

Example of multiple plugins with order:

```typescript
// First plugin (runs first)
export default componentPlugin({
  name: "header-promo",
  sortOrder: -10,
  // ...
});

// In another file
export default componentPlugin({
  name: "header-analytics",
  sortOrder: 0,
  // ...
});

// In yet another file
export default componentPlugin({
  name: "header-customization",
  sortOrder: 10,
  // ...
});
```

### Extending nextjs config

If you need to extend the Next.js configuration from a plugin, you can create a `next.wrapper.cjs` file in your plugin directory with the following example content:

```javascript
// plugins/my-first-plugin/next.wrapper.cjs

const configWrapper = (nextConfig) => {
   return {
      ...nextConfig,
      // Add your custom configuration here
   };
};

module.exports = configWrapper;
```

### Naming Conventions and Best Practices

Follow these conventions for plugin identification:

1. **Plugin Names:**
    - Use descriptive, kebab-case names
    - Include purpose in name (e.g., "header-promo-banner")
    - Keep names unique within your plugin

2. **Resource IDs:**
    - Format: `@packageName/path` or `@packageName/path:exportName`
    - Example:
        - For named exports `@bigcommerce/catalyst-core/components/header:Header`
        - For default exports `@bigcommerce/catalyst-core/components/header/cart-icon`

3. **File Structure:**
    - Keep each plugin in a separate file within the `plugins` directory
    - Use consistent naming for plugin files
    - Group plugins logically in subdirectories if needed

## Examples

### Function Plugin

With function plugins, you can intercept and modify function calls.

Example of a search term logger (`search-term-logger.ts`):

```typescript
import { functionPlugin } from "@thebigrick/catalyst-pluginizr";
import { getSearchResults } from "@bigcommerce/catalyst-core/components/header/_actions/get-search-results";

export default functionPlugin<typeof getSearchResults>({
  name: "search-term-logger",
  resourceId: "@bigcommerce/catalyst-core/components/header/_actions/get-search-results:getSearchResults",
  sortOrder: -10,
  wrap: (fn, searchTerm) => {
    console.log(`Search term: ${searchTerm}`);
    return fn(searchTerm);
  },
});
```

### Component Plugin

With component plugins, you can wrap React components with custom logic.

Example of a header analytics plugin (`header-analytics.tsx`):

```typescript
import React from "react";
import { componentPlugin } from "@thebigrick/catalyst-pluginizr";
import { Header } from "@bigcommerce/catalyst-core/components/header";

export default componentPlugin<typeof Header>({
  name: "header-analytics",
  resourceId: "@bigcommerce/catalyst-core/components/header:Header",
  wrap: ({ WrappedComponent, ...props }) => {
    return (
      <TrackedComponent>
        <WrappedComponent {...props} />
      </TrackedComponent>
    );
  },
});
```

### Value Plugin

With value plugins, you can transform static values and configuration.

Example of adding SKU to product card fragment (`product-card-sku.ts`):

```typescript
import { valuePlugin } from "@thebigrick/catalyst-pluginizr";
import { PricingFragment } from '@bigcommerce/catalyst-core/client/fragments/pricing';
import { ProductCardFragment } from "@bigcommerce/catalyst-core/components/product-card/fragment";
import { graphql } from '@bigcommerce/catalyst-core/client/graphql';
import { AddToCartFragment } from '@bigcommerce/catalyst-core/components/product-card/add-to-cart/fragment';

export default valuePlugin<typeof ProductCardFragment>({
  name: "add-product-sku",
  resourceId: "@bigcommerce/catalyst-core/components/product-card/fragment:ProductCardFragment",
  wrap: (value) => {
    return graphql(
      `
        fragment ProductCardFragment on Product {
         entityId
         sku # <-- Added SKU field
         name
         defaultImage {
           altText
           url: urlTemplate(lossy: true)
         }
         path
         brand {
           name
           path
         }
         reviewSummary {
           numberOfReviews
           averageRating
         }
         ...AddToCartFragment
         ...PricingFragment
       }
     `,
      [AddToCartFragment, PricingFragment],
    );
  },
});
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

For bugs or feature requests:

- Open an issue on GitHub
- Provide detailed reproduction steps
- Include relevant code examples

## License

This project is licensed under the MIT License. See the `LICENSE.md` file for details.

Copyright (c) 2024 The BigRick
