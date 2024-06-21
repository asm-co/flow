import { PortValue, SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const invokeCompute: SimpleNodeNativeComputeFunction = ({
  inputs,
}): Record<string, PortValue> => {
  const func = inputs[Object.keys(inputs)[0]] as any;
  const params = Object.keys(inputs)
    .slice(1)
    .map((key) => inputs[key]);
  return { output: func(...params) };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(invokeCompute);
