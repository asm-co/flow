import { SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const awaitCompute: SimpleNodeNativeComputeFunction = async ({
  node,
  onRx,
  readStreamInputSnapshot,
}) => {
  const port = node.inputPorts.filter((x) => x.isStream && !x.subFlowId)[0];
  const current = readStreamInputSnapshot(null, port.key);
  if (current !== undefined) {
    return {
      result: current,
    };
  }
  return new Promise((resolve) => {
    onRx({
      next: (portKey, val) => {
        resolve({
          result: val,
        });
      },
    });
  });
};

export default () => simpleNodeNativeCompute2NodeNativeCompute(awaitCompute);
