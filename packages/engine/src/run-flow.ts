import type {
  Context,
  Either,
  MaybePromise,
  NodeOutputs,
  PortValue,
  Result,
  RuntimeFlow,
  RuntimePort,
  SubFlowState,
} from './types';
import {
  AsyncMode,
  FlowListener,
  Listener,
  NodeType,
  ReservedNodeResourceId,
  ReservedPortKey,
} from './types';
import { isError, isNothing, isOk, isPromise, Nothing, Ok, Err } from './utils';
import { runNode } from './run-node';

export const runFlow = (
  context: Context,
  flow: RuntimeFlow,
  readFlowInput: (
    key: string,
    scopedExecutionIds: string[]
  ) => Result<PortValue>,
  tx: (key: string, value: Either<PortValue>) => void,
  onRx: (listener: FlowListener<Either<PortValue>>) => void
): MaybePromise<Either<NodeOutputs>> => {
  const nodeListeners: Record<string, Listener<Either<PortValue>>> = {};
  const executionStateStore: Map<string, Either<NodeOutputs>> = new Map();
  let currentExecutionId = '';
  const tempStore = new Map<string, Result<PortValue>>(); // <portId,portValue> data nodes and flow input ports
  const bufferStore: Map<string, Result<PortValue>> = new Map(); // <portId,portValue> stream nodes
  const subFlowStateStore: Map<string, SubFlowState> = new Map();

  onRx({
    ready: () => {
      if (flow.executionPath.length > 0) {
        throw new Error(
          'Current flow is a procedural flow, should not receive ready signal'
        );
      }
      for (const listener of Object.values(nodeListeners)) {
        listener.ready();
      }
    },
    next: (portKey, val) => {
      const port = flow.inputPorts.find((x) => x.key === portKey && x.isStream);
      if (port) {
        dispatch(port.id, val);
      }
    },
    complete: () => {
      if (flow.executionPath.length > 0) {
        console.warn(
          'Current flow is a procedural flow, should not receive complete signal'
        );
        // throw new Error(
        //   'Current flow is a procedural flow, should not receive complete signal'
        // );
      }
      for (const listener of Object.values(nodeListeners)) {
        listener.complete();
      }
    },
  });

  const getSubFlowState = (subFlowId: string) =>
    subFlowStateStore.get(subFlowId) || {
      totalRuns: 0,
      registerStates: {},
    };

  const setSubFlowState = (subFlowId: string, subFlowState: SubFlowState) =>
    subFlowStateStore.set(subFlowId, subFlowState);

  const dispatch = (sourcePortId: string, value: Either<PortValue>) => {
    const destPortIds = flow.connections
      .filter((x) => x.from === sourcePortId)
      .map((x) => x.to);
    for (const destPortId of destPortIds) {
      // console.log('dispatch', destPortId, value);
      bufferStore.set(destPortId, value);
      const destPort = flow.ports[destPortId];
      if (destPort.nodeId) {
        const nodeId = destPort.nodeId;
        const destNode = flow.nodes[nodeId];
        if (destNode.type === NodeType.Passive && !destPort.subFlowId) {
          // console.log('run passive execution node', nodeId, value);
          const execPath = [Math.random().toString()];
          const res = runNode(
            context,
            destNode,
            (port, scopedExecutionIds) => {
              if (port.key === ReservedPortKey.Params) {
                return value;
              }
              return readDestPort(port, execPath.concat(scopedExecutionIds));
            },
            (port, value) => dispatch(port.id, value),
            (callback) => (nodeListeners[destNode.id] = callback),
            getSubFlowState,
            setSubFlowState
          );
          if (isPromise(res)) {
            throw new Error(
              'Passive execution node should not return a promise'
            );
          }
          executionStateStore.set(nodeId, res);
          console.log(
            '[Node Result] passive execution node result',
            nodeId,
            res
          );
        } else {
          if (nodeListeners[nodeId]) {
            nodeListeners[nodeId].next(destPort.id, value, destPort.subFlowId);
          }
        }
      } else {
        tx(destPort.key, value);
      }
    }
  };

  const readSourcePort = (
    port: RuntimePort,
    executionIds: string[]
  ): Result<PortValue> => {
    const portHash = port.id;
    const executionId = executionIds.join('/'); // simple implementation to compare
    if (currentExecutionId !== executionId) {
      // console.log('clear temp store', currentExecutionId, executionId);
      currentExecutionId = executionId;
      tempStore.clear();
    }
    if (!port.nodeId) {
      // flow input port
      if (!tempStore.has(portHash)) {
        const res = readFlowInput(port.key, executionIds);
        tempStore.set(portHash, res);
        return res;
      }
      return tempStore.get(portHash)!;
    } else {
      // node output port
      const dataNode =
        flow.nodes[port.nodeId].type === NodeType.Data
          ? flow.nodes[port.nodeId]
          : undefined;
      if (dataNode) {
        // compute if no cached data
        if (!tempStore.has(portHash)) {
          // console.log('compute if no cached data', portHash);
          const nodeResult = runNode(
            context,
            dataNode,
            (port) => readDestPort(port, executionIds),
            (port, value) => dispatch(port.id, value),
            (callback) => (nodeListeners[dataNode.id] = callback),
            getSubFlowState,
            setSubFlowState
          );
          if (isPromise(nodeResult)) {
            throw new Error('Sync node should not return a promise');
          }
          console.log(
            '[Node Result] data node result',
            port.nodeId,
            nodeResult
          );
          dataNode.outputPorts
            .filter((x) => !x.isStream)
            .map((outputPort) => {
              // console.log('update data cache', outputPort);
              const outputPortHash = outputPort.id;
              if (isError(nodeResult) || isNothing(nodeResult)) {
                tempStore.set(outputPortHash, nodeResult);
              } else {
                const val = Object.keys(nodeResult.value).includes(
                  outputPort.key
                )
                  ? Ok(nodeResult.value[outputPort.key])
                  : Nothing();
                tempStore.set(outputPortHash, val);
              }
            });
        }
        return tempStore.get(portHash)!;
      } else {
        // execution node
        const execNodeResult = executionStateStore.get(port.nodeId);
        if (!execNodeResult) {
          if (flow.executionPath.includes(port.nodeId)) {
            return Err([
              {
                message: `Execution node ${port.nodeId} output was read before run`,
              },
            ]);
          }
          return Nothing();
          // throw new Error(`Execution node ${port.nodeId} is not found`);
        }
        if (isError(execNodeResult)) {
          return execNodeResult;
        }
        return Object.keys(execNodeResult.value).includes(port.key)
          ? Ok(execNodeResult.value[port.key])
          : Nothing();
      }
    }
  };

  const readDestPort = (
    port: RuntimePort,
    executionIds: string[]
  ): Result<PortValue> => {
    if (port.isStream) {
      return bufferStore.get(port.id) ?? Nothing();
    }
    const fromPortId = flow.connections.find((x) => x.to === port.id)?.from;
    if (fromPortId) {
      const fromPort = flow.ports[fromPortId];
      const result = readSourcePort(fromPort, executionIds);
      console.log('[Port Read]', fromPortId, result);
      return result;
    }
    return Nothing();
  };

  // setup nodes
  for (const execId of Object.keys(flow.nodes).filter(
    (x) => flow.nodes[x].type === NodeType.Setup
  )) {
    const execNode = flow.nodes[execId];
    const nodeResult = runNode(
      context,
      execNode,
      (port) => readDestPort(port, []),
      (port, value) => dispatch(port.id, value),
      (callback) => (nodeListeners[execNode.id] = callback),
      getSubFlowState,
      setSubFlowState
    );
    if (isPromise(nodeResult)) {
      throw new Error('Setup node should not return a promise');
    }

    if (isError(nodeResult)) {
      return nodeResult;
    }
    executionStateStore.set(execId, nodeResult);
    console.log('[Node Result] set  node result', execId, nodeResult);
  }

  // // stream nodes
  // for (const streamNode of Object.values(flow.nodes).filter(
  //   (x) => x.type === NodeType.Stream
  // )) {
  //   const nodeResult = runNode(
  //     context,
  //     streamNode,
  //     (port, scopedExecutionIds) => readDestPort(port, scopedExecutionIds),
  //     (port, value) => dispatch(port.id, value),
  //     (callback) => (nodeListeners[streamNode.id] = callback),
  //     getSubFlowState,
  //     setSubFlowState
  //   );
  //   if (isPromise(nodeResult)) {
  //     throw new Error('Stream node should not return a promise');
  //   }

  //   // 1.3 save registers
  //   if (isError(nodeResult)) {
  //     return nodeResult;
  //   }
  // }

  // only send ready signals when current flow is a procedural flow
  if (flow.executionPath.length > 0) {
    for (const listener of Object.values(nodeListeners)) {
      listener.ready();
    }
  }

  const runExecNode = (execId: string): MaybePromise<Either<NodeOutputs>> => {
    const execNode = flow.nodes[execId];
    const execPath = [execId];
    let nodeResult: MaybePromise<Either<NodeOutputs>> | undefined = undefined;
    // if (execNode.resourceId === ReservedNodeResourceId.ReturnIf) {
    //   const conditionPort = execNode.inputPorts[0];
    //   const condition = readDestPort(conditionPort, execPath);
    //   console.log("return if's condition", condition);
    //   if (isError(condition)) {
    //     return condition;
    //   }
    //   if (isOk(condition) && condition.value) {
    //     const outputs: Record<string, PortValue> = {};
    //     for (const inputPort of execNode.inputPorts.slice(1)) {
    //       if (
    //         flow.outputPorts.map((x) => x.key).includes(inputPort.key) // do not return state registers
    //       ) {
    //         const val = readDestPort(inputPort, execPath);
    //         if (isError(val)) {
    //           return val;
    //         }
    //         if (isOk(val)) {
    //           outputs[inputPort.key] = val.value;
    //         }
    //       }
    //     }
    //     return Ok(outputs);
    //   }
    //   nodeResult = Ok({ outputs: {}, subFlowOutputs: {} });
    // }

    // 1.1 read shift register
    // const stateRegisterData: Record<string, PortValue> = {};
    // for (const portKey of execNode.registerKeys) {
    //   const port = execNode.inputPorts.find(
    //     (x) => x.key === portKey && !x.subFlowId
    //   )!;
    //   const res = readDestPort(port, execPath);
    //   if (isError(res)) {
    //     return res;
    //   }
    //   if (isOk(res)) {
    //     stateRegisterData[port.key] = res.value;
    //   }
    // }

    if (!nodeResult) {
      nodeResult = runNode(
        context,
        execNode,
        (port, scopedExecutionIds) =>
          readDestPort(port, execPath.concat(scopedExecutionIds)),
        (port, value) => dispatch(port.id, value),
        (callback) => (nodeListeners[execNode.id] = callback),
        getSubFlowState,
        setSubFlowState
      );
    }
    if (execNode.asyncMode === AsyncMode.Promise && isPromise(nodeResult)) {
      nodeResult.then((awaitedResult) => {
        const resolvePort = execNode.outputPorts.find(
          (x) => x.key === ReservedPortKey.Resolve
        )!;
        dispatch(resolvePort.id, awaitedResult);
        if (isError(awaitedResult)) {
          execNode.outputPorts
            .filter((x) => execNode.dataOutputPortKeys.includes(x.key))
            .map((port) => {
              dispatch(port.id, awaitedResult);
            });
        } else {
          execNode.outputPorts
            .filter((x) => execNode.dataOutputPortKeys.includes(x.key))
            .map((port) => {
              dispatch(port.id, Ok(awaitedResult.value[port.key]));
            });
        }
      });
      executionStateStore.set(execId, Ok({}));
      return Ok({});
    } else if (isPromise(nodeResult)) {
      return new Promise((resolve) => {
        (nodeResult as Promise<Either<NodeOutputs>>).then((awaitedResult) => {
          if (isError(awaitedResult)) {
            resolve(awaitedResult);
          } else {
            const execState = Ok({
              ...awaitedResult.value,
              // ...stateRegisterData,
            });
            executionStateStore.set(execId, execState);
            resolve(execState);
          }
        });
      });
    }
    if (isError(nodeResult)) {
      return nodeResult;
    }
    // 1.3 save registers
    const execState = Ok({
      ...nodeResult.value,
      // ...stateRegisterData,
    });
    executionStateStore.set(execId, execState);
    return execState;
  };

  const getFlowOutputs = () => {
    // pull flow outputs
    const flowOutputs: Record<string, PortValue> = {};
    for (const port of flow.outputPorts.filter((x) => !x.isStream)) {
      const res = readDestPort(port, []);
      if (isError(res)) {
        return res;
      }
      if (isOk(res)) {
        flowOutputs[port.key] = res.value;
      }
    }
    // return
    return Ok(flowOutputs);
  };

  const isAsync = Object.values(flow.nodes).some(
    (x) => x.asyncMode === AsyncMode.Await
  );

  if (isAsync) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      let index = 0;
      while (index < flow.executionPath.length) {
        const execId = flow.executionPath[index];
        if (flow.nodes[execId].resourceId === ReservedNodeResourceId.ReturnIf) {
          const execNode = flow.nodes[execId];
          const conditionPort = execNode.inputPorts[0];
          const condition = readDestPort(conditionPort, [execId]);
          console.log("return if's condition", condition);
          if (isError(condition)) {
            resolve(condition);
            return;
          }
          if (isOk(condition) && condition.value) {
            const outputs: Record<string, PortValue> = {};
            for (const inputPort of execNode.inputPorts.slice(1)) {
              if (
                flow.outputPorts.map((x) => x.key).includes(inputPort.key) // do not return state registers
              ) {
                const val = readDestPort(inputPort, [execId]);
                if (isError(val)) {
                  resolve(val);
                  return;
                }
                if (isOk(val)) {
                  outputs[inputPort.key] = val.value;
                }
              }
            }
            resolve(Ok(outputs));
            return;
          }
          index = index + 1;
        } else if (
          flow.nodes[execId].resourceId === ReservedNodeResourceId.JumpIf
        ) {
          const execNode = flow.nodes[execId];
          const conditionPort = execNode.inputPorts[0];
          const condition = readDestPort(conditionPort, [execId]);
          if (isError(condition)) {
            resolve(condition);
          }
          if (isOk(condition) && condition.value) {
            index = flow.executionPath.indexOf(flow.jumpMap[execId]);
            for (let i = index; i < flow.executionPath.length; i = i + 1) {
              executionStateStore.delete(flow.executionPath[i]);
            }
          } else {
            index = index + 1;
          }
        } else {
          const nodeResult = await runExecNode(execId);
          console.log(
            '[Node Result] execution node result',
            execId,
            nodeResult
          );
          if (isError(nodeResult)) {
            resolve(nodeResult);
          }
          index = index + 1;
        }
      }
      // only send complete signals when current flow is a procedural flow
      if (flow.executionPath.length > 0) {
        for (const listener of Object.values(nodeListeners)) {
          listener.complete();
        }
      }
      resolve(getFlowOutputs());
    });
  } else {
    let index = 0;
    while (index < flow.executionPath.length) {
      // for (const execId of flow.executionPath) {
      const execId = flow.executionPath[index];
      if (flow.nodes[execId].resourceId === ReservedNodeResourceId.ReturnIf) {
        const execNode = flow.nodes[execId];
        const conditionPort = execNode.inputPorts[0];
        const condition = readDestPort(conditionPort, [execId]);
        console.log("return if's condition", condition);
        if (isError(condition)) {
          return condition;
        }
        if (isOk(condition) && condition.value) {
          const outputs: Record<string, PortValue> = {};
          for (const inputPort of execNode.inputPorts.slice(1)) {
            if (
              flow.outputPorts.map((x) => x.key).includes(inputPort.key) // do not return state registers
            ) {
              const val = readDestPort(inputPort, [execId]);
              if (isError(val)) {
                return val;
              }
              if (isOk(val)) {
                outputs[inputPort.key] = val.value;
              }
            }
          }
          return Ok(outputs);
        }
        index = index + 1;
      } else if (
        flow.nodes[execId].resourceId === ReservedNodeResourceId.JumpIf
      ) {
        const execNode = flow.nodes[execId];
        const conditionPort = execNode.inputPorts[0];
        const condition = readDestPort(conditionPort, [execId]);
        if (isError(condition)) {
          return condition;
        }
        if (isOk(condition) && condition.value) {
          index = flow.executionPath.indexOf(flow.jumpMap[execId]);
        } else {
          index = index + 1;
        }
      } else {
        const nodeResult = runExecNode(execId);
        if (isPromise(nodeResult)) {
          throw new Error('Sync node should not return a promise');
        }
        console.log('[Node Result] execution node result', execId, nodeResult);
        if (isError(nodeResult)) {
          return nodeResult;
        }
        index = index + 1;
      }
    }
    // only send complete signals when current flow is a procedural flow
    if (flow.executionPath.length > 0) {
      for (const listener of Object.values(nodeListeners)) {
        listener.complete();
      }
    }
    return getFlowOutputs();
  }
};
