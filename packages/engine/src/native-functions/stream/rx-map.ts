import { SimpleNodeNativeComputeFunction } from '../../types';
import {
  isPromise,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const rxMapCompute: SimpleNodeNativeComputeFunction = ({
  subFlowGroupFunctions,
  tx,
  onRx,
}) => {
  const mapFunction = Object.values(subFlowGroupFunctions)[0][0];
  onRx({
    next: (portKey, value) => {
      const result = mapFunction({ item: value });
      if (isPromise(result)) {
        throw new Error('Map compute function should not return a promise');
      }
      tx('out', result['output']);
    },
  });

  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(rxMapCompute);
