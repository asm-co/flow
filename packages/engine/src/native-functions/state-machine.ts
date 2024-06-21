import { JsNodeComputeGenerator } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const getStateMachineCompute: JsNodeComputeGenerator = (imports) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ onRx, node, tx }) => {
    const { interpret, toMachine } = imports;
    console.log(imports, node);
    // const actions: Record<string, any> = {};
    // node.outputPorts
    //   .filter((x) => x.key !== 'state' && x.key)
    //   .forEach((x) => {
    //     actions[x.key] = () => tx(x.key, null);
    //   });
    const machine = toMachine(node.properties.value, {
      // actions,
    });
    // console.log(machine);
    const service = interpret(machine).onTransition(
      (state: { value: string }) => {
        // console.log(state.value);
        tx('state', state.value);
      }
    );
    onRx({
      ready: () => {
        service.start();
      },
      next: (portKey, val) => {
        service.send(portKey);
      },
      complete: () => {
        // service.stop();
      },
    });

    return {};
  });

export default getStateMachineCompute;
