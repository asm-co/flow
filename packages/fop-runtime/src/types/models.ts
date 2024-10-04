export type Data = unknown;

export enum ReservedPortKey {
  // data
  JumpCondition = '$JC',
  Return = '$RT',
  ProviderValue = '$PV',
  // stream
  TriggerValue = '$TV',
  Resolve = '$RS',
  Start = '$ST',
  Terminate = '$TM',
}

export enum NodeKind {
  Native = 'N',
  Slot = 'S',
  Inject = 'I',
  Flow = 'F',
}

export enum SequenceStepKind {
  Jump = 'J',
  Node = 'N',
}

export enum FlowKind {
  Process = 'P',
  System = 'S',
}

export enum PortKind {
  FlowPort = 'F',
  NodePort = 'N',
  SubFlowPort = 'S',
  ProviderPort = 'P',
}

export type NativeNode = {
  kind: NodeKind.Native;
  target: string;
  subFlows?: Record<string, Flow>;
  staticInputs?: Record<string, Data>;
};

export type FlowNode = {
  kind: NodeKind.Flow;
  target: string;
  subFlows?: Record<string, Flow>;
  staticInputs?: Record<string, Data>;
};

export type SlotNode = {
  kind: NodeKind.Slot;
  target: string;
  staticInputs?: Record<string, Data>;
};

export type InjectNode = {
  kind: NodeKind.Inject;
  target: string;
};

export type Node = NativeNode | SlotNode | FlowNode | InjectNode;

type FlowPort = {
  kind: PortKind.FlowPort;
  key: string;
};

type NodePort = {
  kind: PortKind.NodePort;
  key: string;
  nodeId: string;
};

type SubFlowPort = {
  kind: PortKind.SubFlowPort;
  key: string;
  nodeId: string;
  subFlowKey: string;
};

type ProviderPort = {
  kind: PortKind.ProviderPort;
  key: string;
  nodeId: string;
  providerKey: string;
};

export type Port = FlowPort | NodePort | SubFlowPort | ProviderPort;

type FlowCommon = {
  dataNodes: Record<string, Node>;
  connections: {
    from: Port;
    to: Port;
    isStream?: boolean;
  }[];
};

export type SequenceStep =
  | { id: string; kind: SequenceStepKind.Jump; target: string | null }
  | {
      id: string;
      kind: SequenceStepKind.Node;
      node: Node;
      await?: boolean;
    };

export type ProcessFlow = {
  kind: FlowKind.Process;
  sequenceSteps: SequenceStep[];
  triggerNodes: Record<string, Node>;
} & FlowCommon;

export type SystemFlow = {
  kind: FlowKind.System;
  objectNodes: Record<string, Node>;
} & FlowCommon;

export type Flow = ProcessFlow | SystemFlow;
