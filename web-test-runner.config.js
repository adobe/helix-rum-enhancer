/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
export default {
  testFramework: {
    type: 'mocha',
    config: {
      timeout: 10000,
    },
  },
  coverageConfig: {
    report: true,
    reportDir: 'coverage',
    exclude: [
      'test/fixtures/**',
      'node_modules/**',
      '.rum/**',
      'src/index.js',
    ],
  },
  files: [
    'test/**/*.test.{html,js}',
    'test/*.test.{html,js}',
  ],
  middleware: [
    async function emulateRUM(context, next) {
      if (context.url.startsWith('/src/index.map.js')) {
        await next();
        context.body = context.body
          .replace(/navigator\.sendBeacon/g, 'fakeSendBeacon')
          // rewriting dynamic plugins base url
          .replace(/document\.currentScript\.src/g, '"http://localhost:8000/plugins"');
        return true;
      } else if (context.url.startsWith('/src/index.js')
          || context.url.startsWith('/modules/index.js')) {
        await next();
        context.body = context.body
          // rewriting dynamic plugins base url
          .replace(/document\.currentScript\.src/g, '"http://localhost:8000/plugins"');
        return true;
      } else if (context.url.startsWith('/modules/index-broken.js')) {
        const [_, search] = context.url.split('?');
        context.url = `/modules/index.js?${search}`;
        await next();
        context.body = context.body
          // rewriting dynamic plugins base url
          .replace(/document\.currentScript\.src/g, '"http://localhost:8000/plugins"')
          .replace(/\/\/ test: broken-plugin/g, 'foo: "foo.js",');
        return true;
      } else if (context.url.startsWith('/.rum')) {
        if (context.url.startsWith('/.rum/@adobe/helix-rum-js@%5E2/dist/')
          || context.url.startsWith('/.rum/@adobe/helix-rum-js@^2/dist/')
        ) {
          context.url = '/node_modules/@adobe/helix-rum-js/dist/rum-standalone.js';
          await next();
          context.body = context.body
            .replace(/const weight =/, 'const weight = 1 ||')
            .replace(/navigator\.sendBeacon/g, 'fakeSendBeacon')
            // eslint-disable-next-line no-template-curly-in-string
            .replace('.rum/@adobe/helix-rum-enhancer@${enhancerVersion || \'^2\'}/src/index.js', 'src/index.map.js');
          return true;
        } else if (context.url.startsWith('/.rum/web-vitals')) {
          context.url = '/node_modules/web-vitals/dist/web-vitals.iife.js';
          await next();
          return true;
        } else if (context.url === '/.rum/1') {
          // return a 201 response and do nothing
          context.status = 201;
          return true;
        }
      }
      return next();
    },
  ],
};
