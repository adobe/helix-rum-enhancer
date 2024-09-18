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

import cleanup from 'rollup-plugin-cleanup';
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
  {
    source: 'modules/index.js',
    outputFile: 'src/index',
  },
];

export default [...bundles.map(({ outputFile, source }) => ({
  input: source,
  output: [
    {
      file: `${outputFile}.js`,
      format: 'iife',
      sourcemap: false,
      exports: 'auto',
      banner,
    },
    {
      file: `${outputFile}.map.js`,
      format: 'iife',
      sourcemap: 'inline',
      exports: 'auto',
      banner,
    },
  ],
  plugins: [
    cleanup({
      comments: [],
      maxEmptyLines: 0,
    }),
    checksum({
      filename: `${outputFile.split('/').pop()}.md5`,
      includeAssets: false,
    }),
  ],
}))];
