import {
  JsNodeComputeGenerator,
  PortValue,
  RuntimeNodeImports,
} from '../../types';
import {
  isPromise,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const getReactRenderCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) =>
  simpleNodeNativeCompute2NodeNativeCompute(
    ({
      node,
      inputs,
      subFlowGroupFunctions,
      onRx,
      readStreamInputSnapshot,
    }) => {
      const root = inputs['root'] as any;
      const createElement = imports.createElement;
      const useSyncExternalStore = imports.useSyncExternalStore;
      const subFlowInfo = Object.values(node.subFlowGroups)[0][0];
      const subFlowFunc = Object.values(subFlowGroupFunctions)[0][0];

      const bufferDispatchMap: Record<string, (val: PortValue) => void> = {};

      onRx({
        next: (portKey, value, subFlowId) => {
          if (subFlowId && subFlowInfo.bufferInputKeys?.includes(portKey)) {
            bufferDispatchMap[portKey](value);
          }
        },
      });

      const renderFunc = () => {
        console.log('render root...');
        const externalStates: Record<string, PortValue> = {};
        for (const bufferInputKey of subFlowInfo.bufferInputKeys ?? []) {
          const port = node.inputPorts.find((x) => x.key === bufferInputKey)!;
          externalStates[bufferInputKey] = useSyncExternalStore(
            (callback: (val: PortValue) => void) => {
              bufferDispatchMap[port.key] = callback;
              return () => delete bufferDispatchMap[port.key];
            },
            () => {
              const res = readStreamInputSnapshot(
                subFlowInfo.subFlowId,
                port.key
              );
              console.log('readBuffer', port.id, res);
              return res;
            }
          );
        }
        const res = subFlowFunc({ ...externalStates });
        if (isPromise(res)) {
          throw new Error(
            'Component compute function should not return a promise'
          );
        }
        return res['element'];
      };
      root.render(createElement(renderFunc));
      return {};
    }
  );

export default getReactRenderCompute;
