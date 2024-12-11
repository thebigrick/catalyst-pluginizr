/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { JSX, ReactElement } from 'react';

export type AnyValue = unknown;
export type AnyWrappedFC = (React.FC<any> | ((props: any) => Promise<JSX.Element>)) & {
  displayName?: string;
};

export type PluginWrapperFC<TSourceComponent extends AnyWrappedFC = AnyWrappedFC> = ((
  props: (TSourceComponent extends React.FC<infer P> ? P : never) & {
    WrappedComponent: TSourceComponent;
  },
) => ReactElement | Promise<ReactElement>) & { displayName?: string };

export type PluginWrapperFn<TSourceFn extends AnyValue = AnyValue> = TSourceFn extends (
  ...args: any[]
) => any
  ? (callback: TSourceFn, ...args: Parameters<TSourceFn>) => ReturnType<TSourceFn>
  : (value: TSourceFn) => TSourceFn;

export interface PluginFC<TSourceComponent extends AnyWrappedFC = AnyWrappedFC> {
  component: string;
  sortOrder?: number;
  name: string;
  wrap: PluginWrapperFC<TSourceComponent>;
}

export interface PluginFn<TSourceFn extends AnyValue = AnyValue> {
  functionId: string;
  sortOrder?: number;
  name: string;
  wrap: PluginWrapperFn<TSourceFn>;
}
