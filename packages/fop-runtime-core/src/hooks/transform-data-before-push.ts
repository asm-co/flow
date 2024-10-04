import { FlowRunnerPlugin, Hooks, HooksEvent, Result } from '../types';

export const getTransformDataBeforePushHook =
  (
    plugins: FlowRunnerPlugin[],
    onEvent: (event: HooksEvent) => void
  ): Hooks['transformDataBeforePush'] =>
  (flowPath, port, value) => {
    let transformedValue: Result | undefined = undefined;
    for (const plugin of plugins) {
      if (plugin.hooks?.transformDataBeforePush) {
        const res = plugin.hooks.transformDataBeforePush(
          flowPath,
          port,
          transformedValue ?? value
        );
        if (res) {
          transformedValue = res;
          onEvent({
            name: 'onDidTransformDataBeforePush',
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
