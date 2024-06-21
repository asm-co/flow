import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const tapCompute: SimpleNodeNativeComputeFunction = ({ inputs, tx }) => {
  tx('tap', inputs['input']);
  return {
    output: inputs['input'],
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(tapCompute);
