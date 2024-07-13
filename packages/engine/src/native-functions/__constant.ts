import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const directOutputCompute: SimpleNodeNativeComputeFunction = ({ node }) => {
  return node.staticInputs;
};

export default simpleNodeNativeCompute2NodeNativeCompute(directOutputCompute);
