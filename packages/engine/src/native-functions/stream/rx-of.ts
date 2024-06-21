import { SimpleNodeNativeComputeFunction } from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const rxOfCompute: SimpleNodeNativeComputeFunction = ({ inputs, tx, onRx }) => {
  onRx({
    next: () => undefined,
    ready: () => tx('out', inputs['in']),
  });

  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(rxOfCompute);
