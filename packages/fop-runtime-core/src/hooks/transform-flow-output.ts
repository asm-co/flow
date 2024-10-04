import { FlowRunnerPlugin, Hooks, HooksEvent, Result } from '../types';

export const getTransformFlowOutputHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['transformFlowOutput'] =>
  (flowPath, flowOutput) => {
    let transformedOutput: Result | undefined = undefined;
    for (const plugin of plugins) {
      if (plugin.hooks?.transformFlowOutput) {
        const res = plugin.hooks.transformFlowOutput(
          flowPath,
          transformedOutput ?? flowOutput
        );
        if (res) {
          transformedOutput = res;
          onEvent({
            name: 'onDidTransformFlowOutput',
            value: {
              flowPath,
              from: flowOutput,
              to: transformedOutput,
              plugin: plugin.name,
            },
          });
        }
      }
    }
    return transformedOutput;
  };
