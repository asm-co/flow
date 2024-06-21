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
    const props = { ...(inputs['props'] as any) };
    if (inputs['twClass']) {
      props['className'] = (imports as any).tw(inputs['twClass']);
    }
    node.outputPorts
      .filter((x) => x.isStream)
      .map((port) => {
        props[port.key] = (val: any) => {
          tx(port.key, val);
        };
      });
    return {
      element: createElement(inputs['type'], props, inputs['children']),
    };
  });

export default getCreateElementCompute;
