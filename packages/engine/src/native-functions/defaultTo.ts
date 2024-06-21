import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const defaultToCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  if (inputs['value'] === undefined) {
    return {
      out: inputs['default'],
    };
  }
  return {
    out: inputs['value'],
  };
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(defaultToCompute);
