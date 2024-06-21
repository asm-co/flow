import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const pushCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  return {
    output: [...(inputs['input'] as any[]), inputs['item']],
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(pushCompute);
