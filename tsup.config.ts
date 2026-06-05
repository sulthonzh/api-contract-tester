// Using TypeScript compiler directly
import { execSync } from 'child_process';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: 'cjs',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  minify: false,
  outDir: 'dist',
  external: [],
  esm: false,
  cjsInterop: true,
  platform: 'node',
  target: 'node18',
  treeshake: false,
});