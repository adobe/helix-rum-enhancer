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
import eslint from 'rollup-plugin-eslint-bundle';

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
 */

/* eslint-disable max-classes-per-file, wrap-iife */
// eslint-disable-next-line func-names`;

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
      comments: ['eslint', 'jsdoc', /^\//, /^\*(?!\sc8\s)(?!\n \* Copyright)/],
      maxEmptyLines: -1,
    }),
    eslint({
      eslintOptions: {
        fix: true,
      },
    }),
  ],
}))];
