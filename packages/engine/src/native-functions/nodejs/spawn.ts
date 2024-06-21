import { JsNodeComputeGenerator, RuntimeNodeImports } from '../../types';
import { simpleNodeNativeCompute2NodeNativeCompute } from '../../utils';

const getSpawnCompute: JsNodeComputeGenerator = (imports: RuntimeNodeImports) =>
  simpleNodeNativeCompute2NodeNativeCompute(({ inputs, tx, onRx }) => {
    const command = inputs['command'];
    const args = inputs['args'];
    const spawn = imports.spawn;
    const child = spawn(command, args);
    child.stdout.on('data', (data: any) => {
      tx('stdout', data);
    });
    child.stderr.on('data', (data: any) => {
      tx('stderr', data);
    });
    child.on('close', (code: any) => {
      tx('exitCode', code);
    });
    onRx({
      next: (portKey: string, val: any) => {
        if (portKey === 'stdin') {
          child.stdin.write(val);
        }
      },
    });
    return {};
  });

export default getSpawnCompute;
