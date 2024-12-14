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

- A Catalyst-based project
- Node.js and pnpm installed
- Access to your project's `packages` directory

### Installation Steps

1. **Clone the package:**

```bash
cd /path-to-catalyst/packages
git clone https://github.com/thebigrick/catalyst-pluginizr.git
```

2. **Update your core dependencies:**

```json
{
  "dependencies": {
    "@thebigrick/catalyst-pluginizr": "workspace:^"
  }
}
```

3. **Enable plugins in workspace:**

```yaml
# pnpm-workspace.yaml
packages:
  - core
  - packages/*
  - plugins/*
```

4. **Configure Next.js:**

```typescript
// core/next.config.ts
import { withCatalystPluginizr } from '@thebigrick/catalyst-pluginizr';

// Add after withNextIntl
nextConfig = withNextIntl(nextConfig);
nextConfig = withCatalystPluginizr(nextConfig);
```

5. **Install dependencies:**

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

1. **Component Plugins** (`registerFcPlugin`):
    - Wrap React components with custom logic
    - Add UI elements (headers, footers, wrappers)
    - Modify component props or behavior
    - Access to the original component through `WrappedComponent`

2. **Function Plugins** (`registerFnPlugin`):
    - Modify function inputs and outputs
    - Add logging, analytics, or monitoring
    - Transform data before or after function execution
    - Access to original function and all its arguments

3. **Value Plugins** (`registerFnPlugin`):
    - Transform configuration values
    - Modify constants and defaults
    - Chain multiple transformations
    - Access to original value

### Creating Your First Plugin

1. **Set up the plugin structure:**

```bash
mkdir -p plugins/my-first-plugin/src/plugins
cd plugins/my-first-plugin
```

2. **Create configuration files:**

```json
// package.json
{
  "name": "my-first-plugin",
  "version": "1.0.0",
  "dependencies": {
    "@bigcommerce/catalyst-core": "workspace:*",
    "@thebigrick/catalyst-pluginizr": "workspace:*"
  }
}
```

```json
// tsconfig.json
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

```typescript jsx
// src/plugins/header-wrapper.tsx
import { PluginFC } from "@thebigrick/catalyst-pluginizr";
import { Header } from "@bigcommerce/catalyst-core/components/header";

export const headerWrapper: PluginFC<typeof Header> = {
    name: "header-wrapper",
    component: "@bigcommerce/catalyst-core/components/header:Header",
    wrap: ({ WrappedComponent, ...props }) => (
      <div className="my-wrapper">
        <div className="announcement"> Special Offer Today!</div>
        <WrappedComponent {...props} />
      </div>
    ),
  }
;
```

4. **Register your plugin:**

```typescript
// src/register-plugins.ts
import { registerFcPlugin } from "@thebigrick/catalyst-pluginizr";
import { headerWrapper } from "./plugins/header-wrapper";

registerFcPlugin(headerWrapper);
```

### Plugin Execution Order

Plugins execute based on their `sortOrder` value:

- Lower values run first (e.g., -10 before 0)
- Default value is 0
- Same values have no guaranteed order

Example of multiple plugins with order:

```typescript
// First plugin (runs first)
registerFcPlugin({
  name: "header-promo",
  sortOrder: -10,
  // ...
});

// Second plugin
registerFcPlugin({
  name: "header-analytics",
  sortOrder: 0,
  // ...
});

// Third plugin (runs last)
registerFcPlugin({
  name: "header-customization",
  sortOrder: 10,
  // ...
});
```

### Naming Conventions

Follow these conventions for plugin identification:

1. **Plugin Names:**
    - Use descriptive, kebab-case names
    - Include purpose in name (e.g., "header-promo-banner")
    - Keep names unique within your plugin

2. **Component/Function IDs:**
    - Format: `@packageName/path:item`
    - Example: `@bigcommerce/catalyst-core/components/header:Header`
    - Include export name for named exports
    - Omit export name for default exports

3. **File Structure:**
    - Keep related plugins in dedicated files
    - Use consistent naming for plugin files
    - Group plugins logically in directories

## Examples

### Function Plugin

```typescript
import { registerFnPlugin } from "@thebigrick/catalyst-pluginizr/src/registry";
import { getSearchResults } from "@bigcommerce/catalyst-core/components/header/_actions/get-search-results";

// Logging plugin
registerFnPlugin<typeof getSearchResults>({
  name: "search-term-logger",
  functionId: "@bigcommerce/catalyst-core/components/header/_actions/get-search-results:getSearchResults",
  sortOrder: -10,
  wrap: (fn, searchTerm) => {
    console.log(`Search term: ${searchTerm}`);
    return fn(searchTerm);
  },
});

// Search term modifier
registerFnPlugin<typeof getSearchResults>({
  name: "search-term-modifier",
  functionId: "@bigcommerce/catalyst-core/components/header/_actions/get-search-results:getSearchResults",
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

```typescript jsx
// plugins/header-wrapper.tsx
import { PluginFC } from "@thebigrick/catalyst-pluginizr";
import React from "react";
import { Header } from "@bigcommerce/catalyst-core/components/header";

const headerWrapperPlugin: PluginFC<typeof Header> = {
  name: "header-wrapper",
  component: "@bigcommerce/catalyst-core/components/header:Header",
  sortOrder: -10,
  wrap: ({ WrappedComponent, ...props }) => {
    return (
      <div className="enhanced-header">
        <div className="promo-banner">Special Offer!</div>
        <WrappedComponent {...props} />
      </div>
    );
  },
};

// plugins/header-analytics.tsx
const headerAnalyticsPlugin: PluginFC<typeof Header> = {
  name: "header-analytics",
  component: "@bigcommerce/catalyst-core/components/header:Header",
  sortOrder: 0,
  wrap: ({ WrappedComponent, ...props }) => {
    return (
      <TrackedComponent>
        <WrappedComponent {...props} />
      </TrackedComponent>
    );
  },
};

// register-plugins.ts
import { registerFcPlugin } from "@thebigrick/catalyst-pluginizr";
import headerWrapperPlugin from "./plugins/header-wrapper";
import headerAnalyticsPlugin from "./plugins/header-analytics";

registerFcPlugin(headerWrapperPlugin);
registerFcPlugin(headerAnalyticsPlugin);
```

### Non-Function Values Plugin

```typescript
import { registerFnPlugin } from "@thebigrick/catalyst-pluginizr/src/registry";
import { defaultCurrency } from "@bigcommerce/catalyst-core/config";

// Currency modifier
registerFnPlugin<typeof defaultCurrency>({
  name: "currency-modifier",
  functionId: "@bigcommerce/catalyst-core/config:defaultCurrency",
  sortOrder: -10,
  wrap: (value) => {
    return "EUR";
  },
});

// Currency formatter
registerFnPlugin<typeof defaultCurrency>({
  name: "currency-formatter",
  functionId: "@bigcommerce/catalyst-core/config:defaultCurrency",
  sortOrder: 0,
  wrap: (value) => {
    return `${value}-001`;
  },
});
```

## Technical Details

### Architecture Overview

Catalyst Pluginizr implements a sophisticated architecture that operates in multiple phases:

1. **Build Time Phase:**
    - Plugin discovery and registration
    - Code transformation
    - Optimization and caching

2. **Runtime Phase:**
    - Plugin execution
    - Component and function wrapping
    - Cache management

### Build Time Optimization

The system performs several crucial optimizations during the build phase:

1. **Plugin Discovery**
    - Scans `/plugins` directory for component imports
    - Analyzes files with extensions `.js`, `.jsx`, `.ts`, `.tsx`
    - Creates a cache of components with plugins

2. **Webpack Integration**
    - Injects custom webpack loader
    - Wraps exports with plugin handlers
    - Supports `'use no-plugins'` directive
    - Excludes `node_modules` and pluginizr package

3. **Plugin Registration File**
    - Generates automatic `plugins.ts`
    - Requires `register-plugins.ts` in each plugin
    - Prevents recursive processing

### Plugin Registration

The registration system uses a two-phase process:

1. **Static Registration**
    - Handles component and function plugins separately
    - Stores plugin metadata in memory
    - Maintains separate registries

2. **Cache Management**
    - Caches plugin lists by identifier
    - Pre-sorts plugins by `sortOrder`
    - Optimizes lookup performance

### Runtime Architecture

At runtime, the system employs several optimizations:

1. **Component Wrapping**
    - Applies plugins in `sortOrder`
    - Chains plugin enhancements
    - Preserves component names

2. **Function Enhancement**
    - Handles both functions and static values
    - Provides access to wrapped functions and arguments
    - Applies plugins sequentially

3. **Performance Considerations**
    - Caches sorted plugins
    - Only wraps components with plugins
    - Bypasses empty plugin lists

## Additional Notes

- Multiple plugins can target the same component/function
- Plugin execution follows strict `sortOrder`
- Changes apply automatically at runtime
- TypeScript ensures type safety throughout
- Build-time optimizations improve performance
- Caching reduces runtime overhead
- Plugin discovery is automatic
- Support for hot module replacement
- Debug mode available for development

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
