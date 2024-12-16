/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { JSX, ReactElement } from 'react';

export type AnyValue = unknown;
export type AnyWrappedFn = (...args: any[]) => any;
export type AnyWrappedFC = (React.FC<any> | ((props: any) => Promise<JSX.Element>)) & {
  displayName?: string;
};

export type PluginWrapperFC<TSourceComponent extends AnyWrappedFC = AnyWrappedFC> = ((
  props: (TSourceComponent extends React.FC<infer P> ? P : never) & {
    WrappedComponent: TSourceComponent;
  },
) => ReactElement | Promise<ReactElement>) & { displayName?: string };

export type PluginWrapperFn<TSourceFn extends AnyWrappedFn> = (
  callback: TSourceFn,
  ...args: Parameters<TSourceFn>
) => ReturnType<TSourceFn>;

export type PluginWrapperVal<TSourceVal extends AnyValue = AnyValue> = (
  value: TSourceVal,
) => TSourceVal;

export interface ComponentPlugin<TSourceComponent extends AnyWrappedFC = AnyWrappedFC> {
  resourceId: string;
  sortOrder?: number;
  name: string;
  wrap: PluginWrapperFC<TSourceComponent>;
}

export interface FunctionPlugin<TSourceFn extends AnyWrappedFn = AnyWrappedFn> {
  resourceId: string;
  sortOrder?: number;
  name: string;
  wrap: PluginWrapperFn<TSourceFn>;
}

export interface ValuePlugin<TSourceVal extends AnyValue = AnyValue> {
  resourceId: string;
  sortOrder?: number;
  name: string;
  wrap: PluginWrapperVal<TSourceVal>;
}
