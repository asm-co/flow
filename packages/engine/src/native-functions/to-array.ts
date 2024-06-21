import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const toArrayCompute: SimpleNodeNativeComputeFunction = ({ node, inputs }) => {
  const output = node.inputPorts.map((x) => inputs[x.key]);
  return {
    array: output,
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(toArrayCompute);
