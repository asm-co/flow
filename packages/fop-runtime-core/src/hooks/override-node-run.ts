import {
  FlowRunnerPlugin,
  Hooks,
  HooksEvent,
  ReturnResultKind,
} from '../types';
import { Deferred } from '../utils';

export const getOverrideNodeRunHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['overrideNodeRun'] =>
  (flowPath, nodeId, node, nodeInputs, readSubFlowInputs, emit, listen) => {
    for (const plugin of plugins) {
      if (plugin.hooks?.overrideNodeRun) {
        const res = plugin.hooks.overrideNodeRun(
          flowPath,
          nodeId,
          node,
          nodeInputs,
          readSubFlowInputs,
          emit,
          listen
        );
        if (res) {
          if (res.kind === ReturnResultKind.Deferred) {
            return Deferred(
              new Promise((resolve) => {
                res.promise.then((awaitedResult) => {
                  onEvent({
                    name: 'onDidOverrideNodeRun',
                    value: {
                      flowPath,
                      nodeId: nodeId,
                      nodeInputs,
                      nodeOutput: awaitedResult,
                      plugin: plugin.name,
                    },
                  });
                  resolve(awaitedResult);
                });
              })
            );
          } else {
            onEvent({
              name: 'onDidOverrideNodeRun',
              value: {
                flowPath,
                nodeId: nodeId,
                nodeInputs,
                nodeOutput: res.value,
                plugin: plugin.name,
              },
            });
            return res;
          }
        }
      }
    }
  };
