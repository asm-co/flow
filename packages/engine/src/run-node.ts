import {
  Context,
  Either,
  ExternalFlowData,
  Listener,
  MaybePromise,
  NodeOutputs,
  PortValue,
  ReservedNodeResourceId,
  Result,
  RuntimeFlow,
  RuntimeNode,
  RuntimePort,
  SubFlowComputeFunction,
  SubFlowState,
} from './types';
import { runFlow } from './run-flow';
import { createSubFlowGroupFunction } from './create-sub-flow';
import { Ok } from './utils';

export const runNode = (
  context: Context,
  node: RuntimeNode,
  readExternalInput: (
    port: RuntimePort,
    scopedExecutionIds: string[]
  ) => Result<PortValue>,
  tx: (port: RuntimePort, value: Either<PortValue>) => void,
  onRx: (listener: Listener<Either<PortValue>>) => void,
  getSubFlowState: (subFlowId: string) => SubFlowState,
  setSubFlowState: (subFlowId: string, subFlowState: SubFlowState) => void
): MaybePromise<Either<NodeOutputs>> => {
  const dispatchMap: Record<string, (val: Either<PortValue>) => void> = {}; // <portId,listener>
  let onReady: (() => void) | undefined;
  let onComplete: (() => void) | undefined;

  const readInput = (
    port: RuntimePort,
    scopedExecutionIds: string[]
  ): Result<PortValue> => {
    if (!port.subFlowId && node.staticInputs[port.key] !== undefined) {
      return Ok(node.staticInputs[port.key]);
    }
    return readExternalInput(port, scopedExecutionIds);
  };

  onRx({
    ready: () => {
      if (onReady) {
        onReady();
      }
    },
    next: (portId, val) => {
      if (dispatchMap[portId]) {
        dispatchMap[portId](val);
      }
    },
    complete: () => {
      if (onComplete) {
        onComplete();
      }
    },
  });

  const nodeId = node.id;
  // wrap subflows to functions
  const subFlowGroupFunctions: Record<string, SubFlowComputeFunction[]> = {};

  for (const groupKey of Object.keys(node.subFlowGroups)) {
    subFlowGroupFunctions[groupKey] = [];
    for (const subFlowInfo of node.subFlowGroups[groupKey]) {
      const subFlowId = subFlowInfo.subFlowId;
      const subFlow = node.subFlows[subFlowId];
      const relatedNodeInputPorts = Object.fromEntries(
        node.inputPorts
          .filter((x) => x.subFlowId === subFlowId)
          .map((x) => [x.key, x])
      );
      const relateNodeOutputPorts = Object.fromEntries(
        node.outputPorts
          .filter((x) => x.subFlowId === subFlowId)
          .map((x) => [x.key, x])
      );

      const onSubFlowTxByKey = (key: string, value: Either<PortValue>) => {
        const relatedNodeOutputPort = relateNodeOutputPorts[key];
        if (relatedNodeOutputPort) {
          console.log(
            'related node output port:',
            relatedNodeOutputPort,
            key,
            value
          );
          tx(relateNodeOutputPorts[key], value);
        } else {
          console.log('no related node output port, so raw:', key, value);
        }
      };

      subFlowGroupFunctions[groupKey].push(
        createSubFlowGroupFunction(
          context,
          subFlow,
          (key, scopedExecutionIds) =>
            readInput(
              relatedNodeInputPorts[key],
              [subFlowId].concat(scopedExecutionIds)
            ),
          onSubFlowTxByKey,
          (subFlowListener) => {
            for (const streamInputPort of subFlow.inputPorts.filter(
              (x) => x.isStream && !x.isPredefined
            )) {
              const nodePort = relatedNodeInputPorts[streamInputPort.key];
              dispatchMap[nodePort.id] = (val) => {
                subFlowListener(streamInputPort.key, val);
              };
            }
          },
          () => getSubFlowState(subFlowId),
          (val) => setSubFlowState(subFlowId, val)
        )
      );
    }
  }

  // let nodeResult: Either<Record<string, PortValue>>;

  const nativeComputeFunction =
    node.resourceId === ReservedNodeResourceId.Import ||
    node.resourceId === ReservedNodeResourceId.JsCodeSync ||
    node.resourceId === ReservedNodeResourceId.JsExpression ||
    node.resourceId === ReservedNodeResourceId.JsCodeAsync ||
    node.resourceId === ReservedNodeResourceId.ImportContent
      ? // node.resourceId === ReservedNodeResourceId.JsExpressionAsync
        context.providers.getNodeNativeComputeFunction(nodeId)
      : context.providers.getNodeNativeComputeFunction(node.resourceId);

  const nodeInputPorts = Object.fromEntries(
    node.inputPorts.filter((x) => !x.subFlowId).map((x) => [x.key, x])
  );
  const nodeOutputPorts = Object.fromEntries(
    node.outputPorts.filter((x) => !x.subFlowId).map((x) => [x.key, x])
  );

  const nodeTx = (
    key: string,
    value: Either<PortValue>,
    subFlowId?: string
  ) => {
    if (subFlowId) {
      const port = node.outputPorts.find(
        (x) => x.key === key && x.subFlowId === subFlowId && x.isStream
      );
      if (port) {
        tx(port, value);
      }
    } else {
      tx(nodeOutputPorts[key], value);
    }
  };

  const registerRxListener = (listener: Listener<Either<PortValue>>) => {
    for (const port of node.inputPorts.filter((x) => x.isStream)) {
      dispatchMap[port.id] = (val) =>
        listener.next(port.key, val, port.subFlowId);
    }
    onReady = () => listener.ready();
    onComplete = () => listener.complete();
  };

  const readStreamInputSnapshot = (
    subFlowId: string | null,
    portKey: string
  ) => {
    const port = node.inputPorts.find(
      (x) => x.subFlowId === subFlowId && x.key === portKey && x.isStream
    )!;
    return readInput(port, []);
  };

  const readNodeInputs = () => {
    const inputs: Record<string, Result<PortValue>> = {};
    for (const port of node.inputPorts.filter(
      (x) => !x.subFlowId && !x.isStream
    )) {
      inputs[port.key] = readInput(port, []);
    }
    return inputs;
  };

  if (nativeComputeFunction) {
    return nativeComputeFunction({
      node,
      readInput: (key, seed) =>
        readInput(nodeInputPorts[key], seed ? [seed] : []),
      subFlowGroupFunctions,
      tx: nodeTx,
      onRx: registerRxListener,
      readStreamInputSnapshot,
    });
  } else if (node.resourceId === ReservedNodeResourceId.Abstract) {
    // special nodes
    if (
      !context.abstractionSubFlowGroupFunctions ||
      !context.abstractionSubFlowGroupFunctions[nodeId]
    ) {
      throw new Error('Abstract node is not implemented');
    }
    const nodeInputs = readNodeInputs();
    return context.abstractionSubFlowGroupFunctions[nodeId][0](
      nodeInputs,
      nodeTx,
      (listener) =>
        registerRxListener({
          next: listener,
          ready: () => undefined,
          complete: () => undefined,
        })
    );
  }
  // flow proxies
  else {
    let proxyFlow: RuntimeFlow | undefined;
    if (node.resourceId === ReservedNodeResourceId.SubFlow) {
      const subFlowId = Object.keys(node.subFlows)[0];
      return runFlow(
        context,
        node.subFlows[subFlowId],
        (key, scopedExecutionIds) =>
          readInput(nodeInputPorts[key], scopedExecutionIds),
        nodeTx,
        (nextHandler) => registerRxListener(nextHandler)
      );
    } else if (node.resourceId === ReservedNodeResourceId.ExternalFlow) {
      proxyFlow = context.providers.getFlow(
        (node.properties as ExternalFlowData).flowId
      );
      if (!proxyFlow) {
        throw new Error(`Flow ${nodeId} is not found`);
      }
      const newContext: Context = {
        abstractionSubFlowGroupFunctions: subFlowGroupFunctions,
        providers: context.providers,
      };
      return runFlow(
        newContext,
        proxyFlow,
        (key, scopedExecutionIds) =>
          readInput(nodeInputPorts[key], scopedExecutionIds),
        nodeTx,
        (nextHandler) => registerRxListener(nextHandler)
      );
    } else {
      throw new Error(`${node.resourceId} is not implemented`);
    }
  }
};
