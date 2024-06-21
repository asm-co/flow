import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const newCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  const constructor = inputs[Object.keys(inputs)[0]] as any;
  const params = Object.keys(inputs)
    .slice(1)
    .map((key) => inputs[key]);
  return { instance: new constructor(...params) };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(newCompute);
