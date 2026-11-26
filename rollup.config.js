/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { babel } from '@rollup/plugin-babel';
import pkg from '@adobe/rollup-plugin-checksum';
import fs from 'fs';
import path from 'path';

const checksum = pkg.default;

const banner = `/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */`;

// Pinned copy of web-vitals for enhancer releases that predate the bundled CWV plugin and
// still load /.rum/web-vitals/dist/web-vitals.iife.js at runtime. The collector serves this
// file, which is listed in the release manifest, for that path instead of fetching the
// unversioned library from a public CDN. The bytes are the npm package's, unmodified.
const vendorWebVitals = {
  name: 'vendor-web-vitals',
  writeBundle() {
    fs.mkdirSync('src/vendor', { recursive: true });
    fs.copyFileSync('node_modules/web-vitals/dist/web-vitals.iife.js', 'src/vendor/web-vitals.iife.js');
  },
};

// Get list of plugins from the file system
const pluginFiles = fs.readdirSync('plugins').filter((file) => file.endsWith('.js'));
const plugins = pluginFiles.map((file) => path.basename(file, '.js'));

// Core library - index.js with sourcemap
const indexMapConfig = {
  input: 'modules/index.js',
  output: {
    file: 'src/index.map.js',
    format: 'iife',
    sourcemap: 'inline',
    exports: 'auto',
    banner,
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      comments: false,
    }),
  ],
};

// Core library - index.js without sourcemap, with MD5 and SRI.
// `compact` strips generated indentation and inter-statement whitespace only: no
// renaming, no mangling, no reordering, so the parsed program is unchanged and the
// bundle stays auditable. It buys ~930 bytes against the 16KB budget asserted in
// test/it/size.test.html. The debuggable build above keeps its formatting.
const indexConfig = {
  input: 'modules/index.js',
  output: {
    file: 'src/index.js',
    format: 'iife',
    compact: true,
    sourcemap: false,
    exports: 'auto',
    banner,
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      comments: false,
    }),
    checksum({
      filename: 'index.md5',
      includeAssets: false,
    }),
    vendorWebVitals,
    checksum({
      filename: 'index',
      includeAssets: false,
      sri: 'sha384',
    }),
  ],
};

// Plugins: build debuggable (.map.js) and production (.js) in separate configs so
// checksum runs only on the production bundle and never races across outputs.
const pluginBundles = plugins.flatMap((plugin) => [
  {
    input: `plugins/${plugin}.js`,
    output: {
      file: `src/plugins/${plugin}.map.js`,
      format: 'es',
      sourcemap: 'inline',
      exports: 'auto',
      banner,
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        comments: false,
      }),
    ],
  },
  {
    input: `plugins/${plugin}.js`,
    output: {
      file: `src/plugins/${plugin}.js`,
      format: 'es',
      sourcemap: false,
      exports: 'auto',
      banner,
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        comments: false,
      }),
      checksum({
        filename: `${plugin}.md5`,
        includeAssets: false,
      }),
    ],
  },
]);

export default [
  indexMapConfig,
  indexConfig,
  ...pluginBundles,
];
