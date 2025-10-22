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
    checksum({
      filename: 'index.md5',
      includeAssets: false,
    }),
  ],
};

// Core library - index.js without sourcemap, with MD5 and SRI
const indexConfig = {
  input: 'modules/index.js',
  output: {
    file: 'src/index.js',
    format: 'iife',
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
    checksum({
      filename: 'index',
      includeAssets: false,
      sri: 'sha384',
    }),
  ],
};

// Plugins
const pluginBundles = plugins.map((plugin) => ({
  input: `plugins/${plugin}.js`,
  output: [
    {
      file: `src/plugins/${plugin}.map.js`,
      format: 'es',
      sourcemap: 'inline',
      exports: 'auto',
      banner,
    },
    {
      file: `src/plugins/${plugin}.js`,
      format: 'es',
      sourcemap: false,
      exports: 'auto',
      banner,
    },
  ],
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
}));

export default [
  indexMapConfig,
  indexConfig,
  ...pluginBundles,
];
