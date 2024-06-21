import { SimpleNodeNativeComputeFunction } from '../types';
import { isPromise, simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const subFlowAsFunctionCompute: SimpleNodeNativeComputeFunction = ({
  subFlowGroupFunctions,
}) => {
  const func = (...args: any[]) => {
    const subFlowFunc = Object.values(subFlowGroupFunctions)[0][0];
    const res = subFlowFunc({ args });
    if (isPromise(res)) {
      throw new Error('SubFlow compute function should not return a promise');
    }
    return res['output'];
  };

  return {
    function: func as any,
  };
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(subFlowAsFunctionCompute);
