import { SimpleNodeNativeComputeFunction } from '../../types';
import {
  isOk,
  Ok,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const webWorkerSpawnCompute: SimpleNodeNativeComputeFunction = ({
  node,
  inputs,
  tx,
  onRx,
}) => {
  console.log('webWorkerSpawnCompute', node, inputs);
  const subFlowCode = Object.values(node.staticInputs['bundles'])[0] as string;

  const subFlowInputString = JSON.stringify(Object.values(inputs)[0]);
  const workerScript = `
  ${subFlowCode}
  $module.runFlow(
    [${subFlowInputString}],
    (key,value)=>postMessage({key,value}),
    (listener)=>onmessage=(e)=>listener(e.data.key,e.data.value)
  );
  `;
  // console.log(workerScript);

  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));
  worker.onmessage = (e) => {
    if (isOk(e.data.value)) {
      tx(
        e.data.key,
        e.data.value.value,
        Object.keys(node.staticInputs['bundles'])[0]
      );
    }
  };
  onRx({
    next: (channel, value, _subFlowId) => {
      console.log('worker tx', channel, value);
      worker.postMessage({
        key: channel,
        value: Ok(value),
      });
    },
  });
  return {};
};
export default () =>
  simpleNodeNativeCompute2NodeNativeCompute(webWorkerSpawnCompute);
