import { JsNodeComputeGenerator, RuntimeNodeImports } from '../../types';
import {
  isOk,
  Ok,
  simpleNodeNativeCompute2NodeNativeCompute,
} from '../../utils';

const getWebuiCompute: JsNodeComputeGenerator = (imports: RuntimeNodeImports) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ node, inputs, tx, onRx }) => {
    const bundles: Record<string, string> = node.staticInputs['bundles'];
    const jsText = Object.values(bundles)[0];
    const subFlowInputString = JSON.stringify(inputs['input']);
    // console.log('subFlowInputString', subFlowInputString);
    // console.log('jsText', jsText);

    const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no">
        <meta name="robots" content="index, follow">
        <script src="webui.js"></script>
      </head>
      <body>
        <div id="root">
        </div>
        <script>
        let handler;
        ${jsText}
        $module.runFlow(
          [${subFlowInputString}],
          (key,value)=>{
            console.log({key,value});
            webui.tx(JSON.stringify({key,value}))
          },
          (listener)=>handler=listener
          )
        function onRx(val){
          if(handler){
            handler(val.key,val.value)
          }
        }
        </script>
      </body>
    </html>
      `;
    // console.log(html);
    const webui = imports.WebUI;
    const mainWindow = new webui();
    mainWindow.bind('tx', (val: any) => {
      const res = JSON.parse(val.arg.string(0));
      if (isOk(res.value)) {
        tx(
          res.key,
          res.value.value,
          Object.keys(node.staticInputs['bundles'])[0]
        );
      }
    });
    onRx({
      next: (channel, value) => {
        mainWindow.run(
          `onRx(${JSON.stringify({ key: channel, value: Ok(value) })})`
        );
      },
    });

    mainWindow.show(html);
    webui.wait();
    return {};
  });

export default getWebuiCompute;
