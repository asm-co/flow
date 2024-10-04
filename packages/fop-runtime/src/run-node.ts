import {
  Context,
  EventHandler,
  FlowFunction,
  NodeListener,
  Result,
  ReturnResult,
  ReturnResultKind,
  Node,
  NodeKind,
} from './types';
import { createFlowFunction } from './run-flow';
import { getFlowPathHash, Immediate } from './utils';

const runNode = (
  context: Context,
  nodeId: string,
  node: Node,
  nodeInputs: Record<string, Result>,
  subFlowFunctions: Record<string, FlowFunction>,
  emit: EventHandler,
  listen: (listener: NodeListener) => void
): ReturnResult => {
  let listener: NodeListener | undefined = undefined;

  listen((key, val, subFlowKey) => {
    listener?.(key, val, subFlowKey);
  });

  const registerListener = (_listener: NodeListener) => {
    listener = _listener;
  };

  if (node.kind === NodeKind.Native) {
    const nodeFunction = context.getNativeFunction(node.target);
    if (!nodeFunction) {
      throw new Error(`Native function ${node.target} is not found`);
    }
    return nodeFunction(nodeInputs, subFlowFunctions, emit, registerListener);
  } else if (node.kind === NodeKind.Flow) {
    const flowId = node.target;
    const proxyFlow = context.getFlow(flowId);
    if (!proxyFlow) {
      throw new Error(`Flow ${flowId} is not found`);
    }
    const newContext: Context = {
      ...context,
      flowPath: [...context.flowPath, { nodeId: nodeId, subFlowKey: flowId }],
      flow: proxyFlow,
      slotFunctions: subFlowFunctions,
    };
    const flowPathString = getFlowPathHash(newContext.flowPath);
    // memoize flow function for better performance
    let flowFunction = context.cachedFlowFunctions[flowPathString];
    if (!flowFunction) {
      flowFunction = createFlowFunction(newContext);
      context.cachedFlowFunctions[flowPathString] = flowFunction;
    }
    return flowFunction(nodeInputs, emit, (nextHandler) =>
      registerListener(nextHandler)
    );
  } else if (node.kind === NodeKind.Inject) {
    const providerFunction = context.providerFunctions[node.target];
    if (!providerFunction) {
      throw new Error(`Provider function ${node.target} is not found`);
    }
    return providerFunction(registerListener);
  } else if (node.kind === NodeKind.Slot) {
    const slotFunction = subFlowFunctions[node.target];
    if (!slotFunction) {
      throw new Error(`Slot function ${node.target} is not found`);
    }
    return slotFunction(nodeInputs, emit, registerListener);
  } else {
    throw new Error(`Unknown node ${node}`);
  }
};

export const runNodeWithHooks = (
  context: Context,
  nodeId: string,
  node: Node,
  nodeInputs: Record<string, Result>,
  subFlowFunctions: Record<string, FlowFunction>,
  emit: EventHandler,
  listen: (listener: NodeListener) => void
): ReturnResult => {
  context.hooks?.onEvent?.({
    name: 'onWillRunNode',
    value: {
      flowPath: context.flowPath,
      nodeId: nodeId,
      nodeInputs,
    },
  });
  const res =
    context.hooks?.overrideNodeRun?.(
      context.flowPath,
      nodeId,
      node,
      nodeInputs,
      subFlowFunctions,
      emit,
      listen
    ) ??
    runNode(context, nodeId, node, nodeInputs, subFlowFunctions, emit, listen);
  switch (res.kind) {
    case ReturnResultKind.Immediate: {
      context.hooks?.onEvent?.({
        name: 'onDidRunNode',
        value: {
          flowPath: context.flowPath,
          nodeId: nodeId,
          nodeOutput: res.value,
        },
      });
      const transformedResult = context.hooks?.transformNodeOutput?.(
        context.flowPath,
        nodeId,
        res.value
      );
      return Immediate(transformedResult ?? res.value);
    }
    case ReturnResultKind.Deferred: {
      return {
        kind: ReturnResultKind.Deferred,
        promise: new Promise((resolve) => {
          res.promise.then((awaitedResult) => {
            context.hooks?.onEvent?.({
              name: 'onDidAwaitNode',
              value: {
                flowPath: context.flowPath,
                nodeId: nodeId,
              },
            });
            context.hooks?.onEvent?.({
              name: 'onDidRunNode',
              value: {
                flowPath: context.flowPath,
                nodeId: nodeId,
                nodeOutput: awaitedResult,
              },
            });
            const transformedResult = context.hooks?.transformNodeOutput?.(
              context.flowPath,
              nodeId,
              awaitedResult
            );
            resolve(transformedResult ?? awaitedResult);
          });
        }),
      };
    }
  }
};
