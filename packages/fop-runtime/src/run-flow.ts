import {
  Context,
  FlowFunction,
  FlowStore,
  PortKind,
  ReservedPortKey,
  Result,
  ResultKind,
  ReturnResult,
  ReturnResultKind,
  FlowKind,
  Node,
  NodeKind,
  Port,
  SequenceStep,
  SequenceStepKind,
  SequenceStepResult,
  SequenceStepResultKind,
} from './types';

import {
  Deferred,
  Err,
  FlowPort,
  getFlowPathHash,
  getPortHash,
  Immediate,
  NodePort,
  None,
  Ok,
  ProviderPort,
  SeqJump,
  SeqNext,
  Some,
  SubFlowPort,
} from './utils';
import { runNodeWithHooks } from './run-node';

const clearTempStates = (flowStore: FlowStore) => {
  Object.keys(flowStore.tempStates).map(
    (key) => delete flowStore.tempStates[key]
  );
};

const readNodeInputs = (
  context: Context,
  flowStore: FlowStore,
  nodeId: string,
  node: Node
) => {
  const nodeInputs: Record<string, Result> = {};
  if (
    node.kind === NodeKind.Native ||
    node.kind === NodeKind.Flow ||
    node.kind === NodeKind.Slot
  ) {
    Object.entries(node.staticInputs ?? {}).map(([key, value]) => {
      nodeInputs[key] = Ok(Some(value));
    });
  }
  context.flow.connections
    .filter(
      (x) =>
        !x.isStream && x.to.kind === PortKind.NodePort && x.to.nodeId === nodeId
    )
    .map((x) => {
      nodeInputs[x.to.key] = readDestPortWithHooks(context, flowStore, x.from);
    });
  return nodeInputs;
};

const readNodeInputsWithHooks = (
  context: Context,
  flowStore: FlowStore,
  nodeId: string,
  node: Node
) => {
  context.hooks?.onEvent?.({
    name: 'onWillReadNodeInputs',
    value: {
      flowPath: context.flowPath,
      nodeId: nodeId,
    },
  });
  const nodeInputs = readNodeInputs(context, flowStore, nodeId, node);
  context.hooks?.onEvent?.({
    name: 'onDidReadNodeInputs',
    value: {
      flowPath: context.flowPath,
      nodeId: nodeId,
      nodeInputs,
    },
  });
  const transformedNodeInputs = context.hooks?.transformNodeInputs?.(
    context.flowPath,
    nodeId,
    nodeInputs
  );
  return transformedNodeInputs ?? nodeInputs;
};

const readDestPort = (
  context: Context,
  flowStore: FlowStore,
  port: Port
): Result => {
  const from = context.flow.connections.find(
    (x) => !x.isStream && getPortHash(x.to) === getPortHash(port)
  )?.from;
  if (from) {
    return readSourcePort(context, flowStore, from);
  }
  return Ok(None());
};

const readDestPortWithHooks = (
  context: Context,
  flowStore: FlowStore,
  port: Port
): Result => {
  context.hooks?.onEvent?.({
    name: 'onWillReadData',
    value: {
      flowPath: context.flowPath,
      port,
    },
  });
  const result = readDestPort(context, flowStore, port);
  context.hooks?.onEvent?.({
    name: 'onDidReadData',
    value: {
      flowPath: context.flowPath,
      port,
      value: result,
    },
  });
  const transformedResult = context.hooks?.transformDataAfterRead?.(
    context.flowPath,
    port,
    result
  );
  return transformedResult ?? result;
};

const readSubFlowInputs = (
  context: Context,
  flowStore: FlowStore,
  nodeId: string,
  subFlowKey: string
) => {
  clearTempStates(flowStore);
  const subFlowInputs: Record<string, Result> = {};
  context.flow.connections
    .filter(
      (x) =>
        !x.isStream &&
        x.to.kind === PortKind.SubFlowPort &&
        x.to.nodeId === nodeId &&
        x.to.subFlowKey === subFlowKey
    )
    .map((x) => {
      subFlowInputs[x.to.key] = readDestPortWithHooks(context, flowStore, x.to);
    });
  return subFlowInputs;
};

const readSubFlowInputsWithHooks = (
  context: Context,
  flowStore: FlowStore,
  nodeId: string,
  subFlowKey: string
) => {
  context.hooks?.onEvent?.({
    name: 'onWillReadSubFlowInputs',
    value: {
      flowPath: context.flowPath,
      nodeId: nodeId,
      subFlowKey,
    },
  });
  const subFlowInputs = readSubFlowInputs(
    context,
    flowStore,
    nodeId,
    subFlowKey
  );
  context.hooks?.onEvent?.({
    name: 'onDidReadSubFlowInputs',
    value: {
      flowPath: context.flowPath,
      nodeId: nodeId,
      subFlowKey,
      subFlowInputs,
    },
  });
  return subFlowInputs;
};

const readSourcePort = (
  context: Context,
  flowStore: FlowStore,
  port: Port
): Result => {
  switch (port.kind) {
    case PortKind.FlowPort:
      return flowStore.inputs[port.key] ?? Ok(None());
    case PortKind.NodePort: {
      const dataNode = context.flow.dataNodes[port.nodeId];
      if (dataNode) {
        if (!flowStore.tempStates[port.nodeId]) {
          const nodeResult = runNodeWithHooks(
            attachProviders(context, flowStore, port.nodeId),
            port.nodeId,
            dataNode,
            readNodeInputsWithHooks(context, flowStore, port.nodeId, dataNode),
            createSubFlowFunctions(context, flowStore, port.nodeId, dataNode),
            (portKey, portValue) =>
              dispatch(
                context,
                flowStore,
                NodePort(portKey, port.nodeId),
                portValue
              ),
            () => {
              throw new Error(
                `Data node should not have listener ${port.nodeId}`
              );
            }
          );
          if (nodeResult.kind === ReturnResultKind.Deferred) {
            throw new Error('Data node should not return a promise');
          }
          flowStore.tempStates[port.nodeId] = nodeResult.value;
        }
        return flowStore.tempStates[port.nodeId];
      } else {
        const nodeState = flowStore.nodeStates[port.nodeId];
        if (!nodeState) {
          const seqNode =
            context.flow.kind === FlowKind.Process
              ? context.flow.sequenceSteps.find((x) => x.id === port.nodeId)
              : undefined;
          if (seqNode && seqNode.kind === SequenceStepKind.Node) {
            return Err({
              message: `Node ${port.nodeId} output was read before run`,
              nodeId: port.nodeId,
              flowPath: context.flowPath,
              node: seqNode.node,
            });
          }
          return Ok(None());
        }
        return nodeState;
      }
    }
    default: {
      throw new Error(`Unknown port ${getPortHash(port)}`);
    }
  }
};

const handleReceivedData = (
  context: Context,
  flowStore: FlowStore,
  destPort: Port,
  value: Result
) => {
  switch (destPort.kind) {
    case PortKind.FlowPort: {
      flowStore.emit(destPort.key, value);
      break;
    }
    case PortKind.NodePort: {
      const triggerNode =
        context.flow.kind === FlowKind.Process
          ? context.flow.triggerNodes[destPort.nodeId]
          : undefined;
      if (triggerNode) {
        clearTempStates(flowStore);
        const nodeInputs = {
          ...readNodeInputsWithHooks(
            context,
            flowStore,
            destPort.nodeId,
            triggerNode
          ),
          [ReservedPortKey.TriggerValue]: value,
        };
        const nodeResult = runNodeWithHooks(
          attachProviders(context, flowStore, destPort.nodeId),
          destPort.nodeId,
          triggerNode,
          nodeInputs,
          createSubFlowFunctions(
            context,
            flowStore,
            destPort.nodeId,
            triggerNode
          ),
          (portKey, portValue) =>
            dispatch(
              context,
              flowStore,
              NodePort(portKey, destPort.nodeId),
              portValue
            ),
          () => {
            throw new Error(
              `Trigger node should not have listener ${destPort.nodeId}`
            );
          }
        );
        if (nodeResult.kind === ReturnResultKind.Deferred) {
          throw new Error('Trigger node should not return a promise');
        }
        flowStore.nodeStates[destPort.nodeId] = nodeResult.value;
      } else {
        const listener = flowStore.nodeListeners[destPort.nodeId];
        if (listener) {
          listener(destPort.key, value, null);
          if (destPort.key === ReservedPortKey.Terminate) {
            delete flowStore.nodeStates[destPort.nodeId];
            delete flowStore.nodeListeners[destPort.nodeId];
          }
        }
      }
      break;
    }
    case PortKind.SubFlowPort: {
      const listener = flowStore.nodeListeners[destPort.nodeId];
      if (listener) {
        listener(destPort.key, value, destPort.subFlowKey);
      }
      break;
    }
    case PortKind.ProviderPort: {
      throw new Error('Stream in provider port is not allowed');
    }
  }
};

const dispatch = (
  context: Context,
  flowStore: FlowStore,
  sourcePort: Port,
  value: Result
) => {
  const destPorts = context.flow.connections
    .filter(
      (x) => x.isStream && getPortHash(x.from) === getPortHash(sourcePort)
    )
    .map((x) => x.to);
  context.hooks?.onEvent?.({
    name: 'onWillPushData',
    value: {
      flowPath: context.flowPath,
      port: sourcePort,
      value,
    },
  });

  value =
    context.hooks?.transformDataBeforePush?.(
      context.flowPath,
      sourcePort,
      value
    ) ?? value;

  for (const destPort of destPorts) {
    context.hooks?.onEvent?.({
      name: 'onDidPushData',
      value: {
        flowPath: context.flowPath,
        from: sourcePort,
        to: destPort,
        value,
      },
    });
    handleReceivedData(context, flowStore, destPort, value);
  }
};

const readFlowOutput = (context: Context, flowStore: FlowStore) => {
  if (context.flow.kind === FlowKind.Process) {
    clearTempStates(flowStore);
  }
  return readDestPortWithHooks(
    context,
    flowStore,
    FlowPort(ReservedPortKey.Return)
  );
};

const readFlowOutputWithHooks = (context: Context, flowStore: FlowStore) => {
  context.hooks?.onEvent?.({
    name: 'onWillReadFlowOutput',
    value: {
      flowPath: context.flowPath,
    },
  });
  const flowOutput = readFlowOutput(context, flowStore);
  context.hooks?.onEvent?.({
    name: 'onDidReadFlowOutput',
    value: {
      flowPath: context.flowPath,
      flowOutput,
    },
  });

  const transformedResult = context.hooks?.transformFlowOutput?.(
    context.flowPath,
    flowOutput
  );

  return transformedResult ?? flowOutput;
};

const attachProviders = (
  context: Context,
  flowStore: FlowStore,
  nodeId: string
): Context => {
  const providerKeys: string[] = [];
  for (const connection of context.flow.connections) {
    if (
      connection.to.kind === PortKind.ProviderPort &&
      connection.to.nodeId === nodeId
    ) {
      if (!providerKeys.includes(connection.to.providerKey)) {
        providerKeys.push(connection.to.providerKey);
      }
    }
    if (
      connection.from.kind === PortKind.ProviderPort &&
      connection.from.nodeId === nodeId
    ) {
      if (!providerKeys.includes(connection.from.providerKey)) {
        providerKeys.push(connection.from.providerKey);
      }
    }
  }
  providerKeys.map((providerKey) => {
    const value = readDestPortWithHooks(
      context,
      flowStore,
      ProviderPort(ReservedPortKey.ProviderValue, nodeId, providerKey)
    );
    context.providerFunctions[providerKey] = (listen) => {
      listen((portKey, portValue) => {
        dispatch(
          context,
          flowStore,
          ProviderPort(portKey, nodeId, providerKey),
          portValue
        );
      });
      return Immediate(value);
    };
  });
  return context;
};

const createSubFlowFunctions = (
  context: Context,
  flowStore: FlowStore,
  nodeId: string,
  node: Node
): Record<string, FlowFunction> => {
  if (node.kind === NodeKind.Slot || node.kind === NodeKind.Inject) {
    return {};
  }
  const subFlowFunctions: Record<string, FlowFunction> = {};
  for (const [subFlowKey, subFlow] of Object.entries(node.subFlows ?? {})) {
    const subFlowPath = [...context.flowPath, { nodeId: nodeId, subFlowKey }];
    const subFlowPathString = getFlowPathHash(subFlowPath);
    // memoize subflow function for better performance
    const cachedSubFlowFunction =
      context.cachedFlowFunctions[subFlowPathString];
    if (cachedSubFlowFunction) {
      subFlowFunctions[subFlowKey] = cachedSubFlowFunction;
      continue;
    }
    const customStreamOutputKeys = context.flow.connections
      .filter(
        (x) =>
          x.isStream &&
          x.from.kind === PortKind.SubFlowPort &&
          x.from.nodeId === nodeId &&
          x.from.subFlowKey === subFlowKey
      )
      .map((x) => x.from.key);

    const subFlowFunction: FlowFunction = (
      builtInInputs,
      emitToNode,
      listenFromNode
    ) => {
      const subFlowInputs = {
        ...builtInInputs,
        ...readSubFlowInputsWithHooks(context, flowStore, nodeId, subFlowKey),
      };
      const newContext: Context = {
        ...context,
        flowPath: subFlowPath,
        flow: subFlow,
      };

      const subFlowFunction = createFlowFunction(newContext);
      return subFlowFunction(
        subFlowInputs,
        (key, value) => {
          if (customStreamOutputKeys.includes(key)) {
            dispatch(
              context,
              flowStore,
              SubFlowPort(key, nodeId, subFlowKey),
              value
            );
          } else {
            emitToNode(key, value);
          }
        },
        listenFromNode
      );
    };
    subFlowFunctions[subFlowKey] = subFlowFunction;
    context.cachedFlowFunctions[subFlowPathString] = subFlowFunction;
  }
  return subFlowFunctions;
};

const runSequenceStep = (
  context: Context,
  flowStore: FlowStore,
  sequenceStep: SequenceStep
): SequenceStepResult => {
  if (context.flow.kind != FlowKind.Process) {
    throw new Error('Only process flow can run sequence nodes');
  }
  clearTempStates(flowStore);
  if (sequenceStep.kind === SequenceStepKind.Jump) {
    const conditionResult = readDestPortWithHooks(
      context,
      flowStore,
      NodePort(ReservedPortKey.JumpCondition, sequenceStep.id)
    );
    switch (conditionResult.kind) {
      case ResultKind.Error: {
        return SeqNext(Immediate(conditionResult));
      }
      case ResultKind.Ok: {
        if (conditionResult.value) {
          const seqNodeIds = context.flow.sequenceSteps.map((x) => x.id);
          const jumpToIndex = sequenceStep.target
            ? seqNodeIds.indexOf(sequenceStep.target)
            : seqNodeIds.length;
          return SeqJump(jumpToIndex);
        } else {
          return SeqNext(Immediate(Ok(None())));
        }
      }
    }
  } else {
    const nodeInputs = readNodeInputsWithHooks(
      context,
      flowStore,
      sequenceStep.id,
      sequenceStep.node
    );
    const result = runNodeWithHooks(
      attachProviders(context, flowStore, sequenceStep.id),
      sequenceStep.id,
      sequenceStep.node,
      nodeInputs,
      createSubFlowFunctions(
        context,
        flowStore,
        sequenceStep.id,
        sequenceStep.node
      ),
      (portKey, portValue) =>
        dispatch(
          context,
          flowStore,
          NodePort(portKey, sequenceStep.id),
          portValue
        ),
      (callback) => (flowStore.nodeListeners[sequenceStep.id] = callback)
    );
    return SeqNext(result);
  }
};

const runSequenceSteps = (
  context: Context,
  flowStore: FlowStore,
  startIndex: number
): ReturnResult => {
  if (context.flow.kind != FlowKind.Process) {
    throw new Error('Only process flow can run sequence nodes');
  }
  const sequentialFlow = context.flow;
  let index = startIndex;
  while (index < sequentialFlow.sequenceSteps.length) {
    const step = sequentialFlow.sequenceSteps[index];
    const seqResult = runSequenceStep(context, flowStore, step);
    if (seqResult.kind === SequenceStepResultKind.Jump) {
      const toIndex = seqResult.toIndex;
      context.hooks?.onEvent?.({
        name: 'onJump',
        value: {
          flowPath: context.flowPath,
          fromNodeId: step.id,
          toIndex,
        },
      });
      if (toIndex < index) {
        sequentialFlow.sequenceSteps.slice(toIndex, index).map((step) => {
          delete flowStore.nodeStates[step.id];
          delete flowStore.nodeListeners[step.id];
        });
      }
      index = toIndex;
    } else {
      const result = seqResult.value;
      if (step.kind === SequenceStepKind.Node && step.await) {
        if (result.kind !== ReturnResultKind.Deferred) {
          throw new Error('Await node should return a promise');
        }
        context.hooks?.onEvent?.({
          name: 'onWillAwaitNode',
          value: {
            flowPath: context.flowPath,
            nodeId: step.id,
          },
        });
        return Deferred(
          new Promise((resolve) => {
            result.promise.then((awaitedResult) => {
              flowStore.nodeStates[step.id] = awaitedResult;
              if (awaitedResult.kind === ResultKind.Error) {
                resolve(awaitedResult);
              } else {
                const nextResult = runSequenceSteps(
                  context,
                  flowStore,
                  index + 1
                );
                if (nextResult.kind === ReturnResultKind.Deferred) {
                  nextResult.promise.then((x) => resolve(x));
                } else {
                  resolve(nextResult.value);
                }
              }
            });
          })
        );
      } else {
        if (result.kind === ReturnResultKind.Deferred) {
          result.promise.then((res) => {
            dispatch(
              context,
              flowStore,
              NodePort(ReservedPortKey.Resolve, step.id),
              res
            );
          });
        } else {
          flowStore.nodeStates[step.id] = result.value;
          if (result.value.kind === ResultKind.Error) {
            return Immediate(result.value);
          }
        }
        index += 1;
      }
    }
  }
  return Immediate(readFlowOutputWithHooks(context, flowStore));
};

const runObjectNodes = (context: Context, flowStore: FlowStore) => {
  if (context.flow.kind !== FlowKind.System) {
    throw new Error('Only system flow can run object nodes');
  }

  for (const [nodeId, objectNode] of Object.entries(context.flow.objectNodes)) {
    const nodeInputs = readNodeInputsWithHooks(
      context,
      flowStore,
      nodeId,
      objectNode
    );
    const result = runNodeWithHooks(
      attachProviders(context, flowStore, nodeId),
      nodeId,
      objectNode,
      nodeInputs,
      createSubFlowFunctions(context, flowStore, nodeId, objectNode),
      (portKey, value) =>
        dispatch(context, flowStore, NodePort(portKey, nodeId), value),
      (callback) => (flowStore.nodeListeners[nodeId] = callback)
    );
    if (result.kind === ReturnResultKind.Deferred) {
      result.promise.then((awaitedResult) => {
        dispatch(
          context,
          flowStore,
          NodePort(ReservedPortKey.Resolve, nodeId),
          awaitedResult
        );
      });
    } else {
      dispatch(
        context,
        flowStore,
        NodePort(ReservedPortKey.Resolve, nodeId),
        result.value
      );
    }
  }
  return Ok(None());
};

export const createFlowFunction = (context: Context): FlowFunction => {
  const flow = context.flow;
  return (inputs, emit, listen) => {
    context.hooks?.onEvent?.({
      name: 'onWillRunFlow',
      value: {
        flowPath: context.flowPath,
        flowInputs: inputs,
      },
    });

    // hooks transformFlowInputs
    const transformedInputs = context.hooks?.transformFlowInputs?.(
      context.flowPath,
      inputs
    );
    if (transformedInputs) {
      inputs = transformedInputs;
    }

    const overrideFlowRunResult = context.hooks?.overrideFlowRun?.(
      context.flowPath,
      inputs,
      emit,
      listen
    );
    let result: ReturnResult;
    if (overrideFlowRunResult) {
      result = overrideFlowRunResult;
    } else {
      // run flow
      const flowStore: FlowStore = {
        inputs,
        emit: emit,
        nodeStates: {},
        nodeListeners: {},
        tempStates: {},
      };

      if (flow.kind === FlowKind.System) {
        listen((portKey, val) => {
          // broadcast start and terminate events
          if (portKey === ReservedPortKey.Start) {
            context.hooks?.onEvent?.({
              name: 'onStartSystemFlow',
              value: {
                flowPath: context.flowPath,
                data: val,
              },
            });
            Object.entries(flowStore.nodeListeners).map(([nodeId, handle]) => {
              context.hooks?.onEvent?.({
                name: 'onStartObjectNode',
                value: {
                  flowPath: context.flowPath,
                  nodeId: nodeId,
                  data: val,
                },
              });
              handle(ReservedPortKey.Start, val, null);
            });
          } else if (portKey === ReservedPortKey.Terminate) {
            context.hooks?.onEvent?.({
              name: 'onTerminateSystemFlow',
              value: {
                flowPath: context.flowPath,
                data: val,
              },
            });
            Object.entries(flowStore.nodeListeners).map(([nodeId, handle]) => {
              context.hooks?.onEvent?.({
                name: 'onStartObjectNode',
                value: {
                  flowPath: context.flowPath,
                  nodeId: nodeId,
                  data: val,
                },
              });
              handle(ReservedPortKey.Terminate, val, null);
            });
            Object.keys(flowStore.nodeListeners).map(
              (key) => delete flowStore.nodeListeners[key]
            );
          } else {
            dispatch(context, flowStore, FlowPort(portKey), val);
          }
        });
        result = Immediate(runObjectNodes(context, flowStore));
      } else {
        listen((portKey, val) => {
          dispatch(context, flowStore, FlowPort(portKey), val);
        });
        result = runSequenceSteps(context, flowStore, 0);
      }
    }
    if (result.kind === ReturnResultKind.Deferred) {
      return Deferred(
        new Promise((resolve) => {
          result.promise.then((awaitedResult) => {
            context.hooks?.onEvent?.({
              name: 'onDidRunFlow',
              value: {
                flowPath: context.flowPath,
                flowOutput: awaitedResult,
              },
            });
            resolve(awaitedResult);
          });
        })
      );
    } else {
      context.hooks?.onEvent?.({
        name: 'onDidRunFlow',
        value: {
          flowPath: context.flowPath,
          flowOutput: result.value,
        },
      });
      return result;
    }
  };
};
