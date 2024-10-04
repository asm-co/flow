import { FlowRunnerPlugin, Hooks, HooksEvent, Result } from '../types';

export const getTransformFlowInputsHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['transformFlowInputs'] =>
  (flowPath, flowInputs) => {
    let transformedInputs: Record<string, Result> | undefined = undefined;
    for (const plugin of plugins) {
      if (plugin.hooks?.transformFlowInputs) {
        const res = plugin.hooks.transformFlowInputs(
          flowPath,
          transformedInputs ?? flowInputs
        );
        if (res) {
          transformedInputs = res;
          onEvent({
            name: 'onDidTransformFlowInputs',
            value: {
              flowPath,
              from: flowInputs,
              to: transformedInputs,
              plugin: plugin.name,
            },
          });
        }
      }
    }
    return transformedInputs;
  };
