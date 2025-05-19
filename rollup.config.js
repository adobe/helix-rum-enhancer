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
import pkg from 'rollup-plugin-checksum';

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

const bundles = [
  // Core library
  {
    source: 'modules/index.js',
    outputFile: 'src/index',
  },
  // Library plugins
  ...['cwv', 'form', 'martech', 'onetrust', 'video'].map((plugin) => ({
    source: `plugins/${plugin}.js`,
    outputFile: `src/plugins/${plugin}`,
    format: 'es',
  })),
];

export default [...bundles.map(({ outputFile, source, format }) => ({
  input: source,
  output: [
    {
      file: `${outputFile}.map.js`,
      format: format || 'iife',
      sourcemap: 'inline',
      exports: 'auto',
      banner,
    },
    {
      file: `${outputFile}.js`,
      format: format || 'iife',
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
      filename: `${outputFile.split('/').pop()}.md5`,
      includeAssets: false,
    }),
  ],
}))];
