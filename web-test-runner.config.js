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
import { fromRollup, rollupAdapter, rollupBundlePlugin } from '@web/dev-server-rollup';
import rollupBabel from '@rollup/plugin-babel';

const babel = fromRollup(rollupBabel);
export default {
  coverageConfig: {
    report: true,
    reporters: ['lcov', 'text-summary', 'cobertura'],
    reportDir: 'coverage',
    exclude: [
      'test/fixtures/**',
      'node_modules/**',
    ],
  },
  files: [
    'test/**/*.test.{html,js}',
    'test/*.test.{html,js}',
  ],
  plugins: [
    rollupBundlePlugin(
      {
        rollupConfig: {
          input: ['modules/index.js'],
        },
      },
    ),
    babel({
      plugins: ['babel-plugin-istanbul'],
    }),
  ],
  middleware: [
    async function emulateRUM(context, next) {
      if (context.url.startsWith('/.rum')) {
        if (context.url.startsWith('/.rum/@adobe/helix-rum-enhancer@%5E2/src/')
          || context.url.startsWith('/.rum/@adobe/helix-rum-enhancer@^2/src/')) {
          console.log('rum enhancer has been replaced');
          context.url = context.url
            .replace('/.rum/@adobe/helix-rum-enhancer@%5E2/src/', '/modules/')
            .replace('/.rum/@adobe/helix-rum-enhancer@^2/src/', '/modules/');

          return next();
        } else if (context.url.startsWith('/.rum/@adobe/helix-rum-js@%5E2/dist/')
          || context.url.startsWith('/.rum/@adobe/helix-rum-js@^2/dist/')
        ) {
          context.url = '/node_modules/@adobe/helix-rum-js/dist/rum-standalone.js';
          await next();
          context.body = context.body
            .replace(/const weight.*/, 'const weight = 1;')
            .replace(/navigator\.sendBeacon/g, 'fakeSendBeacon');
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
