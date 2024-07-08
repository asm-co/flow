import {
  JsNodeComputeGenerator,
  NodeNativeComputeFunction,
  RuntimeNodeImports,
} from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const getCreateElementCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
): NodeNativeComputeFunction =>
  simpleNodeNativeCompute2NodeNativeCompute(({ node, inputs, tx }) => {
    const createElement = (imports as any).createElement;
    const ref = (imports as any).useRef(null);
    const props = { ...(inputs['props'] as any), ref };
    node.outputPorts
      .filter((x) => x.isStream)
      .map((port) => {
        props[port.key] = (val: any) => {
          tx(port.key, val);
        };
      });
    const children = node.inputPorts
      .filter((x) => x.key.startsWith('child_'))
      .map((x) => inputs[x.key]);
    return {
      element: createElement(inputs['type'], props, ...children),
      ref: ref,
    };
  });

export default getCreateElementCompute;
