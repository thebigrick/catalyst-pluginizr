/* eslint-disable @typescript-eslint/no-explicit-any */

import { AnyPlugin, getPlugins } from './registry';
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
const pluginsCache = new Map<string, AnyPlugin[]>();

/**
 * Retrieves and sorts plugins based on sortOrder.
 * @param {string} resourceId - The resource ID.
 * @returns {AnyPlugin[]} Sorted array of FC plugins.
 */
const getSortedPlugins = (resourceId: string): AnyPlugin[] => {
  if (process.env.NODE_ENV === 'production' && pluginsCache.has(resourceId)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return pluginsCache.get(resourceId)!;
  }

  const plugins = getPlugins(resourceId).slice(); // Clone to avoid mutating original

  plugins.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  pluginsCache.set(resourceId, plugins);

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
  const plugins = getSortedPlugins(component);

  if (plugins.length === 0) {
    return WrappedComponent;
  }

  const WithPlugins = plugins.reduce<P>((EnhancedComponent, plugin) => {
    const PluginWrapper: PluginWrapperFC<P> = (props) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return (plugin as ComponentPlugin).wrap({ ...props, WrappedComponent: EnhancedComponent });
    };

    PluginWrapper.displayName = `PluginWrapper(${plugin.name})`;

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return PluginWrapper as P;
  }, WrappedComponent);

  WithPlugins.displayName = `WithPlugins(${displayName})`;

  return WithPlugins;
};

/**
 * Higher-order function that wraps a function with plugins, sorted by sortOrder.
 * @param {string} functionId - Unique identifier for the function.
 * @param {Function} wrapped - The function to be wrapped.
 * @returns {Function} - The enhanced function wrapped with all applicable plugins.
 */
export const withPluginsFn = <T extends AnyValue = AnyValue>(functionId: string, wrapped: T): T => {
  const plugins = getSortedPlugins(functionId);

  if (plugins.length === 0) {
    return wrapped;
  }

  return plugins.reduce<T>((enhancedFn, plugin) => {
    type Args = T extends (...args: infer P) => any ? P : never;

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return ((...args: Args) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const wrappedFn = enhancedFn as (...a: Args) => any;

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-return
      return (plugin as FunctionPlugin).wrap(wrappedFn, ...args);
    }) as T;
  }, wrapped);
};

/**
 * Higher-order function that wraps a value with plugins, sorted by sortOrder.
 * @param {string} valueId - Unique identifier for the value.
 * @param {any} value - The value to be wrapped.
 * @returns {any} - The enhanced value wrapped with all applicable plugins.
 */
export const withPluginsVal = <T extends AnyValue = AnyValue>(valueId: string, value: T): T => {
  const plugins = getSortedPlugins(valueId);

  if (plugins.length === 0) {
    return value;
  }

  return plugins.reduce<T>((enhancedValue, plugin) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (plugin as ValuePlugin).wrap(enhancedValue) as T;
  }, value);
};
