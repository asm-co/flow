import { JsNodeComputeGenerator, RuntimeNodeImports } from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const getVueHCompute: JsNodeComputeGenerator = (imports: RuntimeNodeImports) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ node, inputs, tx }) => {
    const { h } = imports;
    const props = { ...(inputs['props'] as any) };
    node.outputPorts
      .filter((x) => x.isStream)
      .map((port) => {
        props[port.key] = (val: any) => {
          tx(port.key, val);
        };
      });
    return {
      element: h(inputs['type'], props, inputs['children']),
    };
  });

export default getVueHCompute;
