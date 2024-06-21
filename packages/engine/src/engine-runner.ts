import {
  Context,
  Either,
  FlowListener,
  NodeNativeComputeFunction,
  NodeType,
  PortsValue,
  PortValue,
  RuntimeFlow,
} from './types';
import { runFlow } from './run-flow';
import { Nothing, Ok } from './utils';

export const createFlowRunner = (
  allFlows: Record<string, RuntimeFlow>,
  entryFlowId: string,
  nodeNativeFunctions: Record<string, NodeNativeComputeFunction>
) => {
  const rootFlow = allFlows[entryFlowId];
  console.log('run flow', rootFlow);
  const context: Context = {
    providers: {
      getNodeNativeComputeFunction: (resourceId: string) =>
        nodeNativeFunctions[resourceId],
      getNodeComputeFlow: () => undefined,
      getFlow: (flowId: string) => allFlows[flowId],
    },
  };

  return (
    inputs: PortsValue | PortValue[] = {},
    tx: (key: string, value: Either<PortValue>) => void = (key, value) => {
      console.log('tx', key, value);
    }
  ) => {
    const inputMap: Record<string, PortValue> = {};
    if (Array.isArray(inputs)) {
      rootFlow.inputPorts.map((x, i) => {
        inputMap[x.key] = inputs[i];
      });
    } else {
      rootFlow.inputPorts.map((x) => {
        inputMap[x.key] = inputs[x.key];
      });
    }
    let _listener: FlowListener<Either<PortValue>>;
    const res = runFlow(
      context,
      rootFlow,
      (key: string) =>
        inputMap[key] === undefined ? Nothing() : Ok(inputMap[key]),
      tx,
      (listener) => {
        _listener = listener;
      }
    );

    if (
      rootFlow.executionPath.length === 0 &&
      Object.values(rootFlow.nodes).some((x) => x.type === NodeType.Setup)
    ) {
      _listener!.ready();
    }

    return res;
  };
};
