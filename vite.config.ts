import type {ModuleFormat} from 'rollup';
import {defineConfig}      from 'vite';
import dts                 from 'vite-plugin-dts';

export default defineConfig({
    define : {
        'process.env': {
            NODE_ENV: 'production',
        },
    },
    build  : {
        lib          : {
            entry   : {
                index: './src/index.ts',
                'adapter/evm': './src/adapter/evm.ts',
            },
            formats : ['es'],
            fileName: (_: ModuleFormat, entryName: string) => {
                return entryName + '.js';
            },
        },
        rollupOptions: {
            external: [
                '@wagmi/core',
                'viem',
            ],
        },
    },
    plugins: [dts()],
});
