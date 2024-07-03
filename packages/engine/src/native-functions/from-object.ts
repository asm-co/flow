import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const fromObjectCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  const output = inputs.object as any;
  return output;
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(fromObjectCompute);
