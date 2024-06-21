import { SimpleNodeNativeComputeFunction } from '../types';
import { isPromise, simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const ifThenElseComputeSync: SimpleNodeNativeComputeFunction = ({
  inputs,
  subFlowGroupFunctions,
}) => {
  const run = () => {
    const condition = inputs['if'];
    if (condition) {
      return subFlowGroupFunctions['if'][0]({});
    } else if (subFlowGroupFunctions['else'][0]) {
      return subFlowGroupFunctions['else'][0]({});
    }
    return {};
  };

  const res = run();
  if (isPromise(res)) {
    return new Promise((resolve) => {
      res.then(() => {
        resolve({});
      });
    });
  }
  return {};
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(ifThenElseComputeSync);
