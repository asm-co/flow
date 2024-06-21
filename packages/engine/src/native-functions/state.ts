import { ReservedPortKey, SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const stateCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  return {
    data: inputs[ReservedPortKey.Params],
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(stateCompute);
