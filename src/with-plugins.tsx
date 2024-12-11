/* eslint-disable @typescript-eslint/no-explicit-any */

import { getFcPlugins, getFnPlugins } from './registry';
import { AnyValue, AnyWrappedFC, PluginFC, PluginFn, PluginWrapperFC } from './types';

/**
 * Caches sorted FC plugins by component name to improve performance.
 */
const sortedFcPluginsCache = new Map<string, Array<PluginFC<any>>>();

/**
 * Retrieves and sorts FC plugins based on sortOrder.
 * @param {string} component - The component name.
 * @returns {Array<PluginFC<any>>} Sorted array of FC plugins.
 */
const getSortedFcPlugins = (component: string): Array<PluginFC<any>> => {
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
 * Caches sorted Fn plugins by functionId to improve performance.
 */
const sortedFnPluginsCache = new Map<string, Array<PluginFn<any>>>();

/**
 * Retrieves and sorts Fn plugins based on sortOrder.
 * @param {string} functionId - The function identifier.
 * @returns {Array<PluginFn<any>>} Sorted array of Fn plugins.
 */
const getSortedFnPlugins = (functionId: string): Array<PluginFn<any>> => {
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
