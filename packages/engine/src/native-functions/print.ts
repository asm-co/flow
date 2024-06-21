import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const printCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  const message = inputs['message'];
  // console.log('run printCompute', inputs);
  console.log(`[print]`, message);
  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(printCompute);
