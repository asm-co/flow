import { Flow } from './models';
import {
  EventHandler,
  FlowPath,
  FlowFunction,
  NodeListener,
  NodeFunction,
  ProviderFunction,
  Result,
} from './common';
import { Hooks, PluginHooks } from './hooks';

export * from './common';
export * from './models';
export * from './hooks';

export interface Context {
  getNativeFunction: (target: string) => NodeFunction | undefined;
  getFlow: (id: string) => Flow;
  providerFunctions: Record<string, ProviderFunction>;
  slotFunctions: Record<string, FlowFunction>;
  hooks?: Hooks;
  cachedFlowFunctions: Record<string, FlowFunction>; // <FlowPathString, FlowFunction>
  flowPath: FlowPath;
  flow: Flow;
}

export type FlowStore = {
  inputs: Record<string, Result>;
  emit: EventHandler;
  nodeListeners: Record<string, NodeListener>;
  nodeStates: Record<string, Result>;
  tempStates: Record<string, Result>; // <portId,portValue> data nodes and flow input ports
};

export type FlowRunnerPlugin = {
  name: string;
  providerFunctions?: Record<string, ProviderFunction>;
  getNativeFunction?: (target: string) => NodeFunction | undefined;
  getFlow?: (flowId: string) => Flow | undefined;
  hooks?: PluginHooks;
};
