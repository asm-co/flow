import { ReservedPortKey, SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const callbackCompute: SimpleNodeNativeComputeFunction = ({
  inputs,
  subFlowGroupFunctions,
}) => {
  const cbFunc = Object.values(subFlowGroupFunctions)[0][0];
  console.log('callbackCompute', inputs);
  cbFunc({
    params: inputs[ReservedPortKey.Params],
  });
  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(callbackCompute);
