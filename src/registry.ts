import {
  CatalystPlugin,
  ComponentPlugin,
  FunctionPlugin,
  PluginWrappedComponent,
  PluginWrappedFunction,
  PluginWrappedValue,
  ValuePlugin,
} from './types';

/** Storage for plugins indexed by resource ID */
const plugins: Record<string, CatalystPlugin[]> = {};

/**
 * Registers a new component plugin
 * @template TSourceComponent - Type of the source component
 * @param {ComponentPlugin} plugin - The component plugin to register
 * @returns {void}
 */
export const registerComponentPlugin = <
  TSourceComponent extends PluginWrappedComponent = PluginWrappedComponent,
>(
  plugin: ComponentPlugin<TSourceComponent>,
): void => {
  plugins[plugin.resourceId] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  plugins[plugin.resourceId].push(plugin as ComponentPlugin);
};

/**
 * Registers a new function plugin
 * @template TSourceFn - Type of the source function
 * @param {FunctionPlugin} plugin - The function plugin to register
 * @returns {void}
 */
export const registerFunctionPlugin = <
  TSourceFn extends PluginWrappedFunction = PluginWrappedFunction,
>(
  plugin: FunctionPlugin<TSourceFn>,
): void => {
  plugins[plugin.resourceId] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  plugins[plugin.resourceId].push(plugin as FunctionPlugin);
};

/**
 * Registers a new value plugin
 * @template TSourceValue - Type of the source value
 * @param {ValuePlugin}  plugin - The value plugin to register
 * @returns {void}
 */
export const registerValuePlugin = <TSourceValue extends PluginWrappedValue = PluginWrappedValue>(
  plugin: ValuePlugin<TSourceValue>,
): void => {
  plugins[plugin.resourceId] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  plugins[plugin.resourceId].push(plugin as ValuePlugin);
};

/**
 * Retrieves all component plugins registered for a specific component
 * @param {string} resourceId - The resource identifier
 * @returns {CatalystPlugin[]} Array of plugins
 */
export const getPlugins = (resourceId: string): CatalystPlugin[] => {
  return plugins[resourceId] ?? [];
};
