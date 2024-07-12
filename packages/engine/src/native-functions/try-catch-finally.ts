import { AsyncMode, SimpleNodeNativeComputeFunction } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const tryCatchFinallyComputeSync: SimpleNodeNativeComputeFunction = ({
  node,
  subFlowGroupFunctions,
}) => {
  const subFlow = Object.values(node.subFlows)[0];
  const isAsync = Object.values(subFlow.nodes).some(
    (x) => x.asyncMode === AsyncMode.Await
  );

  const tryFunc = subFlowGroupFunctions['try'][0];
  const catchFunc = subFlowGroupFunctions['catch'][0];
  const finallyFunc = subFlowGroupFunctions['finally'][0];

  if (isAsync) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      try {
        tryFunc({});
      } catch (e: any) {
        if (catchFunc) {
          catchFunc({ error: e });
        }
      } finally {
        if (finallyFunc) {
          finallyFunc({});
        }
      }
      resolve({});
    });
  }

  try {
    tryFunc({});
  } catch (e: any) {
    if (catchFunc) {
      catchFunc({ error: e });
    }
  } finally {
    if (finallyFunc) {
      finallyFunc({});
    }
  }
  return {};
};

export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(tryCatchFinallyComputeSync);
