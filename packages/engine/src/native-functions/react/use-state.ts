import { JsNodeComputeGenerator, RuntimeNodeImports } from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const getUseStateCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ inputs, onRx }) => {
    const defaultVal = inputs['default'];
    const [state, setState] = imports.useState(defaultVal);
    onRx({
      next: (key, val) => {
        setState(val);
      },
    });
    return {
      state,
    };
  });

export default getUseStateCompute;
