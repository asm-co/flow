import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const toObjectCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  const output = { ...inputs };
  return {
    object: output,
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(toObjectCompute);
