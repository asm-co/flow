import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const propertyValueCompute: SimpleNodeNativeComputeFunction = ({ node }) => {
  return {
    value: node.staticInputs.value,
  };
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(propertyValueCompute);
