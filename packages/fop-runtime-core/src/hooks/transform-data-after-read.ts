import { FlowRunnerPlugin, Hooks, HooksEvent, Result } from '../types';

export const getTransformDataAfterReadHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['transformDataAfterRead'] =>
  (flowPath, port, value) => {
    let transformedValue: Result | undefined = undefined;
    for (const plugin of plugins) {
      if (plugin.hooks?.transformDataAfterRead) {
        const res = plugin.hooks.transformDataAfterRead(
          flowPath,
          port,
          transformedValue ?? value
        );
        if (res) {
          transformedValue = res;
          onEvent({
            name: 'onDidTransformDataAfterRead',
            value: {
              flowPath,
              port,
              from: value,
              to: transformedValue,
              plugin: plugin.name,
            },
          });
        }
      }
    }
    return transformedValue;
  };
