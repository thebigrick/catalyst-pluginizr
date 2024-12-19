/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { JSX, ReactElement } from 'react';

export type PluginWrappedValue = any;
export type PluginWrappedFunction = (...args: any[]) => any;
export type PluginWrappedComponent = (React.FC<any> | ((props: any) => Promise<JSX.Element>)) & {
  displayName?: string;
};

export type PluginWrapper = PluginComponentWrapper | PluginFunctionWrapper | PluginValueWrapper;

export type PluginComponentWrapper<
  TSourceComponent extends PluginWrappedComponent = PluginWrappedComponent,
> = ((
  props: (TSourceComponent extends React.FC<infer P> ? P : never) & {
    WrappedComponent: TSourceComponent;
  },
) => ReactElement | Promise<ReactElement>) & { displayName?: string };

export type PluginFunctionWrapper<
  TSourceFunction extends PluginWrappedFunction = PluginWrappedFunction,
> = (
  callback: TSourceFunction,
  ...args: Parameters<TSourceFunction>
) => ReturnType<TSourceFunction>;

export type PluginValueWrapper<TSourceValue extends PluginWrappedValue = PluginWrappedValue> = (
  value: TSourceValue,
) => TSourceValue;

export interface CatalystPlugin<TPluginWrapper extends PluginWrapper = PluginWrapper> {
  resourceId: string;
  sortOrder?: number;
  name: string;
  wrap: TPluginWrapper;
}

export type ComponentPlugin<
  TSourceComponent extends PluginWrappedComponent = PluginWrappedComponent,
> = CatalystPlugin<PluginComponentWrapper<TSourceComponent>>;

export type FunctionPlugin<TSourceFunction extends PluginWrappedFunction = PluginWrappedFunction> =
  Omit<CatalystPlugin, 'wrap'> & {
    wrap: PluginFunctionWrapper<TSourceFunction>;
  };

export type ValuePlugin<TSourceValue extends PluginWrappedValue = PluginWrappedValue> = Omit<
  CatalystPlugin,
  'wrap'
> & {
  wrap: PluginValueWrapper<TSourceValue>;
};
