import { PortValue, SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const selectCompute: SimpleNodeNativeComputeFunction = ({
  inputs,
}): Record<string, PortValue> => {
  const index = inputs['index'];
  if (index === undefined) {
    return {};
  }
  if (
    typeof index !== 'number' ||
    index < 0 ||
    index > Object.keys(inputs).length - 2
  ) {
    throw new Error(`index out of range: ${index}`);
  }
  const key = `input__d${index}`;
  const val = inputs[key];
  if (val === undefined) {
    return {};
  }
  return { output: val };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(selectCompute);
