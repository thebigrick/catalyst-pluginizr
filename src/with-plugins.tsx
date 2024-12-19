/* eslint-disable @typescript-eslint/no-explicit-any */

import { getPlugins } from './registry';
import {
  CatalystPlugin,
  ComponentPlugin,
  EPluginType,
  FunctionPlugin,
  PluginComponentWrapper,
  PluginWrappedComponent,
  PluginWrappedFunction,
  PluginWrappedValue,
  ValuePlugin,
} from './types';

type Args<T> = T extends (...args: infer P) => any ? P : never;

/**
 * Caches sorted plugins by resourceId to improve performance at runtime.
 */
const pluginsCache = new Map<string, CatalystPlugin[]>();

/**
 * Retrieves and sorts plugins based on sortOrder.
 * @param {string} resourceId - The resource ID.
 * @param {EPluginType} type
 * @returns {CatalystPlugin[]} Sorted array of FC plugins.
 */
const getSortedPlugins = (resourceId: string, type: EPluginType): CatalystPlugin[] => {
  if (process.env.NODE_ENV === 'production' && pluginsCache.has(resourceId)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return pluginsCache.get(resourceId)!;
  }

  const plugins = getPlugins(resourceId, type).slice(); // Clone to avoid mutating original

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
export const withPluginsFC = <P extends PluginWrappedComponent = PluginWrappedComponent>(
  component: string,
  WrappedComponent: P,
): P => {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const plugins = getSortedPlugins(component, EPluginType.Component);

  if (plugins.length === 0) {
    return WrappedComponent;
  }

  const WithPlugins = plugins.reduce<P>((EnhancedComponent, plugin) => {
    const PluginWrapper: PluginComponentWrapper<P> = (props) => {
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
export const withPluginsFn = <T extends PluginWrappedFunction = PluginWrappedFunction>(
  functionId: string,
  wrapped: T,
): T => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return ((...args: Args<T>): ReturnType<T> => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const plugins = getSortedPlugins(functionId, EPluginType.Function) as Array<FunctionPlugin<T>>;

    if (plugins.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return wrapped(...args);
    }

    // @ts-expect-error TS doesn't like the reduce here
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return plugins.reduce<T>((acc, plugin) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return (...pluginArgs: Args<T>) => plugin.wrap(acc, ...pluginArgs);
    }, wrapped)(...args);
  }) as T;
};

/**
 * Higher-order function that wraps a value with plugins, sorted by sortOrder.
 * @param {string} valueId - Unique identifier for the value.
 * @param {any} value - The value to be wrapped.
 * @returns {any} - The enhanced value wrapped with all applicable plugins.
 */
export const withPluginsVal = <T extends PluginWrappedValue = PluginWrappedValue>(
  valueId: string,
  value: T,
): T => {
  const plugins = getSortedPlugins(valueId, EPluginType.Value);

  if (plugins.length === 0) {
    return value;
  }

  return plugins.reduce<T>((enhancedValue, plugin) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (plugin as ValuePlugin).wrap(enhancedValue) as T;
  }, value);
};
