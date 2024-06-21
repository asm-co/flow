import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const emitCompute: SimpleNodeNativeComputeFunction = ({ inputs, tx }) => {
  const message = inputs['input'];
  tx('output', message);
  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(emitCompute);
