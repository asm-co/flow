import { FlowRunnerPlugin, Hooks, HooksEvent } from '../types';
import { getOverrideFlowRunHook } from './override-flow-run';
import { getOverrideNodeRunHook } from './override-node-run';
import { getTransformFlowInputsHook } from './transform-flow-inputs';
import { getTransformFlowOutputHook } from './transform-flow-output';
import { getTransformNodeInputsHook } from './transform-node-inputs';
import { getTransformNodeOutputHook } from './transform-node-output';
import { getTransformDataAfterReadHook } from './transform-data-after-read';
import { getTransformDataBeforePushHook } from './transform-data-before-push';

export const createHooks = (plugins: FlowRunnerPlugin[]): Hooks => {
  const onEvent = (event: HooksEvent) => {
    const timestamp = new Date().valueOf();
    plugins.map((x) => x.hooks?.onEvent?.({ ...event, timestamp }));
  };
  return {
    onEvent,
    overrideFlowRun: getOverrideFlowRunHook(plugins, onEvent),
    overrideNodeRun: getOverrideNodeRunHook(plugins, onEvent),
    transformFlowInputs: getTransformFlowInputsHook(plugins, onEvent),
    transformFlowOutput: getTransformFlowOutputHook(plugins, onEvent),
    transformNodeInputs: getTransformNodeInputsHook(plugins, onEvent),
    transformNodeOutput: getTransformNodeOutputHook(plugins, onEvent),
    transformDataAfterRead: getTransformDataAfterReadHook(plugins, onEvent),
    transformDataBeforePush: getTransformDataBeforePushHook(plugins, onEvent),
  };
};
