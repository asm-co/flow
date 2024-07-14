import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const registerCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  return {
    out: inputs.in,
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(registerCompute);
