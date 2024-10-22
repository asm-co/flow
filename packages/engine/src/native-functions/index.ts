import printCompute from './print';
import propertyValueCompute from './value';
import selectCompute from './select';
import jsonCompute from './json';
import delayCompute from './delay';
import registerCompute from './register';
import emitCompute from './emit';
import callbackCompute from './callback';
import subFlowAsFunctionCompute from './sub-flow-as-function';
import stateCompute from './state';
import useStateNode from './react/use-state';
import invokeCompute from './invoke';
import newCompute from './new';
import snabbdomNode from './snabbdom/snabbdom';
import reactRenderNode from './react/react-render';
import createElementNode from './react/create-element';
import componentNode from './react/component';
import vnodeNode from './snabbdom/vnode';
import vueAppNode from './vue/vue-app';
import vueComponentNode from './vue/vue-component';
import vueHNode from './vue/vue-h';
import createRootNode from './react/create-root';
import ifElseComputeSync from './if-else';
import ifThenElseComputeSync from './if-then-else';
import tryCatchFinallyComputeSync from './try-catch-finally';
import exceptionIfCompute from './exception-if';
import loopComputeSync from './loop';
// import sequentiallyCompute from './stream/sequentially';
// import rxOfCompute from './stream/rx-of';
// import rxMapToCompute from './stream/rx-map-to';
// import rxMapCompute from './stream/rx-map';
import tapCompute from './tap';
import spawnNode from './nodejs/spawn';
import webWorkerSpawnCompute from './runner/web-worker-spawn';
import denoHttpServerNode from './deno/http-server';
import webuiNode from './deno/webui';
import toArrayCompute from './to-array';
import toObjectCompute from './to-object';
import awaitCompute from './await';
import pushCompute from './push';
import repeatCompute from './repeat';
import padStartCompute from './pad-start';
import defaultToCompute from './defaultTo';
import stateMachineCompute from './state-machine';
import mapCompute from './map';
import markdownCompute from './markdown';
import fromObjectCompute from './from-object';
import constantCompute from './__constant';

//compute generators
export const _createElement = createElementNode;
export const _reactRender = reactRenderNode;
export const _component = componentNode;
export const _useState = useStateNode;
export const _createRoot = createRootNode;
export const _vnode = vnodeNode;
export const _snabbdom = snabbdomNode;
export const _vueApp = vueAppNode;
export const _vueComponent = vueComponentNode;
export const _vueH = vueHNode;
export const _nodeJsSpawn = spawnNode;
export const _denoWebui = webuiNode;
export const _denoHttpServer = denoHttpServerNode;

//simple compute => generators
// export const _string = propertyValueCompute;
// export const _number = propertyValueCompute;
// export const _boolean = propertyValueCompute;
// export const _null = propertyValueCompute;
export const _image = propertyValueCompute;
export const _select = selectCompute;
export const _json = jsonCompute;
export const _print = printCompute;
export const _register = registerCompute;
export const _emit = emitCompute;
export const _defaultTo = defaultToCompute;
export const _state = stateCompute;
export const _tap = tapCompute;
export const _push = pushCompute;
export const _padStart = padStartCompute;
export const _repeat = repeatCompute;
export const _subFlowAsFunction = subFlowAsFunctionCompute;
export const _invoke = invokeCompute;
export const _new = newCompute;
export const _toArray = toArrayCompute;
export const _toObject = toObjectCompute;
export const _fromObject = fromObjectCompute;
// export const _rxSequentially = sequentiallyCompute;
// export const _rxOf = rxOfCompute;
// export const _rxMapTo = rxMapToCompute;
// export const _rxMap = rxMapCompute;
export const _ifElse = ifElseComputeSync;
export const _ifThenElse = ifThenElseComputeSync;
export const _tryCatchFinally = tryCatchFinallyComputeSync;
export const _exceptionIf = exceptionIfCompute;
export const _loop = loopComputeSync;
export const _callback = callbackCompute;
export const _webWorkerSpawn = webWorkerSpawnCompute;

// async compute ==> generators
export const _delay = delayCompute;
export const _await = awaitCompute;

export const _stateMachine = stateMachineCompute;

export const _map = mapCompute;

export const _markdown = markdownCompute;

export const __CONSTANT = constantCompute;
