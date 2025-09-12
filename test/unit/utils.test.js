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

/* eslint-env mocha */

import assert from 'assert';
import { urlSanitizers } from '../../modules/utils.js';

describe('test utils#urlSanitizers', () => {
  it('urlSanitizers.full', () => {
    assert.strictEqual(typeof urlSanitizers.full, 'function');
    assert.strictEqual(typeof urlSanitizers.full(), 'string');

    assert.strictEqual(urlSanitizers.full('https://wwww.sample.com'), 'https://wwww.sample.com/');
    assert.strictEqual(urlSanitizers.full('https://wwww.sample.com/'), 'https://wwww.sample.com/');
    assert.strictEqual(urlSanitizers.full('https://wwww.sample.com/index.html'), 'https://wwww.sample.com/index.html');
    assert.strictEqual(urlSanitizers.full('https://wwww.sample.com/path/'), 'https://wwww.sample.com/path/');
    assert.strictEqual(urlSanitizers.full('https://wwww.sample.com/path/page.html'), 'https://wwww.sample.com/path/page.html');

    assert.strictEqual(urlSanitizers.full('https://wwww.sample.com/path/page.html?a=1&b=2'), 'https://wwww.sample.com/path/page.html?a=1&b=2');

    assert.strictEqual(urlSanitizers.full('http://localhost:3000'), 'http://localhost:3000/');
    assert.strictEqual(urlSanitizers.full('http://localhost:3000/'), 'http://localhost:3000/');
    assert.strictEqual(urlSanitizers.full('http://localhost:3000/index.html'), 'http://localhost:3000/index.html');
    assert.strictEqual(urlSanitizers.full('http://localhost:3000/path/'), 'http://localhost:3000/path/');
    assert.strictEqual(urlSanitizers.full('http://localhost:3000/path/page.html'), 'http://localhost:3000/path/page.html');

    assert.strictEqual(urlSanitizers.full('http://localhost:3000/path/page.html?a=1&b=2'), 'http://localhost:3000/path/page.html?a=1&b=2');
  });

  it('urlSanitizers.origin', () => {
    assert.strictEqual(typeof urlSanitizers.origin, 'function');
    assert.strictEqual(typeof urlSanitizers.origin(), 'string');

    assert.strictEqual(urlSanitizers.origin('https://wwww.sample.com'), 'https://wwww.sample.com');
    assert.strictEqual(urlSanitizers.origin('https://wwww.sample.com/'), 'https://wwww.sample.com');
    assert.strictEqual(urlSanitizers.origin('https://wwww.sample.com/index.html'), 'https://wwww.sample.com');
    assert.strictEqual(urlSanitizers.origin('https://wwww.sample.com/path/'), 'https://wwww.sample.com');
    assert.strictEqual(urlSanitizers.origin('https://wwww.sample.com/path/page.html'), 'https://wwww.sample.com');

    assert.strictEqual(urlSanitizers.origin('https://wwww.sample.com/path/page.html?a=1&b=2'), 'https://wwww.sample.com');

    assert.strictEqual(urlSanitizers.origin('http://localhost:3000'), 'http://localhost:3000');
    assert.strictEqual(urlSanitizers.origin('http://localhost:3000/'), 'http://localhost:3000');
    assert.strictEqual(urlSanitizers.origin('http://localhost:3000/index.html'), 'http://localhost:3000');
    assert.strictEqual(urlSanitizers.origin('http://localhost:3000/path/'), 'http://localhost:3000');
    assert.strictEqual(urlSanitizers.origin('http://localhost:3000/path/page.html'), 'http://localhost:3000');

    assert.strictEqual(urlSanitizers.origin('http://localhost:3000/path/page.html?a=1&b=2'), 'http://localhost:3000');
  });

  it('urlSanitizers.path', () => {
    assert.strictEqual(typeof urlSanitizers.path, 'function');
    assert.strictEqual(typeof urlSanitizers.path(), 'string');

    assert.strictEqual(urlSanitizers.path('https://wwww.sample.com'), 'https://wwww.sample.com/');
    assert.strictEqual(urlSanitizers.path('https://wwww.sample.com/'), 'https://wwww.sample.com/');
    assert.strictEqual(urlSanitizers.path('https://wwww.sample.com/index.html'), 'https://wwww.sample.com/index.html');
    assert.strictEqual(urlSanitizers.path('https://wwww.sample.com/path/'), 'https://wwww.sample.com/path/');
    assert.strictEqual(urlSanitizers.path('https://wwww.sample.com/path/page.html'), 'https://wwww.sample.com/path/page.html');

    assert.strictEqual(urlSanitizers.path('https://www.sample.com/?a=1&b=2'), 'https://www.sample.com/');
    assert.strictEqual(urlSanitizers.path('https://www.sample.com/path/page.html?a=1&b=2'), 'https://www.sample.com/path/page.html');

    assert.strictEqual(urlSanitizers.path('http://localhost:3000'), 'http://localhost:3000/');
    assert.strictEqual(urlSanitizers.path('http://localhost:3000/'), 'http://localhost:3000/');
    assert.strictEqual(urlSanitizers.path('http://localhost:3000/index.html'), 'http://localhost:3000/index.html');
    assert.strictEqual(urlSanitizers.path('http://localhost:3000/path/'), 'http://localhost:3000/path/');
    assert.strictEqual(urlSanitizers.path('http://localhost:3000/path/page.html'), 'http://localhost:3000/path/page.html');

    assert.strictEqual(urlSanitizers.path('http://localhost:3000/?a=1&b=2'), 'http://localhost:3000/');
    assert.strictEqual(urlSanitizers.path('http://localhost:3000/path/page.html?a=1&b=2'), 'http://localhost:3000/path/page.html');
  });
});
