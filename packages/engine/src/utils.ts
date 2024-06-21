import type {
  MaybePromise,
  NodeNativeComputeFunction,
  PortsValue,
  PortValue,
  Result,
  ResultError,
  ResultNothing,
  ResultOk,
  RuntimeError,
  SimpleNodeNativeComputeFunction,
  SimpleSubFlowComputeFunction,
  SubFlowComputeFunction,
} from './types';

type NodeTemplateCore = any;

export function getRandomString(length = 10) {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

export const isPromise = <T>(obj: any): obj is Promise<T> =>
  typeof obj['then'] === 'function';

export const Err = (errors: RuntimeError[]): ResultError => ({
  __kind: 'error',
  errors,
});

export const Ok = <T>(value: T): ResultOk<T> => ({
  __kind: 'ok',
  value,
});

export const Nothing = (): ResultNothing => ({
  __kind: 'nothing',
});

export const isError = (result: Result<any>): result is ResultError =>
  result.__kind === 'error';

export const isNothing = (result: Result<any>): result is ResultNothing =>
  result.__kind === 'nothing';

export const isOk = (result: Result<any>): result is ResultOk<any> =>
  result.__kind === 'ok';

const portsValue2PortsResult = (inputs: PortsValue) =>
  Object.fromEntries(
    Object.entries(inputs).map(([key, value]) => [key, Ok(value)])
  );

const subFlowCompute2SimpleSubFlowCompute = (
  subFlowCompute: SubFlowComputeFunction
): SimpleSubFlowComputeFunction => {
  return (inputs, txInternal, onRxInternal) => {
    const result = subFlowCompute(
      portsValue2PortsResult(inputs),
      txInternal,
      onRxInternal
    );
    if (isPromise(result)) {
      return new Promise((resolve, reject) =>
        result.then((awaitedResult) => {
          if (isError(awaitedResult)) {
            reject(awaitedResult.errors[0].message);
          } else {
            resolve(awaitedResult.value);
          }
        })
      );
    }
    if (isError(result)) {
      throw new Error(result.errors[0].message);
    }
    return result.value;
  };
};

export const simpleNodeNativeCompute2NodeNativeCompute = (
  simpleCompute: SimpleNodeNativeComputeFunction
): NodeNativeComputeFunction => {
  return ({
    node,
    readInput,
    subFlowGroupFunctions,
    tx,
    onRx,
    readStreamInputSnapshot,
  }) => {
    const inputs: PortsValue = {};
    for (const port of node.inputPorts.filter(
      (x) => !x.subFlowId && !x.isStream
    )) {
      const res = readInput(port.key);
      if (isError(res)) {
        throw new Error(res.errors[0].message);
      } else if (isOk(res)) {
        inputs[port.key] = res.value;
      }
    }

    const simpleReadInput = (key: string, seed?: string) => {
      const res = readInput(key, seed);
      if (isError(res)) {
        throw new Error(res.errors[0].message);
      } else if (isOk(res)) {
        return res.value;
      }
      return undefined;
    };

    const simpleSubFlowGroupFunctions = Object.fromEntries(
      Object.keys(subFlowGroupFunctions).map((key) => [
        key,
        subFlowGroupFunctions[key].map((subFlowCompute) =>
          subFlowCompute2SimpleSubFlowCompute(subFlowCompute)
        ),
      ])
    );

    const res = simpleCompute({
      node,
      inputs,
      readInput: simpleReadInput,
      subFlowGroupFunctions: simpleSubFlowGroupFunctions,
      tx: (key, value, subFlowId) => tx(key, Ok(value), subFlowId),
      onRx: (callback) =>
        onRx({
          next: (portId, val, subFlowId) => {
            if (isOk(val)) {
              callback.next(portId, val.value, subFlowId);
            }
          },
          ready: callback.ready ?? (() => undefined),
          complete: callback.complete ?? (() => undefined),
        }),
      readStreamInputSnapshot: (subFlowId, portKey) => {
        const res = readStreamInputSnapshot(subFlowId, portKey);
        if (isError(res)) {
          throw new Error(res.errors[0].message);
        } else if (isOk(res)) {
          return res.value;
        } else {
          return undefined;
        }
      },
    });

    if (isPromise(res)) {
      return new Promise((resolve) => {
        res.then((awaitedResult) => {
          resolve(Ok(awaitedResult));
        });
      });
    }

    return Ok(res);
  };
};

type SubFlowFunction = (input: PortValue) => MaybePromise<PortValue>;
type CodeFunction = (
  nodeInputs: PortsValue,
  subFlows: SubFlowFunction[],
  tx: (key: string, value: PortValue, subFlowId?: string) => void
) => MaybePromise<PortsValue>;

export const code2NodeNativeCompute = (codeFunction: CodeFunction) => {
  return simpleNodeNativeCompute2NodeNativeCompute(
    ({ inputs, subFlowGroupFunctions, tx }) => {
      const subFlows: SubFlowFunction[] =
        Object.values(subFlowGroupFunctions).length > 0
          ? Object.values(subFlowGroupFunctions)[0].map(
              (f) => (input: PortValue) => {
                const res = f({ input });
                if (isPromise(res)) {
                  return new Promise((resolve) => {
                    res.then((awaitedRes) => resolve(awaitedRes.output));
                  });
                } else {
                  return res.output;
                }
              }
            )
          : [];
      return codeFunction(inputs, subFlows, tx);
    }
  );
};

export const wrappedImplementation2Compute = (
  targetFunc: (...val: any[]) => any,
  nodeTemplate: NodeTemplateCore
) => {
  return simpleNodeNativeCompute2NodeNativeCompute(
    ({ inputs, subFlowGroupFunctions }) => {
      const args: any[] = [];
      for (const param of nodeTemplate.wrappedImplementation!.paramKeys || []) {
        const subFlowIndex = nodeTemplate.subFlowGroups
          ?.map((x: { key: string }) => x.key)
          .indexOf(param);
        if (subFlowIndex !== undefined && subFlowIndex >= 0) {
          const wrappedSubFlowFunction = (...subFlowArgs: any[]) => {
            const func = Object.values(subFlowGroupFunctions)[0][subFlowIndex];
            const inputs = Object.fromEntries(
              nodeTemplate.subFlowGroups![subFlowIndex].flowInputPorts.map(
                (x: { key: string }, i: number) => [x.key, subFlowArgs[i]]
              )
            );
            const res = func(inputs);
            if (isPromise(res)) {
              return new Promise((resolve) =>
                res.then((val) => resolve(Object.values(val)[0]))
              );
            }
            return Object.values(res)[0];
          };
          args.push(wrappedSubFlowFunction);
        } else {
          const input = inputs[param];
          args.push(input);
        }
      }
      const res = targetFunc(...args);
      if (isPromise(res)) {
        return new Promise((resolve) => {
          res.then((value: any) => {
            resolve({
              [nodeTemplate.outputPorts[0].key]: value,
            });
          });
        });
      }
      return {
        [nodeTemplate.outputPorts[0].key]: res,
      };
    }
  );
};
