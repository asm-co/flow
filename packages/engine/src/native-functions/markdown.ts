import { JsNodeComputeGenerator, RuntimeNodeImports } from '../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../utils';

const getMarkdownCompute: JsNodeComputeGenerator = (
  imports: RuntimeNodeImports
) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ node, inputs }) => {
    const tpl = imports.Handlebars.compile(node.staticInputs.value);
    return {
      value: tpl(inputs),
    };
  });

export default getMarkdownCompute;
