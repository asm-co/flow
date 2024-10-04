import {
  Context,
  FlowFunction,
  FlowRunnerPlugin,
  NodeFunction,
  ProviderFunction,
  Flow,
} from './types';
import { createFlowFunction } from './run-flow';
import { createHooks } from './hooks';

export const createRunner = (
  entryFlowId: string,
  plugins: FlowRunnerPlugin[]
): FlowFunction => {
  const cachedNativeFunctions: Record<string, NodeFunction> = {};
  const cachedFlow: Record<string, Flow> = {};

  // hooks is running one by one, then later one can override the previous one
  const hooks = createHooks(plugins);

  // getters are running in reverse order so that later ones have higher priority
  plugins.reverse();

  const getNativeFunction = (target: string): NodeFunction | undefined => {
    if (cachedNativeFunctions[target]) {
      return cachedNativeFunctions[target];
    }
    for (const p of plugins) {
      const func = p.getNativeFunction?.(target);
      if (func) {
        cachedNativeFunctions[target] = func;
        return func;
      }
    }
  };
  const getFlow = (flowId: string): Flow => {
    if (cachedFlow[flowId]) {
      return cachedFlow[flowId];
    }
    for (const p of plugins) {
      const flow = p.getFlow?.(flowId);
      if (flow) {
        cachedFlow[flowId] = flow;
        return flow;
      }
    }
    throw new Error(`Flow ${flowId} is not found`);
  };

  const rootFlow = getFlow(entryFlowId);

  const providerFunctions: Record<string, ProviderFunction> = {};
  plugins.forEach((plugin) => {
    Object.entries(plugin.providerFunctions || {}).forEach(([key, value]) => {
      providerFunctions[key] = value;
    });
  });

  return (inputs, emit, listen) => {
    const context: Context = {
      getNativeFunction,
      getFlow,
      providerFunctions: { ...providerFunctions },
      slotFunctions: {},
      flowPath: [],
      flow: rootFlow,
      hooks,
      cachedFlowFunctions: {},
    };
    const flowFunction = createFlowFunction(context);
    return flowFunction(inputs, emit, listen);
  };
};
