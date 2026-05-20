import { defineConfig, loadEnv } from 'vite';
import pluginVue from '@vitejs/plugin-vue';
import pluginBasicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
// import { VitePWA as pluginVitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy as pluginViteStaticCopy } from 'vite-plugin-static-copy';
import pluginSitemap from 'vite-plugin-sitemap';
import pluginAutoprefixer from 'autoprefixer';
import routes from './src/routes';
// import pluginTsCompileServiceWorker from './src/serviceWorker/pluginTsCompileServiceWorker';
import pluginAssetsInserter from './src/serviceWorker/pluginAssetsListGenerator';
import pluginDynamicImport from 'vite-plugin-dynamic-import';
import pluginOpenGraph from 'vite-plugin-open-graph';

const pluginPrettier = () => ({ name: 'prettier' });

export default defineConfig(({ mode }: { command: 'build' | 'serve'; mode: 'development' | 'production' | string }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '.'));
  console.log(`Loaded env file(s) from: ${path.resolve(__dirname, '.')}:`, env);

  return {
    plugins: [
      pluginVue({
        include: [/\.vue$/],
      }),
      pluginDynamicImport(),
      pluginPrettier(),
      pluginViteStaticCopy({
        targets: [
          { src: 'static/favicon.ico', dest: 'static' },
          { src: 'static/open-graph-preview.png', dest: 'static' },
        ],
      }),
      pluginSitemap({
        hostname: `${/true/i.test(env.VITE_HTTPS) ? 'https' : 'http'}://${env.VITE_DEPLOY_HOSTNAME}`,
        dynamicRoutes: Object.keys(routes).filter(route => routes[route]),
        generateRobotsTxt: true,
      }),
      // pluginTsCompileServiceWorker(),
      // pluginVitePWA({
      //   strategies: 'injectManifest',
      //   injectRegister: false,
      //   injectManifest: {
      //     injectionPoint: undefined,
      //   },
      //   srcDir: 'dist',
      //   filename: 'sw.js',


      //   includeManifestIcons: true,
      //   includeAssets: ['/static/favicon.svg'],
      //   manifest: {
      //     short_name: 'Frontend Template',
      //     name: 'Frontend template with all best-practice instruments',
      //     description: 'Some description of our service',
      //     icons: [
      //       {
      //         src: '/static/favicon.svg',
      //         sizes: '32x32',
      //         type: 'image/png',
      //         purpose: 'maskable',
      //       },
      //     ],
      //     theme_color: '#181818',
      //     background_color: '#181818',
      //     display: 'standalone',
      //     id: '/?source=pwa',
      //     start_url: '/?source=pwa',
      //     scope: '/',
      //     prefer_related_applications: false,
      //     shortcuts: [
      //       {
      //         name: 'Home',
      //         short_name: 'Home',
      //         description: 'Our base page',
      //         url: '/?source=pwa',
      //       },
      //     ],
      //   },
      // }),
      pluginOpenGraph({
        basic: {
          title: 'Bubble AI',
          siteName: 'Bubble AI',
          description: 'AI интерфейс с ветвлением в диалогах для общения с совершенно разными нейросетями',
          type: 'image/png',
          url: `${env.VITE_HTTPS === 'true' ? 'https' : 'http'}://${env.VITE_DEPLOY_HOSTNAME}`,
          image: `${env.VITE_HTTPS === 'true' ? 'https' : 'http'}://${env.VITE_DEPLOY_HOSTNAME}/static/open-graph-preview.png`,
          determiner: 'auto',
          locale: 'ru_RU',
          localeAlternate: ['en_EN', 'es_ES'],
        }
      }),
      pluginAssetsInserter({
        outBuildDir: 'dist',
        additionalDirs: ['static'],
      }),
    ].concat(/true/i.test(env.VITE_HTTPS) ? [pluginBasicSsl()] : []),
    css: {
      postcss: {
        plugins: [
          pluginAutoprefixer(),
        ]
      }
    },
    define: {
      BUILD_TIMESTAMP: Date.now(),
      BUILD_VERSION: JSON.stringify(import('./package.json').version),
    },
    server: {
      https: /true/i.test(env.VITE_HTTPS),
      proxy: {
        // '/ws': {
        //   target: `ws://127.0.0.1:9000`,
        //   secure: true,
        //   ws: true,
        //   changeOrigin: true,
        // },
        '/api': {
          target: env.VITE_DEV_API_PROXY_URL,
          secure: false,
          changeOrigin: false,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
      },
    },
    resolve: {
      alias: [
        {
          find: '~', // to use ~ as project root like: "import Some from '~/components/Some.vue'"
          replacement: path.resolve(__dirname, 'src'),
        },
        {
          find: '#', // to use # as static root like: "import SomeResource from '#/icons/SomeResource.png'"
          replacement: path.resolve(__dirname, 'static'),
        },
        {
          find: '@~', // to use @~ as node_modules root like: "import Some from '@../../Some'"
          replacement: path.resolve(__dirname, 'node_modules'),
        },
      ],
    },
    build: {
      // chunkSizeWarningLimit: 600,
      modulePreload: false,
      target: 'esnext',
      minify: true,
      sourcemap: mode !== 'production',
      cssCodeSplit: false,
    },
    assetsInclude: [
      '**/*.hdr',
    ],
  };
});
