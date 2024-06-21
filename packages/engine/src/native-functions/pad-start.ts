import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const padStartCompute: SimpleNodeNativeComputeFunction = ({ inputs }) => {
  return {
    output: (inputs['input'] as string).padStart(
      inputs['length'] as number,
      inputs['padString'] as string
    ),
  };
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(padStartCompute);
