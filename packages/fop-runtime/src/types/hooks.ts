// Names of events follow the on[Will|Did]VerbNoun? pattern.
// The name signals if the event is going to happen (onWill) or already happened (onDid),
// what happened (verb), and the context (noun) unless obvious from the context.
// If the event happens atomically, the event name should be just onVerbNoun.

import {
  EventHandler,
  FlowPath,
  FlowFunction,
  NodeListener,
  Result,
  ReturnResult,
} from './common';
import { Node, Port } from './models';

export type HooksEvent =
  | {
      name: 'onWillRunFlow';
      value: {
        flowPath: FlowPath;
        flowInputs: Record<string, Result>;
      };
    }
  | {
      name: 'onDidRunFlow';
      value: {
        flowPath: FlowPath;
        flowOutput: Result;
      };
    }
  | {
      name: 'onWillReadFlowOutput';
      value: {
        flowPath: FlowPath;
      };
    }
  | {
      name: 'onDidReadFlowOutput';
      value: {
        flowPath: FlowPath;
        flowOutput: Result;
      };
    }
  | {
      name: 'onWillReadNodeInputs';
      value: {
        flowPath: FlowPath;
        nodeId: string;
      };
    }
  | {
      name: 'onDidReadNodeInputs';
      value: {
        flowPath: FlowPath;
        nodeId: string;
        nodeInputs: Record<string, Result>;
      };
    }
  | {
      name: 'onWillRunNode';
      value: {
        flowPath: FlowPath;
        nodeId: string;
        nodeInputs: Record<string, Result>;
      };
    }
  | {
      name: 'onDidRunNode';
      value: {
        flowPath: FlowPath;
        nodeId: string;
        nodeOutput: Result;
      };
    }
  | {
      name: 'onWillReadSubFlowInputs';
      value: {
        flowPath: FlowPath;
        nodeId: string;
        subFlowKey: string;
      };
    }
  | {
      name: 'onDidReadSubFlowInputs';
      value: {
        flowPath: FlowPath;
        nodeId: string;
        subFlowKey: string;
        subFlowInputs: Record<string, Result>;
      };
    }
  | {
      name: 'onWillAwaitNode';
      value: {
        flowPath: FlowPath;
        nodeId: string;
      };
    }
  | {
      name: 'onDidAwaitNode';
      value: {
        flowPath: FlowPath;
        nodeId: string;
      };
    }
  | {
      name: 'onJump';
      value: {
        flowPath: FlowPath;
        fromNodeId: string;
        toIndex: number;
      };
    }
  | {
      name: 'onWillReadData';
      value: {
        flowPath: FlowPath;
        port: Port;
      };
    }
  | {
      name: 'onDidReadData';
      value: {
        flowPath: FlowPath;
        port: Port;
        value: Result;
      };
    }
  | {
      name: 'onWillPushData';
      value: {
        flowPath: FlowPath;
        port: Port;
        value: Result;
      };
    }
  | {
      name: 'onDidPushData';
      value: {
        flowPath: FlowPath;
        from: Port;
        to: Port;
        value: Result;
      };
    }
  | {
      name: 'onStartObjectNode';
      value: {
        flowPath: FlowPath;
        nodeId: string;
        data: Result;
      };
    }
  | {
      name: 'onTerminateObjectNode';
      value: {
        flowPath: FlowPath;
        nodeId: string;
        data: Result;
      };
    }
  | {
      name: 'onStartSystemFlow';
      value: {
        flowPath: FlowPath;
        data: Result;
      };
    }
  | {
      name: 'onTerminateSystemFlow';
      value: {
        flowPath: FlowPath;
        data: Result;
      };
    }
  // overrides
  | {
      name: 'onDidOverrideNodeRun';
      value: {
        plugin: string;
        flowPath: FlowPath;
        nodeId: string;
        nodeInputs: Record<string, Result>;
        nodeOutput: Result;
      };
    }
  | {
      name: 'onDidOverrideFlowRun';
      value: {
        plugin: string;
        flowPath: FlowPath;
        flowInputs: Record<string, Result>;
        flowOutput: Result;
      };
    }
  // transforms
  | {
      name: 'onDidTransformFlowInputs';
      value: {
        plugin: string;
        flowPath: FlowPath;
        from: Record<string, Result>;
        to: Record<string, Result>;
      };
    }
  | {
      name: 'onDidTransformFlowOutput';
      value: {
        plugin: string;
        flowPath: FlowPath;
        from: Result;
        to: Result;
      };
    }
  | {
      name: 'onDidTransformNodeInputs';
      value: {
        plugin: string;
        flowPath: FlowPath;
        nodeId: string;
        from: Record<string, Result>;
        to: Record<string, Result>;
      };
    }
  | {
      name: 'onDidTransformNodeOutput';
      value: {
        plugin: string;
        flowPath: FlowPath;
        nodeId: string;
        from: Result;
        to: Result;
      };
    }
  | {
      name: 'onDidTransformDataAfterRead';
      value: {
        plugin: string;
        flowPath: FlowPath;
        port: Port;
        from: Result;
        to: Result;
      };
    }
  | {
      name: 'onDidTransformDataBeforePush';
      value: {
        plugin: string;
        flowPath: FlowPath;
        port: Port;
        from: Result;
        to: Result;
      };
    };

export type HooksEventWithTimestamp = HooksEvent & {
  timestamp: number;
};

export type Hooks = {
  onEvent?: (event: HooksEvent) => void;
  overrideNodeRun?: (
    flowPath: FlowPath,
    nodeId: string,
    node: Node,
    nodeInputs: Record<string, Result>,
    subFlowFunctions: Record<string, FlowFunction>,
    emit: EventHandler,
    listen: (listener: NodeListener) => void
  ) => ReturnResult | undefined;
  overrideFlowRun?: (
    flowPath: FlowPath,
    flowInputs: Record<string, Result>,
    emit: EventHandler,
    listen: (listener: EventHandler) => void
  ) => ReturnResult | undefined;
  transformFlowInputs?: (
    flowPath: FlowPath,
    flowInputs: Record<string, Result>
  ) => Record<string, Result> | undefined;
  transformFlowOutput?: (
    flowPath: FlowPath,
    flowOutput: Result
  ) => Result | undefined;
  transformNodeInputs?: (
    flowPath: FlowPath,
    nodeId: string,
    nodeInputs: Record<string, Result>
  ) => Record<string, Result> | undefined;
  transformNodeOutput?: (
    flowPath: FlowPath,
    nodeId: string,
    nodeOutput: Result
  ) => Result | undefined;
  transformDataAfterRead?: (
    flowPath: FlowPath,
    port: Port,
    value: Result
  ) => Result | undefined;
  transformDataBeforePush?: (
    flowPath: FlowPath,
    port: Port,
    value: Result
  ) => Result | undefined;
};

export type PluginHooks = Omit<Hooks, 'onEvent'> & {
  onEvent?: (event: HooksEventWithTimestamp) => void;
};
