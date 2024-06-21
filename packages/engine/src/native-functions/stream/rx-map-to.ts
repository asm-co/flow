import { SimpleNodeNativeComputeFunction } from '../../types';
import {
  getRandomString,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const rxMapToCompute: SimpleNodeNativeComputeFunction = ({
  readInput,
  tx,
  onRx,
}) => {
  onRx({
    next: () => {
      const val = readInput('value', getRandomString());
      if (val !== undefined) {
        tx('out', val);
      }
    },
  });
  return {};
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(rxMapToCompute);
