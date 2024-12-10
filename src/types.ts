/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { JSX, ReactElement } from 'react';

export type AnyWrappedFn = (...args: any[]) => any;
export type AnyWrappedFC = (React.FC<any> | ((props: any) => Promise<JSX.Element>)) & {
  displayName?: string;
};

export type PluginWrapperFC<TSourceComponent extends AnyWrappedFC = AnyWrappedFC> = ((
  props: (TSourceComponent extends React.FC<infer P> ? P : never) & {
    WrappedComponent: TSourceComponent;
  },
) => ReactElement | Promise<ReactElement>) & { displayName?: string };

export type PluginWrapperFn<TSourceFn extends AnyWrappedFn = AnyWrappedFn> = (
  callback: TSourceFn,
  ...args: Parameters<TSourceFn>
) => ReturnType<TSourceFn>;

export interface PluginFC<TSourceComponent extends AnyWrappedFC = AnyWrappedFC> {
  component: string;
  name: string;
  wrap: PluginWrapperFC<TSourceComponent>;
}

export interface PluginFn<TSourceFn extends AnyWrappedFn = AnyWrappedFn> {
  functionId: string;
  name: string;
  wrap: PluginWrapperFn<TSourceFn>;
}
