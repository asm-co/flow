import {
  JsNodeComputeGenerator,
  PortValue,
  RuntimeNodeImports,
} from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const getVNodeCompute: JsNodeComputeGenerator = (imports: RuntimeNodeImports) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ node, inputs, tx }) => {
    const selector = inputs['selector'] ?? 'div';
    const data: Record<string, any> = (inputs['data'] as any) ?? {};
    const children = inputs['children'] ?? [];
    const eventHandlers = Object.fromEntries(
      node.outputPorts
        .filter((x) => x.isStream)
        .map((port) => [port.key, (val: PortValue) => tx(port.key, val)])
    );
    const vnode = imports['h'](
      selector,
      { ...data, on: eventHandlers },
      children
    );
    console.log('vnode', vnode);

    return { vnode };
  });

export default getVNodeCompute;
