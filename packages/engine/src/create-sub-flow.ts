import {
  Context,
  Either,
  PortValue,
  ReservedPortKey,
  Result,
  RuntimeSubFlow,
  SubFlowComputeFunction,
  SubFlowState,
} from './types';
import { isError, isOk, isPromise, Nothing, Ok } from './utils';
import { runFlow } from './run-flow';

export const createSubFlowGroupFunction =
  (
    context: Context,
    subFlow: RuntimeSubFlow,
    readSubFlowInput: (
      key: string,
      scopedExecutionIds: string[]
    ) => Result<PortValue>,
    txByKeyExternal: (key: string, value: Either<PortValue>) => void,
    onRxExternal: (
      listener: (portKey: string, val: Either<PortValue>) => void
    ) => void,
    getSubFlowState: () => SubFlowState,
    setSubFlowState: (subFlowState: SubFlowState) => void
  ): SubFlowComputeFunction =>
  (builtInInputs, txInternal, onRxInternal) => {
    const subFlowState = getSubFlowState();
    const subFlowExecIds = [subFlowState.totalRuns.toString()];
    const subFlowStaticInputs: Record<string, Result<PortValue>> = {
      ...builtInInputs,
      [ReservedPortKey.LoopIndex]: Ok(subFlowState.totalRuns),
    };

    for (const key of subFlow.registerKeys) {
      if (subFlowState.totalRuns === 0) {
        subFlowStaticInputs[key] = readSubFlowInput(key, subFlowExecIds);
      } else {
        subFlowStaticInputs[key] = subFlowState.registerStates[key];
      }
    }

    const flowResult = runFlow(
      context,
      subFlow,
      (key, scopedExecutionIds) => {
        if (Object.keys(subFlowStaticInputs).includes(key)) {
          return subFlowStaticInputs[key];
        }
        return readSubFlowInput(key, subFlowExecIds.concat(scopedExecutionIds));
      },
      (key, value) => {
        if (subFlow.outputPorts.find((x) => x.key === key)?.isPredefined) {
          if (txInternal) {
            txInternal(key, value);
          }
        } else {
          txByKeyExternal(key, value);
        }
      },
      (listener) => {
        onRxExternal(listener.next);
        if (onRxInternal) {
          onRxInternal(listener.next);
        }
      }
    );

    if (isPromise(flowResult)) {
      return new Promise((resolve) => {
        flowResult.then((result) => {
          if (isOk(result)) {
            subFlow.outputPorts
              .filter((x) => !x.isPredefined && !x.isStream)
              .map((x) => {
                txByKeyExternal(x.key, Ok(result.value[x.key]));
              });
          } else {
            subFlow.outputPorts
              .filter((x) => !x.isPredefined && !x.isStream)
              .map((x) => {
                txByKeyExternal(x.key, result);
              });
          }

          setSubFlowState({
            totalRuns: subFlowState.totalRuns + 1,
            registerStates: Object.fromEntries(
              subFlow.registerKeys.map((key) => [
                key,
                isError(result)
                  ? result
                  : result.value[key] === undefined
                  ? Nothing()
                  : Ok(result.value[key]),
              ])
            ),
          });
          resolve(result);
        });
      });
    }

    if (isOk(flowResult)) {
      subFlow.outputPorts
        .filter((x) => !x.isPredefined && !x.isStream)
        .map((x) => {
          txByKeyExternal(x.key, Ok(flowResult.value[x.key]));
        });
    } else {
      subFlow.outputPorts
        .filter((x) => !x.isPredefined && !x.isStream)
        .map((x) => {
          txByKeyExternal(x.key, flowResult);
        });
    }
    setSubFlowState({
      totalRuns: subFlowState.totalRuns + 1,
      registerStates: Object.fromEntries(
        subFlow.registerKeys.map((key) => [
          key,
          isError(flowResult)
            ? flowResult
            : flowResult.value[key] === undefined
            ? Nothing()
            : Ok(flowResult.value[key]),
        ])
      ),
    });
    return flowResult;
  };
