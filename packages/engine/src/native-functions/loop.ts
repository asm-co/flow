import { ReservedPortKey, SimpleNodeNativeComputeFunction } from '../types';
import { isPromise, simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const loopCompute: SimpleNodeNativeComputeFunction = ({
  node,
  subFlowGroupFunctions,
}) => {
  const isAsync = Object.values(node.subFlows)[0].isAsync;

  if (isAsync) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      let continueLoop = true;
      let index = 0;
      while (continueLoop) {
        const res = await Object.values(subFlowGroupFunctions)[0][0]({
          [ReservedPortKey.LoopIndex]: index,
        });
        if (res['continue']) {
          index += 1;
        } else {
          continueLoop = false;
        }
      }
      resolve({});
    });
  } else {
    let continueLoop = true;
    let index = 0;
    while (continueLoop) {
      const res = Object.values(subFlowGroupFunctions)[0][0]({
        [ReservedPortKey.LoopIndex]: index,
      });
      if (isPromise(res)) {
        throw new Error(
          'Sync loop compute function should not return a promise'
        );
      }
      if (res['continue']) {
        index += 1;
      } else {
        continueLoop = false;
      }
    }
    return {};
  }
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(loopCompute);
