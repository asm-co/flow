import {
  FlowRunnerPlugin,
  Hooks,
  HooksEvent,
  ReturnResultKind,
} from '../types';
import { Deferred } from '../utils';

export const getOverrideFlowRunHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['overrideFlowRun'] =>
  (flowPath, flowInputs, emit, listen) => {
    for (const plugin of plugins) {
      if (plugin.hooks?.overrideFlowRun) {
        const res = plugin.hooks.overrideFlowRun(
          flowPath,
          flowInputs,
          emit,
          listen
        );
        if (res) {
          if (res.kind === ReturnResultKind.Deferred) {
            return Deferred(
              new Promise((resolve) => {
                res.promise.then((awaitedResult) => {
                  onEvent({
                    name: 'onDidOverrideFlowRun',
                    value: {
                      flowPath,
                      flowInputs,
                      flowOutput: awaitedResult,
                      plugin: plugin.name,
                    },
                  });
                  resolve(awaitedResult);
                });
              })
            );
          } else {
            onEvent({
              name: 'onDidOverrideFlowRun',
              value: {
                flowPath,
                flowInputs,
                flowOutput: res.value,
                plugin: plugin.name,
              },
            });
            return res;
          }
        }
      }
    }
  };
