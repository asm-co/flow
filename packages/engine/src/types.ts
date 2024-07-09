export enum NodeType {
  Data = 'D', //数据
  ExecutionSync = 'ES', //执行
  ExecutionAsync = 'EA', //执行
  // Stream = 'S', // （数据）流
  // Unknown = 'U', //无效
  Setup = 'ST', // setup execution
  Passive = 'P', // passive execution
}

export enum RuntimeType {
  Any = 'any',
  Browser = 'browser',
  NodeJs = 'nodejs',
  Deno = 'deno',
}

export enum ReservedPortKey {
  // GroupIndex = '__GROUP_INDEX',
  // Precondition = '__PRECONDITION',
  // LoopContinue = '__LOOP_CONTINUE', // in compute flow, for next loop
  LoopIndex = '__LOOP_INDEX',
  Params = '__PARAMS',
  Execution = '__EXECUTION',
  GoBack = '__GO_BACK',
  // OnTx = '__ON_TX', // for reactive subflow in proactive flow
  // RunCount = '__RUN_COUNT',
}

export enum ReservedNodeResourceId {
  Import = '__IMPORT',
  ImportContent = '__IMPORT_CONTENT',
  // computation is by engine
  Abstract = '__ABSTRACT',
  // ExceptionIf = '__EXCEPTION_IF', // throw exception, has a condition input port and  an error input port
  ExternalFlow = '__EXTERNAL_FLOW', // for linked flow
  // Loop = '__LOOP', // has a continue flow external output port
  ReturnIf = '__RETURN_IF', // has the same input ports as the parent flow's output ports
  GoBackIf = '__GO_BACK_IF', // has extra execution output port
  // IfElse = '__IF_ELSE', // if/else(data)
  // SubFlow = '__SUB_FLOW', // for embedded sub flow
  // IfThen = '__IF_THEN', // if/else(execution)
  // Try = '__TRY', // has a exception node output port
  // Register = '__REGISTER', // do nothing, only for register
  JsCodeSync = '__JS_CODE_SYNC',
  JsCodeAsync = '__JS_CODE_ASYNC',
  JsExpression = '__JS_EXPRESSION',
  // JsExpressionAsync = '__JS_EXPRESSION_ASYNC',
  // ExternalReactiveFlow = '__EXTERNAL_REACTIVE_FLOW', // for linked reactive flow
  // ReactiveSubFlow = '__REACTIVE_SUB_FLOW', // for embedded reactive sub flow
  // ExternalReactiveFlowRunner = '__EXTERNAL_REACTIVE_FLOW_RUNNER', // for embedded reactive flow in proactive flow
  // InlineReactiveFlowRunner = '__INLINE_REACTIVE_FLOW_RUNNER', // for embedded reactive flow in proactive flow
  // ReactiveCore = '__REACTIVE_CORE', // for reactive core
  // Callback = '__CALLBACK', // callback function
  // Call = '__CALL', // call method of an object
  // New = '__NEW', // new instance
  // Await = '__AWAIT', // await promise
  //ReactiveAbstract = '__REACTIVE_ABSTRACT',
}

export type CompiledPort = {
  key: string;
  subFlowId: string | null;
  nodeId: string | null;
  isSource: boolean;
  isStream: boolean;
};

export type CompiledNode = {
  type: NodeType;
  subFlowGroups: Record<
    string,
    { subFlowId: string; bufferInputKeys?: string[] }[]
  >;
  subFlows: Record<string, CompiledFlow>;
  resourceId: string;
  properties: Record<string, any>;
  isAsync: boolean;
  staticInputs: Record<string, any>;
};

export type CompiledFlow = {
  nodes: Record<string, CompiledNode>;
  ports: Record<string, CompiledPort>;
  connectionMap: Record<string, string>;
  executionPath: string[];
  inputPortIds: string[];
  outputPortIds: string[];
  isAsync: boolean;
  goBackMap: Record<string, string>;
};

export type ExternalFlowData = {
  flowId: string;
};

export type RuntimePort = CompiledPort & {
  id: string;
};

export type RuntimeNode = CompiledNode & {
  id: string;
  inputPorts: RuntimePort[];
  outputPorts: RuntimePort[];
  subFlows: Record<string, RuntimeSubFlow>;
  registerKeys: string[];
};

export type RuntimeFlow = CompiledFlow & {
  nodes: Record<string, RuntimeNode>;
  inputPorts: RuntimePort[];
  outputPorts: RuntimePort[];
  ports: Record<string, RuntimePort>;
  registerKeys: string[];
};

export type RuntimeSubFlowPort = RuntimePort & {
  isPredefined: boolean;
};

export interface RuntimeSubFlow extends RuntimeFlow {
  inputPorts: RuntimeSubFlowPort[];
  outputPorts: RuntimeSubFlowPort[];
}

export type RuntimeError = {
  code?: string;
  message: string;
};

export type ResultOk<T> = {
  __kind: 'ok';
  value: T;
};

export type ResultError = {
  __kind: 'error';
  errors: RuntimeError[];
};

// only used for unconnected input ports or no-run/error subflows
// null is value(OK) not nothing
export type ResultNothing = {
  __kind: 'nothing';
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | ({
      [key: string]: JsonValue;
    } & { __kind?: never });

export type PortValue = JsonValue;

export type PortsValue = Record<string, PortValue>;

export type Result<T> = ResultOk<T> | ResultError | ResultNothing;

export type Either<T> = ResultOk<T> | ResultError;

export type Option<T> = ResultOk<T> | ResultNothing;

export type MaybePromise<T> = T | Promise<T>;

// export type PortInput = Result<JsonValue>;
// export type FlowResult = Result<PortsValue>;
// export type SubFlowOutputs = Record<string, PortValue>; // can be Nothing(skipped or error)

export type SubFlowState = {
  totalRuns: number; // total runs of subflow, including error runs
  registerStates: Record<string, Result<PortValue>>;
  // outputs: SubFlowOutputs; // success, skipped, failed
};

export type NodeRunResult = Either<Record<string, PortValue>>;

export type SubFlowComputeFunction = (
  inputs: Record<string, Result<PortValue>>, //predefined inputs, provided by parent node
  txInternal?: (key: string, value: Either<PortValue>) => void,
  onRxInternal?: (
    listener: (portKey: string, val: Either<PortValue>) => void
  ) => void
) => MaybePromise<NodeRunResult>; // can be skipped or error

// export type SubFlowComputeFunctionSync = (
//   inputs: Record<string, Result<PortValue>>, //predefined inputs, provided by parent node
//   txInternal?: (key: string, value: Either<PortValue>) => void,
//   onRxInternal?: (
//     listener: (portKey: string, val: Either<PortValue>) => void
//   ) => void
// ) => NodeRunResult; // can be skipped or error
//
// export type SubFlowComputeFunctionAsync = (
//   inputs: Record<string, Result<PortValue>>, //predefined inputs, provided by parent node
//   txInternal?: (key: string, value: Either<PortValue>) => void,
//   onRxInternal?: (
//     listener: (portKey: string, val: Either<PortValue>) => void
//   ) => void
// ) => MaybePromise<NodeRunResult>; // can be skipped or error

export type FlowListener<T> = {
  next: (key: string, value: T) => void;
  ready: () => void;
  complete: () => void;
};

export type Listener<T> = {
  next: (channel: string, value: T, subFlowId: string | null) => void;
  ready: () => void;
  complete: () => void;
};

export type PartialListener<T> = {
  next: (channel: string, value: T, subFlowId: string | null) => void;
  ready?: () => void;
  complete?: () => void;
};

export type NodeNativeComputeFunction = (params: {
  node: RuntimeNode;
  readInput: (key: string, seed?: string) => Result<PortValue>;
  subFlowGroupFunctions: Record<string, SubFlowComputeFunction[]>;
  // runtime: RuntimeProvider,
  tx: (key: string, value: Either<PortValue>, subFlowId?: string) => void;
  onRx: (listener: Listener<Either<PortValue>>) => void;
  readStreamInputSnapshot: (
    subFlowId: string | null,
    portKey: string
  ) => Result<PortValue>;
}) => MaybePromise<NodeRunResult>; // can be skipped or error

export type NodeOutputs = Record<string, PortValue>;

export type RuntimeNodeImports = Record<string, any>;

export type RuntimeProvider = {
  console: {
    log: (...message: any[]) => void;
  };
  setTimeout: (
    callback: (...args: any[]) => void,
    timeout?: number,
    ...args: any[]
  ) => number;
  // react?: {
  //   useState: (initialState: any) => [any, (newState: any) => void];
  //   createElement: (type: any, props: any, ...children: any[]) => any;
  // };
  // clearTimeout: (timeoutId: number) => void;
  // setInterval: (
  //   callback: (...args: any[]) => void,
  //   timeout?: number,
  //   ...args: any[]
  // ) => number;
  // clearInterval: (intervalId: number) => void;
};

export type Providers = {
  getNodeNativeComputeFunction: (
    id: string
  ) => NodeNativeComputeFunction | undefined;
  getFlow: (id: string) => RuntimeFlow | undefined;
  getNodeComputeFlow: (id: string) => RuntimeFlow | undefined;
  // runtime: RuntimeProvider;
};

export interface Context {
  // rootFlow: RuntimeFlow;
  abstractionSubFlowGroupFunctions?: Record<string, SubFlowComputeFunction[]>;
  providers: Providers;

  // getKvStore:
  //   | ((input: {
  //       path: string[];
  //       type: 'execNodes' | 'subFlows';
  //     }) => Map<string, any>)
  //   | null; // null means temp storage, do not need to save outside, only execution states will be saved outside
  // cbDebug: (info: DebugInfo) => void;
}

export type SimpleSubFlowComputeFunction = (
  inputs: PortsValue, //predefined inputs, provided by parent node,
  // runtime: RuntimeProvider,
  txInternal?: (key: string, value: Either<PortValue>) => void,
  onRxInternal?: (
    listener: (portKey: string, val: Either<PortValue>) => void
  ) => void
) => MaybePromise<PortsValue>; //  error subflow will throw exception

// // use exception to handle error
export type SimpleNodeNativeComputeFunction = (params: {
  node: RuntimeNode;
  inputs: PortsValue;
  readInput: (key: string, seed?: string) => PortValue | undefined;
  // getInput: (
  //   key: string,
  //   seed?: string
  // ) => T extends 'async'
  //   ? Promise<PortValue | undefined>
  //   : PortValue | undefined,
  // read node inputs(do not read subflow inputs),
  // sync function, prepared before execution,
  // if the input data has errors, an exception will be thrown
  subFlowGroupFunctions: Record<string, SimpleSubFlowComputeFunction[]>;
  // runtime: RuntimeProvider,
  tx: (key: string, value: PortValue, subFlowId?: string) => void;
  onRx: (listener: PartialListener<PortValue>) => void;
  readStreamInputSnapshot: (
    subFlowId: string | null,
    portKey: string
  ) => PortValue | undefined;
}) => MaybePromise<PortsValue>; //  error node will throw exception

// export type NodeRxHandler = {
//   onNextByKey?: (inputPortKey: string, value: Either<any>) => void;
//   onNext?: (sourcePortFullId: string[], value: Either<any>) => void;
//   onStart?: () => void;
//   onDispose?: () => void;
// };
//
// export type NodeTxHandler = {
//   nextByKey: (outputPortKey: string, value: Either<any>) => void;
//   next: (sourcePortFullId: string[], value: Either<any>) => void;
// };
//
// export type FlowRxHandler = {
//   onNext: (sourcePortFullId: string[], value: Either<any>) => void;
//   onStart: () => void;
//   onDispose: () => void;
// };
//
// export type FlowTxHandler = {
//   next: (sourcePortFullId: string[], value: Either<any>) => void;
// };

// export type ReactiveSubFlowCreator = (
//   inputs: Record<string, Result<PortValue>>,
//   txHandler: FlowTxHandler
// ) => FlowRxHandler;

// export type StreamNodeNativeFunction = (
//   node: RuntimeNode,
//   inputs: Record<string, Result<PortValue>> & {
//     subFlowInputs?: Record<string, Result<PortValue>>;
//   },
//   proactiveSubFlowGroupFunctions: Record<
//     string,
//     SubFlowComputeFunction<'async'>[]
//   >,
//   // runtime: RuntimeProvider,
//   txHandler: NodeTxHandler,
//   reactiveSubFlowCreator: Record<string, ReactiveSubFlowCreator[]>
// ) => NodeRxHandler;

export type NodeImportItem = (
  | {
      import: null;
      as: string;
    }
  | {
      import: '*';
      as: string;
    }
  | {
      import: string;
      as?: string;
    }
) &
  (
    | { from: string }
    | {
        package: string;
        version?: string; // semantic version
        path?: string;
      }
  );

export type NodeImports = NodeImportItem[];

export type JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) => NodeNativeComputeFunction;

export type JsNode = {
  imports: NodeImports;
  getCompute?: (
    runtimeImports: RuntimeNodeImports
  ) => NodeNativeComputeFunction;
};
