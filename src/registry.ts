import {
  AnyValue,
  AnyWrappedFC,
  AnyWrappedFn,
  ComponentPlugin,
  FunctionPlugin,
  ValuePlugin,
} from './types';

/** Storage for component plugins indexed by resource ID */
const fcPlugins: Record<string, ComponentPlugin[]> = {};

/** Storage for function plugins indexed by resource ID */
const fnPlugins: Record<string, FunctionPlugin[]> = {};

/** Storage for value plugins indexed by resource ID */
const valPlugins: Record<string, ValuePlugin[]> = {};

/**
 * Registers a new component plugin
 * @template TSourceComponent - Type of the source component
 * @param {ComponentPlugin} plugin - The component plugin to register
 * @returns {void}
 */
export const registerComponentPlugin = <TSourceComponent extends AnyWrappedFC = AnyWrappedFC>(
  plugin: ComponentPlugin<TSourceComponent>,
): void => {
  fcPlugins[plugin.resourceId] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  fcPlugins[plugin.resourceId].push(plugin as ComponentPlugin);
};

/**
 * Registers a new function plugin
 * @template TSourceFn - Type of the source function
 * @param {FunctionPlugin} plugin - The function plugin to register
 * @returns {void}
 */
export const registerFunctionPlugin = <TSourceFn extends AnyWrappedFn = AnyWrappedFn>(
  plugin: FunctionPlugin<TSourceFn>,
): void => {
  fnPlugins[plugin.resourceId] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  fnPlugins[plugin.resourceId].push(plugin as FunctionPlugin);
};

/**
 * Registers a new value plugin
 * @template TSourceValue - Type of the source value
 * @param {ValuePlugin}  plugin - The value plugin to register
 * @returns {void}
 */
export const registerValuePlugin = <TSourceValue extends AnyValue = AnyValue>(
  plugin: ValuePlugin<TSourceValue>,
): void => {
  valPlugins[plugin.resourceId] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  valPlugins[plugin.resourceId].push(plugin as ValuePlugin);
};

/**
 * Retrieves all component plugins registered for a specific component
 * @template TSourceComponent - Type of the source component
 * @param {string} resourceId - The component identifier
 * @returns {Array<ComponentPlugin<TSourceComponent>>} Array of component plugins
 */
export const getFcPlugins = <TSourceComponent extends AnyWrappedFC>(
  resourceId: string,
): Array<ComponentPlugin<TSourceComponent>> => {
  return fcPlugins[resourceId] ?? [];
};

/**
 * Retrieves all function plugins registered for a specific function
 * @template TSourceFn - Type of the source function
 * @param {string} resourceId - The function identifier
 * @returns {Array<FunctionPlugin<TSourceFn>>} Array of function plugins
 */
export const getFnPlugins = <TSourceFn extends AnyWrappedFn>(
  resourceId: string,
): Array<FunctionPlugin<TSourceFn>> => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return (fnPlugins[resourceId] ?? []) as Array<FunctionPlugin<TSourceFn>>;
};

/**
 * Retrieves all value plugins registered for a specific value
 * @template TSourceValue - Type of the source value
 * @param {string} resourceId - The value identifier
 * @returns {Array<ValuePlugin<TSourceValue>>} Array of value plugins
 */
export const getValPlugins = <TSourceValue extends AnyValue>(
  resourceId: string,
): Array<ValuePlugin<TSourceValue>> => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return (valPlugins[resourceId] ?? []) as Array<ValuePlugin<TSourceValue>>;
};
