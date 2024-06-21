import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const ifElseComputeSync: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  const condition = inputs['condition'];
  return {
    output: condition ? inputs['true'] : inputs['false'],
  };
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(ifElseComputeSync);
