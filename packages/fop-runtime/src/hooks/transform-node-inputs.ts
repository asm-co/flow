import { FlowRunnerPlugin, Hooks, HooksEvent, Result } from '../types';

export const getTransformNodeInputsHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['transformNodeInputs'] =>
  (flowPath, nodeId, nodeInputs) => {
    let transformedInputs: Record<string, Result> | undefined = undefined;
    for (const plugin of plugins) {
      if (plugin.hooks?.transformNodeInputs) {
        const res = plugin.hooks.transformNodeInputs(
          flowPath,
          nodeId,
          transformedInputs ?? nodeInputs
        );
        if (res) {
          transformedInputs = res;
          onEvent({
            name: 'onDidTransformNodeInputs',
            value: {
              flowPath,
              nodeId,
              from: nodeInputs,
              to: transformedInputs,
              plugin: plugin.name,
            },
          });
        }
      }
    }
    return transformedInputs;
  };
