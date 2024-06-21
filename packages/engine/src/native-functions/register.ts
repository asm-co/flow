import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const registerCompute: SimpleNodeNativeComputeFunction = () => {
  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(registerCompute);
