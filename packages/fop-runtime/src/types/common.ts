import { Data, Node } from './models';

export type FlowError = {
  message: string;
  nodeId: string;
  flowPath: FlowPath;
  node: Node;
  inputs?: Record<string, Result>;
  extras?: {
    [key: string]: any;
  };
};

export enum OptionKind {
  Some = 'S',
  None = 'N',
}

export type Option =
  | {
      kind: OptionKind.Some;
      value: Data;
    }
  | {
      kind: OptionKind.None;
    };

export enum ResultKind {
  Ok = 'O',
  Error = 'E',
}

export type Result =
  | {
      kind: ResultKind.Ok;
      value: Option;
    }
  | {
      kind: ResultKind.Error;
      error: FlowError;
    };

export enum ReturnResultKind {
  Immediate = 'I',
  Deferred = 'D',
}

export type ReturnResult =
  | {
      kind: ReturnResultKind.Immediate;
      value: Result;
    }
  | {
      kind: ReturnResultKind.Deferred;
      promise: Promise<Result>;
    };

export enum SequenceStepResultKind {
  Next = 'N',
  Jump = 'J',
}

export type SequenceStepResult =
  | {
      kind: SequenceStepResultKind.Next;
      value: ReturnResult;
    }
  | {
      kind: SequenceStepResultKind.Jump;
      toIndex: number;
    };

export type EventHandler = (key: string, value: Result) => void;

export type NodeListener = (
  key: string,
  value: Result,
  subFlowKey: string | null
) => void;

export type FlowFunction = (
  inputs: Record<string, Result>,
  emit: EventHandler,
  listen: (listener: EventHandler) => void
) => ReturnResult;

export type NodeFunction = (
  inputs: Record<string, Result>,
  subFlowFunctions: Record<string, FlowFunction>,
  emit: EventHandler,
  listen: (listener: NodeListener) => void
) => ReturnResult; // can be skipped or error

export type FlowPath = {
  nodeId: string;
  subFlowKey: string;
}[];

export type ProviderFunction = (
  listen: (listener: EventHandler) => void
) => ReturnResult;
