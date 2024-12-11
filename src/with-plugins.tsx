import { getFcPlugins, getFnPlugins } from './registry';
import { AnyValue, AnyWrappedFC, PluginWrapperFC } from './types';

/**
 * Higher-order component that wraps a component with plugins.
 * @param {string} component
 * @param {React.ComponentType} WrappedComponent
 * @returns {React.ComponentType}
 */
export const withPluginsFC = <P extends AnyWrappedFC = AnyWrappedFC>(
  component: string,
  WrappedComponent: P,
): P => {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const plugins = getFcPlugins(component);

  if (!plugins.length) {
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
 * Higher-order function that wraps a function with plugins.
 * @param {string} functionId - Unique identifier for the function
 * @param {Function} wrapped - The function to be wrapped
 * @returns {Function} - The enhanced function wrapped with all applicable plugins
 */
export const withPluginsFn = <T extends AnyValue = AnyValue>(functionId: string, wrapped: T): T => {
  const plugins = getFnPlugins(functionId);

  if (!plugins.length) {
    return wrapped;
  }

  if (typeof wrapped === 'function') {
    return plugins.reduce<T>((enhancedFn, plugin) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type Args = T extends (...args: infer P) => any ? P : never;

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return ((...args: Args) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-explicit-any
        const wrappedFn = enhancedFn as (...a: Args) => any;

        // @ts-expect-error for spread operator
        return plugin.wrap(wrappedFn, ...args);
      }) as T;
    }, wrapped);
  }

  return plugins.reduce<T>((enhancedValue, plugin) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return plugin.wrap(enhancedValue) as T;
  }, wrapped);
};
