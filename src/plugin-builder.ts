import {
  CatalystPlugin,
  ComponentPlugin,
  EPluginType,
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
export const componentPlugin = <
  TSourceComponent extends PluginWrappedComponent = PluginWrappedComponent,
>(
  plugin: ComponentPlugin<TSourceComponent>,
): CatalystPlugin => ({
  ...plugin,
  type: EPluginType.Component,
});

/**
 * Registers a new function plugin
 * @template TSourceFunction - Type of the source function
 * @param {FunctionPlugin} plugin - The function plugin to register
 * @returns {void}
 */
export const functionPlugin = <
  TSourceFunction extends PluginWrappedFunction = PluginWrappedFunction,
>(
  plugin: FunctionPlugin<TSourceFunction>,
  // @ts-expect-error: TS doesn't like implicit casting here
): CatalystPlugin => ({
  ...plugin,
  type: EPluginType.Function,
});

/**
 * Registers a new value plugin
 * @template TSourceValue - Type of the source value
 * @param {ValuePlugin}  plugin - The value plugin to register
 * @returns {void}
 */
export const valuePlugin = <TSourceValue extends PluginWrappedValue = PluginWrappedValue>(
  plugin: ValuePlugin<TSourceValue>,
): CatalystPlugin => ({
  ...plugin,
  type: EPluginType.Value,
});

/**
 * Retrieves all component plugins registered for a specific component
 * @param {string} resourceId - The resource identifier
 * @param {EPluginType} type
 * @returns {CatalystPlugin[]} Array of plugins
 */
export const getPlugins = (resourceId: string, type: EPluginType): CatalystPlugin[] => {
  const res = plugins[resourceId] ?? [];

  if (process.env.NODE_ENV === 'development') {
    const invalidPlugins = res.filter((plugin) => plugin.type !== type);

    if (invalidPlugins.length > 0) {
      invalidPlugins.forEach((plugin) => {
        console.error(
          `Plugin type mismatch for ${plugin.resourceId}(${plugin.name}). Expected ${type}, got ${plugin.type}.`,
        );
      });
    }
  }

  return res.filter((plugin) => plugin.type === type);
};
