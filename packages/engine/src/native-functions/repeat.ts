import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const pushCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  return {
    out: Array(inputs['times']).fill(inputs['in']),
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(pushCompute);
