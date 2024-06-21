import { SimpleNodeNativeComputeFunction } from '../types';
import { isPromise, simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const mapCompute: SimpleNodeNativeComputeFunction = ({
  inputs,
  subFlowGroupFunctions,
}) => {
  const input = inputs['in'] as any[];
  const subFlowGroupFunction = subFlowGroupFunctions['default'][0];
  const output = input.map((item, index) => {
    const res = subFlowGroupFunction({
      item,
      index,
    });
    if (isPromise(res)) {
      throw new Error('subFlowFunction should be sync');
    }
    return res.value;
  });
  return { out: output };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(mapCompute);
