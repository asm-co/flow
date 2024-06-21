import { JsNodeComputeGenerator, RuntimeNodeImports } from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const getCreateRootCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ inputs }) => {
    const { createRoot } = imports;
    const root = createRoot(document.getElementById(inputs['id'] as string));
    return {
      root,
    };
  });

export default getCreateRootCompute;
