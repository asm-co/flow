import { JsNodeComputeGenerator, RuntimeNodeImports } from '../../types';
import {
  isPromise,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const getSnabbdomCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) =>
  simpleNodeNativeCompute2NodeNativeCompute(
    ({ node, inputs, subFlowGroupFunctions, onRx }) => {
      const container = inputs['container'];

      const {
        init,
        classModule,
        propsModule,
        styleModule,
        eventListenersModule,
      } = imports;
      const patch = init([
        // Init patch function with chosen modules
        classModule, // makes it easy to toggle classes
        propsModule, // for setting properties on DOM elements
        styleModule, // handles styling on elements with support for animations
        eventListenersModule, // attaches event listeners
      ]);
      const subFlowInfo = Object.values(node.subFlowGroups)[0][0];
      const subFlowFunc = Object.values(subFlowGroupFunctions)[0][0];
      const result = subFlowFunc({});
      if (isPromise(result)) {
        throw new Error(
          'Snabbdom compute function should not return a promise'
        );
      }
      let oldVNode = result['vnode'];
      patch(container, oldVNode);
      onRx({
        next: (portKey, value, subFlowId) => {
          if (subFlowId && subFlowInfo.bufferInputKeys?.includes(portKey)) {
            const res = subFlowFunc({});
            if (isPromise(res)) {
              throw new Error(
                'Snabbdom compute function should not return a promise'
              );
            }
            const newVNode = res['vnode'];
            console.log('snabbdomCompute', result);
            patch(oldVNode, newVNode);
            oldVNode = newVNode;
          }
        },
      });
      return {};
    }
  );

export default getSnabbdomCompute;
