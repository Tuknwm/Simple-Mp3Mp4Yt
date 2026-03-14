import { defineConfig } from 'vite'

export default defineConfig({
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ['legacy-js-api'],
            }
        }
    },

    server: {
        open: '/loading.html',
    },

    build: {
        rollupOptions: {
            input: {
                main: 'loading.html',
                app: 'index.html'
            }
        }
    }
})