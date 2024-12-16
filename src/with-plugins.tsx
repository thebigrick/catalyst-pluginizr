/* eslint-disable @typescript-eslint/no-explicit-any */

import { getFcPlugins, getFnPlugins, getValPlugins } from './registry';
import {
  AnyValue,
  AnyWrappedFC,
  ComponentPlugin,
  FunctionPlugin,
  PluginWrapperFC,
  ValuePlugin,
} from './types';

/**
 * Caches sorted plugins by resourceId to improve performance at runtime.
 */
const sortedFcPluginsCache = new Map<string, Array<ComponentPlugin<any>>>();
const sortedFnPluginsCache = new Map<string, Array<FunctionPlugin<any>>>();
const sortedValPluginsCache = new Map<string, Array<ValuePlugin<any>>>();

/**
 * Retrieves and sorts FC plugins based on sortOrder.
 * @param {string} component - The component name.
 * @returns {Array<ComponentPlugin<any>>} Sorted array of FC plugins.
 */
const getSortedFcPlugins = (component: string): Array<ComponentPlugin<any>> => {
  if (sortedFcPluginsCache.has(component)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return sortedFcPluginsCache.get(component)!;
  }

  const plugins = getFcPlugins(component).slice(); // Clone to avoid mutating original

  plugins.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  sortedFcPluginsCache.set(component, plugins);

  return plugins;
};

/**
 * Higher-order component that wraps a component with plugins, sorted by sortOrder.
 * @param {string} component - The component identifier.
 * @param {React.ComponentType} WrappedComponent - The component to wrap.
 * @returns {React.ComponentType} - The enhanced component with plugins.
 */
export const withPluginsFC = <P extends AnyWrappedFC = AnyWrappedFC>(
  component: string,
  WrappedComponent: P,
): P => {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const plugins = getSortedFcPlugins(component);

  if (plugins.length === 0) {
    return WrappedComponent;
  }

  const WithPlugins = plugins.reduce<P>((EnhancedComponent, plugin) => {
    const PluginWrapper: PluginWrapperFC<P> = (props) => {
      return plugin.wrap({ ...props, WrappedComponent: EnhancedComponent });
    };

    PluginWrapper.displayName = `PluginWrapper(${plugin.name})`;

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return PluginWrapper as P;
  }, WrappedComponent);

  WithPlugins.displayName = `WithPlugins(${displayName})`;

  return WithPlugins;
};

/**
 * Retrieves and sorts Fn plugins based on sortOrder.
 * @param {string} functionId - The function identifier.
 * @returns {Array<FunctionPlugin<any>>} Sorted array of Fn plugins.
 */
const getSortedFnPlugins = (functionId: string): Array<FunctionPlugin<any>> => {
  if (sortedFnPluginsCache.has(functionId)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return sortedFnPluginsCache.get(functionId)!;
  }

  const plugins = getFnPlugins(functionId).slice(); // Clone to avoid mutating original

  plugins.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  sortedFnPluginsCache.set(functionId, plugins);

  return plugins;
};

/**
 * Higher-order function that wraps a function with plugins, sorted by sortOrder.
 * @param {string} functionId - Unique identifier for the function.
 * @param {Function} wrapped - The function to be wrapped.
 * @returns {Function} - The enhanced function wrapped with all applicable plugins.
 */
export const withPluginsFn = <T extends AnyValue = AnyValue>(functionId: string, wrapped: T): T => {
  const plugins = getSortedFnPlugins(functionId);

  if (plugins.length === 0) {
    return wrapped;
  }

  if (typeof wrapped === 'function') {
    return plugins.reduce<T>((enhancedFn, plugin) => {
      type Args = T extends (...args: infer P) => any ? P : never;

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return ((...args: Args) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const wrappedFn = enhancedFn as (...a: Args) => any;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return plugin.wrap(wrappedFn, ...args);
      }) as T;
    }, wrapped);
  }

  return plugins.reduce<T>((enhancedValue, plugin) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return plugin.wrap(enhancedValue) as T;
  }, wrapped);
};

/**
 * Retrieves and sorts Val plugins based on sortOrder.
 * @param {string} valueId - The value identifier.
 * @returns {Array<ValuePlugin<any>>} Sorted array of Val plugins.
 */
const getSortedValPlugins = (valueId: string): Array<ValuePlugin<any>> => {
  if (sortedValPluginsCache.has(valueId)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return sortedValPluginsCache.get(valueId)!;
  }

  const plugins = getValPlugins(valueId).slice(); // Clone to avoid mutating original

  plugins.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  sortedValPluginsCache.set(valueId, plugins);

  return plugins;
};

// Existing withPluginsFC implementation...

// Existing withPluginsFn implementation...

/**
 * Higher-order function that wraps a value with plugins, sorted by sortOrder.
 * @param {string} valueId - Unique identifier for the value.
 * @param {any} value - The value to be wrapped.
 * @returns {any} - The enhanced value wrapped with all applicable plugins.
 */
export const withPluginsVal = <T extends AnyValue = AnyValue>(valueId: string, value: T): T => {
  const plugins = getSortedValPlugins(valueId);

  if (plugins.length === 0) {
    return value;
  }

  return plugins.reduce<T>((enhancedValue, plugin) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return plugin.wrap(enhancedValue) as T;
  }, value);
};
