import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const exceptionIfCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  const condition = inputs['condition'];
  const message = inputs['message'];
  if (condition) {
    throw new Error(message as any);
  }
  return {};
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(exceptionIfCompute);
