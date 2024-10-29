import {defineConfig} from 'vite';
import dts            from 'vite-plugin-dts';

export default defineConfig({
    define : {
        'process.env': {
            NODE_ENV: 'production',
        },
    },
    build  : {
        lib          : {
            entry  : './src/index.ts',
            formats: ['es'], // pure ESM package
        },
        rollupOptions: {
            external: [
                '@wagmi/core',
                'viem',
            ],
        },
    },
    plugins: [dts()], // emit TS declaration files
});
