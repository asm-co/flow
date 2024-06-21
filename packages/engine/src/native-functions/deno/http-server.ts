import { JsNodeComputeGenerator } from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const computeGenerator: JsNodeComputeGenerator = (imports) =>
  simpleNodeNativeCompute2NodeNativeCompute(
    ({ inputs, subFlowGroupFunctions, onRx }) => {
      const handler = Object.values(subFlowGroupFunctions)[0][0];
      const abortController = new (globalThis as any).AbortController();
      const server = (globalThis as any).Deno.serve(
        {
          port: inputs['port'],
          hostname: inputs['host'],
          signal: abortController.signal,
        },
        async (request: any, info: any) => {
          const res = await handler({ request, info });
          new Promise((resolve) => {
            setTimeout(resolve, 1000);
          }).then(() => {
            console.log('abort');
            abortController.abort('done');
          });
          return res['response'];
        }
      );
      onRx({
        next: (channel, value) => {
          if (channel === 'abort') {
            abortController.abort(value);
          }
        },
        complete: () => {
          abortController.abort('complete');
        },
      });

      return {};
    }
  );
export default computeGenerator;
