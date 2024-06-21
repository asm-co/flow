import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const propertyValueCompute: SimpleNodeNativeComputeFunction = ({ node }) => {
  return {
    value: node.properties.value,
  };
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(propertyValueCompute);
