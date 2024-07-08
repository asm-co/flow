import {
  JsNodeComputeGenerator,
  PortValue,
  RuntimeNodeImports,
} from '../../types';
import {
  isPromise,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const getComponentCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) =>
  simpleNodeNativeCompute2NodeNativeCompute(
    ({ node, subFlowGroupFunctions, onRx, readStreamInputSnapshot }) => {
      const createElement = imports.createElement;
      const ref = (imports as any).useRef(null);
      const useSyncExternalStore = imports.useSyncExternalStore;
      const subFlowInfo = Object.values(node.subFlowGroups)[0][0];
      const subFlowFunc = Object.values(subFlowGroupFunctions)[0][0];
      const bufferDispatchMap: Record<string, (val: PortValue) => void> = {};

      onRx({
        next: (portKey, value, subFlowId) => {
          if (subFlowId && subFlowInfo.bufferInputKeys?.includes(portKey)) {
            bufferDispatchMap[portKey]?.(value);
          }
        },
      });

      const renderFunc = () => {
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
      return {
        element: createElement(renderFunc, { ref }),
        ref,
      };
    }
  );

export default getComponentCompute;
