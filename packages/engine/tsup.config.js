import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['./src/index.ts'], // your library path
  treeshake: false,
  minify: false,
  verbose: true,
  dts: false,
  external: [],
  bundle: true,
  clean: true,
  sourcemap: true,
  format: ['esm', 'cjs'],
  outDir: './dist', // build output
  onSuccess: 'tsc --emitDeclarationOnly',
  // noExternal: ['ff-common'],
}));
