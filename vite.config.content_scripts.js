import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig((opt) => {
  console.info(opt);
  return {
    root: 'src',
    plugins: [wasm()],
    build: {
      target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15'],
      outDir: '../dist',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          content_scripts: resolve(__dirname, 'src/content_scripts.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          inlineDynamicImports: true,
          format: 'iife',
        },
      },
    },
  };
});
