# Catalyst Pluginizr (by The BigRick)

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Installation Steps](#installation-steps)
- [Plugin Development Guide](#plugin-development-guide)
    - [Basic Concepts](#basic-concepts)
    - [Plugin Types](#plugin-types)
    - [Creating Your First Plugin](#creating-your-first-plugin)
    - [Plugin Execution Order](#plugin-execution-order)
    - [Naming Conventions](#naming-conventions)
- [Examples](#examples)
    - [Function Plugin](#function-plugin)
    - [Component Plugin](#component-plugin)
    - [Non-Function Values Plugin](#non-function-values-plugin)
- [Technical Details](#technical-details)
    - [Architecture Overview](#architecture-overview)
    - [Build Time Optimization](#build-time-optimization)
    - [Plugin Registration](#plugin-registration)
    - [Runtime Architecture](#runtime-architecture)
- [Additional Notes](#additional-notes)
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

### Installation Steps

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
   import { withCatalystPluginizr } from '@thebigrick/catalyst-pluginizr'; // <-- Add this line at beginning
   //...
   nextConfig = withNextIntl(nextConfig);
   nextConfig = withCatalystPluginizr(nextConfig); // <-- Add this line after withNextIntl
   //...
   ```

5. Configure tailwind to use pluginizr in `core/tailwind.config.js`:

   ```javascript
   // Add the following line at the beginning of the file
   const withPluginizrTailwind = require('@thebigrick/catalyst-pluginizr/pluginizr/with-pluginizr-tailwind');
   
   // ... (leave the main content as is)
   
   // Replace the default module.exports line at the end with the following:
   module.exports = withPluginizrTailwind(config);
   ```

6. Install dependencies:

   ```bash
   cd /path-to-catalyst
   pnpm install
   ```

6. Get fun!

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

1. **Component Plugins** (will use `registerComponentPlugin`):
    - Wrap React components with custom logic
    - Add UI elements (headers, footers, wrappers)
    - Modify component props or behavior
    - Access to the original component through `WrappedComponent`

2. **Function Plugins** (will use `registerFunctionPlugin`):
    - Modify function inputs and outputs
    - Add logging, analytics, or monitoring
    - Transform data before or after function execution
    - Access to original function and all its arguments

3. **Value Plugins** (will use `registerValuePlugin`):
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

2. **Create basic configuration files for a typescript project:**

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

3. **Implement your first plugin:**

   In this example, we'll create a simple header wrapper plugin that adds a promo banner above the header.

   > While wrapping a component, you can access the original component through the `WrappedComponent` prop.

   ```typescript jsx
   // src/plugins/header-wrapper.tsx
   import { ComponentPlugin } from "@thebigrick/catalyst-pluginizr";
   import { Header } from "@bigcommerce/catalyst-core/components/header";
   
   export const headerWrapper: ComponentPlugin<typeof Header> = {
       name: "header-wrapper",
       resourceId: "@bigcommerce/catalyst-core/components/header:Header",
       wrap: ({ WrappedComponent, ...props }) => (
         <div className="w-full">
           <div className="font-bold text-center">Special Offer Today!</div>
           <WrappedComponent {...props} />
         </div>
       ),
     }
   ;
   ```

4. **Register your plugin in `src/register-plugins.ts`:**

   > Please note that you need to register your plugin in the `register-plugins.ts` file to make it available at
   runtime.

   ```typescript
   import { registerComponentPlugin } from "@thebigrick/catalyst-pluginizr";
   import { headerWrapper } from "./plugins/header-wrapper";
   
   registerComponentPlugin(headerWrapper);
   ```

### Plugin Execution Order

Plugins execute based on their `sortOrder` value:

- Lower values run first (e.g., -10 before 0)
- Default value is 0
- Same values <u>have no guaranteed order</u>

Example of multiple plugins with order:

```typescript
// First plugin (runs first)
registerComponentPlugin({
  name: "header-promo",
  sortOrder: -10,
  // ...
});

// Second plugin
registerComponentPlugin({
  name: "header-analytics",
  sortOrder: 0,
  // ...
});

// Third plugin (runs last)
registerComponentPlugin({
  name: "header-customization",
  sortOrder: 10,
  // ...
});
```

### Naming Conventions and best practices

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
    - Keep related plugins in dedicated files
    - Use consistent naming for plugin files
    - Group plugins logically in directories

## Examples

### Function Plugin

With function plugins, you can intercept and modify function calls.<br />

> While wrapping a function, you can access the original function and its arguments.<br />
> By not calling the original function, you can prevent its execution.<br />
>
> **Please note that function plugin use `registerFunctionPlugin`.**

Here's an example of a search term logger and modifier:

```typescript
import { registerFunctionPlugin } from "@thebigrick/catalyst-pluginizr";
import { getSearchResults } from "@bigcommerce/catalyst-core/components/header/_actions/get-search-results";

// Logging plugin
registerFunctionPlugin<typeof getSearchResults>({
  name: "search-term-logger",
  resourceId: "@bigcommerce/catalyst-core/components/header/_actions/get-search-results:getSearchResults",
  sortOrder: -10,
  wrap: (fn, searchTerm) => {
    console.log(`Search term: ${searchTerm}`);
    return fn(searchTerm);
  },
});

// Search term modifier
registerFunctionPlugin<typeof getSearchResults>({
  name: "search-term-modifier",
  resourceId: "@bigcommerce/catalyst-core/components/header/_actions/get-search-results:getSearchResults",
  sortOrder: 0,
  wrap: (fn, searchTerm) => {
    if (searchTerm === "test") {
      return fn("Product Test");
    }
    return fn(searchTerm);
  },
});
```

### Component Plugin

With component plugins, you can wrap React components with custom logic.<br />

> While wrapping a component, you can access the original component through the `WrappedComponent` prop.<br />
> By not calling the original component, you can prevent its rendering.<br />
>
> **Please note that function plugin use `registerComponentPlugin`.**

Here's an example of a header wrapper and analytics plugin:

```typescript jsx
// plugins/header-wrapper.tsx
import { ComponentPlugin } from "@thebigrick/catalyst-pluginizr";
import React from "react";
import { Header } from "@bigcommerce/catalyst-core/components/header";

// plugins/header-analytics.tsx
const headerAnalyticsPlugin: ComponentPlugin<typeof Header> = {
  name: "header-analytics",
  resourceId: "@bigcommerce/catalyst-core/components/header:Header",
  sortOrder: 0,
  wrap: ({ WrappedComponent, ...props }) => {
    return (
      <TrackedComponent>
        <WrappedComponent {...props} />
      </TrackedComponent>
    );
  },
};

export default headerAnalyticsPlugin;
```

```typescript
// register-plugins.ts
import { registerComponentPlugin } from "@thebigrick/catalyst-pluginizr";
import headerAnalyticsPlugin from "./plugins/header-analytics";

registerComponentPlugin(headerAnalyticsPlugin);
```

### Non-Function Values Plugin

With value plugins, you can transform static values and configuration.<br />

> While wrapping a value, you can access the original value as parameter of `wrap` function.<br />
>
> **Please note that value plugins use `registerValuePlugin`.**

Here's an example of a currency plugin that adds the SKU to the product card fragment:

```typescript
import { registerValuePlugin } from "@thebigrick/catalyst-pluginizr";
import { PricingFragment } from '@bigcommerce/catalyst-core/client/fragments/pricing';
import { ProductCardFragment } from "@bigcommerce/catalyst-core/components/product-card/fragment";
import { graphql } from '@bigcommerce/catalyst-core/client/graphql';
import { AddToCartFragment } from '@bigcommerce/catalyst-core/components/product-card/add-to-cart/fragment';

// Query modifier with SKU
registerValuePlugin<typeof ProductCardFragment>({
  name: "add-product-sku",
  resourceId: "@bigcommerce/catalyst-core/components/product-card/fragment:ProductCardFragment",
  sortOrder: 0,
  wrap: (value) => {
    console.log('My old fragment was:', value);

    return graphql(
      `
        fragment ProductCardFragment on Product {
         entityId
         sku # <-- This was missing in the original query
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
