import { AnyValue, AnyWrappedFC, PluginFC, PluginFn } from './types';

const fcPlugins: Record<string, PluginFC[]> = {};
const fnPlugins: Record<string, PluginFn[]> = {};

export const registerFcPlugin = <TSourceComponent extends AnyWrappedFC = AnyWrappedFC>(
  plugin: PluginFC<TSourceComponent>,
) => {
  fcPlugins[plugin.component] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  fcPlugins[plugin.component].push(plugin as PluginFC);
};

export const registerFnPlugin = <TSourceFn extends AnyValue = AnyValue>(
  plugin: PluginFn<TSourceFn>,
) => {
  fnPlugins[plugin.functionId] ??= [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  fnPlugins[plugin.functionId].push(plugin as PluginFn);
};

export const getFcPlugins = <TSourceComponent extends AnyWrappedFC>(
  component: string,
): Array<PluginFC<TSourceComponent>> => {
  return fcPlugins[component] ?? [];
};

export const getFnPlugins = <TSourceFn extends AnyValue>(
  functionId: string,
): Array<PluginFn<TSourceFn>> => {
  return fnPlugins[functionId] ?? [];
};
