/* eslint-disable @typescript-eslint/no-explicit-any */

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
 * Filters out plugins that are not of the specified type.
 * @param {ComponentPlugin[] | FunctionPlugin[] | ValuePlugin[]} plugins
 * @param {EPluginType} type - The type of plugin to filter.
 * @returns {ComponentPlugin[] | FunctionPlugin[] | ValuePlugin[]} - The filtered plugins.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint -- This is necessary due to a IDE bug with TypeScript
const filterValidPlugins = <TPlugin extends any>(
  plugins: TPlugin[] | undefined,
  type: EPluginType,
): TPlugin[] => {
  if (!plugins?.filter) {
    return [];
  }

  if (process.env.NODE_ENV === 'development') {
    const invalidPlugins =
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (plugins as Array<CatalystPlugin | undefined>).filter((plugin) => plugin?.type !== type);

    if (invalidPlugins.length > 0) {
      invalidPlugins.forEach((plugin) => {
        if (!plugin) {
          return;
        }

        console.error(
          `Plugin type mismatch for ${plugin.resourceId}(${plugin.name}): Expected "${type}", got "${plugin.type}".`,
        );
      });
    }
  }

  return (
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unnecessary-condition
    ((plugins as Array<CatalystPlugin | undefined>).filter(
      (plugin) => plugin?.type === type,
    ) as TPlugin[]) || []
  );
};

/**
 * Higher-order component that wraps a component with plugins, sorted by sortOrder.
 * @param {ComponentPlugin[]} plugins
 * @param {React.ComponentType} WrappedComponent - The component to wrap.
 * @returns {React.ComponentType} - The enhanced component with plugins.
 */
export const withComponentPlugins = <P extends PluginWrappedComponent = PluginWrappedComponent>(
  plugins: Array<ComponentPlugin<P>>,
  WrappedComponent: P,
): P => {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const validPlugins = filterValidPlugins<ComponentPlugin<P>>(plugins, EPluginType.Component);

  if (validPlugins.length === 0) {
    return WrappedComponent;
  }

  const WithPlugins = validPlugins.reduce<P>((EnhancedComponent, plugin) => {
    const PluginWrapper: PluginComponentWrapper<P> = (props) => {
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
 * Higher-order function that wraps a function with plugins, sorted by sortOrder.
 * @param {FunctionPlugin[]} plugins
 * @param {Function} wrapped - The function to be wrapped.
 * @returns {Function} - The enhanced function wrapped with all applicable plugins.
 */
export const withFunctionPlugins = <T extends PluginWrappedFunction = PluginWrappedFunction>(
  plugins: Array<FunctionPlugin<T>>,
  wrapped: T,
): T => {
  const validPlugins = filterValidPlugins<FunctionPlugin<T>>(plugins, EPluginType.Function);

  if (validPlugins.length === 0) {
    return wrapped;
  }

  return validPlugins.reduce((acc, plugin) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return ((...args: Args<T>) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return plugin.wrap(acc, ...args);
    }) as T;
  }, wrapped);
};

/**
 * Higher-order function that wraps a value with plugins, sorted by sortOrder.
 * @param {ValuePlugin[]} plugins
 * @param {any} value - The value to be wrapped.
 * @returns {any} - The enhanced value wrapped with all applicable plugins.
 */
export const withValuePlugins = <T extends PluginWrappedValue = PluginWrappedValue>(
  plugins: Array<ValuePlugin<T>>,
  value: T,
): T => {
  const validPlugins = filterValidPlugins<ValuePlugin<T>>(plugins, EPluginType.Value);

  if (validPlugins.length === 0) {
    return value;
  }

  return validPlugins.reduce<T>((enhancedValue, plugin) => {
    return plugin.wrap(enhancedValue);
  }, value);
};
