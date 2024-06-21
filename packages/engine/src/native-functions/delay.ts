import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const delayCompute: SimpleNodeNativeComputeFunction = async ({ inputs }) => {
  const ms = inputs['ms'];
  console.log('should delay for', ms);
  await new Promise((resolve) => setTimeout(resolve, ms as any));
  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(delayCompute);
