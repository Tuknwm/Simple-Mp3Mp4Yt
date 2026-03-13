import { defineConfig } from 'vite'

export default defineConfig({
    css: {
        preprocessorOptions: {
            scss: {
                // silence deprecation warnings from sass
                silenceDeprecations: ['legacy-js-api'],
            }
        }
    }
})