import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const jsonCompute: SimpleNodeNativeComputeFunction = ({ node }) => {
  return {
    output: JSON.parse(node.properties.jsonString),
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(jsonCompute);
