import { SimpleNodeNativeComputeFunction } from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const sequentiallyCompute: SimpleNodeNativeComputeFunction = ({
  inputs,
  tx,
  onRx,
}) => {
  const val = inputs['in'];
  const interval = inputs['interval'] as number;

  const run = async () => {
    for (const v of val as any[]) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      tx('out', v);
    }
  };
  onRx({
    next: () => undefined,
    ready: () => run(),
  });
  return {};
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(sequentiallyCompute);
