import { JsNodeComputeGenerator, RuntimeNodeImports } from '../../types';
import {
  isPromise,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const getVueComponentCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) =>
  simpleNodeNativeCompute2NodeNativeCompute(
    ({ node, subFlowGroupFunctions, onRx, readStreamInputSnapshot }) => {
      const { h, reactive } = imports;
      const subFlowInfo = Object.values(node.subFlowGroups)[0][0];
      const subFlowFunc = Object.values(subFlowGroupFunctions)[0][0];

      const comp = {
        setup() {
          const initialProps: Record<string, any> = {};
          for (const bufferInputKey of subFlowInfo.bufferInputKeys ?? []) {
            const port = node.inputPorts.find((x) => x.key === bufferInputKey)!;
            initialProps[bufferInputKey] = readStreamInputSnapshot(
              subFlowInfo.subFlowId,
              port.key
            );
          }
          const props = reactive(initialProps);

          onRx({
            next: (portKey, value, subFlowId) => {
              if (subFlowId && subFlowInfo.bufferInputKeys?.includes(portKey)) {
                props[portKey] = value;
              }
            },
          });

          return () => {
            const res = subFlowFunc({ ...props });
            if (isPromise(res)) {
              throw new Error(
                'Vue component compute function should not return a promise'
              );
            }
            return res['element'];
          };
        },
      };

      return {
        element: h(comp),
      };
    }
  );

export default getVueComponentCompute;
