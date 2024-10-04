import {
  FlowPath,
  Option,
  OptionKind,
  PortKind,
  Result,
  ResultKind,
  ReturnResult,
  ReturnResultKind,
  Data,
  FlowError,
  Port,
  SequenceStepResult,
  SequenceStepResultKind,
} from './types';

export const Err = (error: FlowError): Result => ({
  kind: ResultKind.Error,
  error,
});

export const Ok = (value: Option): Result => ({
  kind: ResultKind.Ok,
  value,
});

export const Some = (value: Data): Option => ({
  kind: OptionKind.Some,
  value,
});

export const None = (): Option => ({
  kind: OptionKind.None,
});

export const Immediate = (value: Result): ReturnResult => ({
  kind: ReturnResultKind.Immediate,
  value,
});

export const Deferred = (promise: Promise<Result>): ReturnResult => ({
  kind: ReturnResultKind.Deferred,
  promise,
});

export const SeqNext = (value: ReturnResult): SequenceStepResult => ({
  kind: SequenceStepResultKind.Next,
  value,
});

export const SeqJump = (toIndex: number): SequenceStepResult => ({
  kind: SequenceStepResultKind.Jump,
  toIndex,
});

export const NodePort = (key: string, nodeId: string): Port => ({
  kind: PortKind.NodePort,
  key,
  nodeId,
});

export const FlowPort = (key: string): Port => ({
  kind: PortKind.FlowPort,
  key,
});

export const SubFlowPort = (
  key: string,
  nodeId: string,
  subFlowKey: string
): Port => ({
  kind: PortKind.SubFlowPort,
  key,
  nodeId,
  subFlowKey,
});

export const ProviderPort = (
  key: string,
  nodeId: string,
  providerKey: string
): Port => ({
  kind: PortKind.ProviderPort,
  key,
  nodeId,
  providerKey,
});

export const getFlowPathHash = (flowPath: FlowPath) => {
  return flowPath.map((x) => `${x.nodeId}_${x.subFlowKey}`).join('/');
};

export const getPortHash = (port: Port) => {
  switch (port.kind) {
    case PortKind.FlowPort:
      return `flow_${port.key}`;
    case PortKind.NodePort:
      return `node_${port.nodeId}_${port.key}`;
    case PortKind.SubFlowPort:
      return `subflow_${port.nodeId}_${port.subFlowKey}_${port.key}`;
    case PortKind.ProviderPort:
      return `provider_${port.nodeId}_${port.providerKey}_${port.key}`;
  }
};
