import { FlowRunnerPlugin, Hooks, HooksEvent, Result } from '../types';

export const getTransformNodeOutputHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['transformNodeOutput'] =>
  (flowPath, nodeId, nodeOutput) => {
    let transformedOutput: Result | undefined = undefined;
    for (const plugin of plugins) {
      if (plugin.hooks?.transformNodeOutput) {
        const res = plugin.hooks.transformNodeOutput(
          flowPath,
          nodeId,
          transformedOutput ?? nodeOutput
        );
        if (res) {
          transformedOutput = res;
          onEvent({
            name: 'onDidTransformNodeOutput',
            value: {
              flowPath,
              nodeId,
              from: nodeOutput,
              to: transformedOutput,
              plugin: plugin.name,
            },
          });
        }
      }
    }
    return transformedOutput;
  };
