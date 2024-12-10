import { getFcPlugins, getFnPlugins } from './registry';
import { AnyWrappedFC, AnyWrappedFn, PluginWrapperFC } from './types';

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
 * @param {Function} wrappedFn - The function to be wrapped
 * @returns {Function} - The enhanced function wrapped with all applicable plugins
 */
export const withPluginsFn = <T extends AnyWrappedFn = AnyWrappedFn>(
  functionId: string,
  wrappedFn: T,
): T => {
  const plugins = getFnPlugins(functionId);

  if (!plugins.length) {
    return wrappedFn;
  }

  return plugins.reduce<T>((enhancedFn, plugin) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-argument
    return ((...args) => plugin.wrap(enhancedFn, ...args)) as T;
  }, wrappedFn);
};
