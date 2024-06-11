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

import { expect } from '@esm-bundle/chai';
import { urlSanitizers } from '../../modules/utils.js';

describe('test utils#urlSanitizers', () => {
  it('urlSanitizers.full', () => {
    expect(urlSanitizers.full).to.be.a('function');
    expect(urlSanitizers.full()).to.be.a('string');

    expect(urlSanitizers.full('https://wwww.sample.com')).to.be.equal('https://wwww.sample.com/');
    expect(urlSanitizers.full('https://wwww.sample.com/')).to.be.equal('https://wwww.sample.com/');
    expect(urlSanitizers.full('https://wwww.sample.com/index.html')).to.be.equal('https://wwww.sample.com/index.html');
    expect(urlSanitizers.full('https://wwww.sample.com/path/')).to.be.equal('https://wwww.sample.com/path/');
    expect(urlSanitizers.full('https://wwww.sample.com/path/page.html')).to.be.equal('https://wwww.sample.com/path/page.html');

    expect(urlSanitizers.full('https://wwww.sample.com/path/page.html?a=1&b=2')).to.be.equal('https://wwww.sample.com/path/page.html?a=1&b=2');

    expect(urlSanitizers.full('http://localhost:3000')).to.be.equal('http://localhost:3000/');
    expect(urlSanitizers.full('http://localhost:3000/')).to.be.equal('http://localhost:3000/');
    expect(urlSanitizers.full('http://localhost:3000/index.html')).to.be.equal('http://localhost:3000/index.html');
    expect(urlSanitizers.full('http://localhost:3000/path/')).to.be.equal('http://localhost:3000/path/');
    expect(urlSanitizers.full('http://localhost:3000/path/page.html')).to.be.equal('http://localhost:3000/path/page.html');

    expect(urlSanitizers.full('http://localhost:3000/path/page.html?a=1&b=2')).to.be.equal('http://localhost:3000/path/page.html?a=1&b=2');
  });

  it('urlSanitizers.origin', () => {
    expect(urlSanitizers.origin).to.be.a('function');
    expect(urlSanitizers.origin()).to.be.a('string');

    expect(urlSanitizers.origin('https://wwww.sample.com')).to.be.equal('https://wwww.sample.com');
    expect(urlSanitizers.origin('https://wwww.sample.com/')).to.be.equal('https://wwww.sample.com');
    expect(urlSanitizers.origin('https://wwww.sample.com/index.html')).to.be.equal('https://wwww.sample.com');
    expect(urlSanitizers.origin('https://wwww.sample.com/path/')).to.be.equal('https://wwww.sample.com');
    expect(urlSanitizers.origin('https://wwww.sample.com/path/page.html')).to.be.equal('https://wwww.sample.com');

    expect(urlSanitizers.origin('https://wwww.sample.com/path/page.html?a=1&b=2')).to.be.equal('https://wwww.sample.com');

    expect(urlSanitizers.origin('http://localhost:3000')).to.be.equal('http://localhost:3000');
    expect(urlSanitizers.origin('http://localhost:3000/')).to.be.equal('http://localhost:3000');
    expect(urlSanitizers.origin('http://localhost:3000/index.html')).to.be.equal('http://localhost:3000');
    expect(urlSanitizers.origin('http://localhost:3000/path/')).to.be.equal('http://localhost:3000');
    expect(urlSanitizers.origin('http://localhost:3000/path/page.html')).to.be.equal('http://localhost:3000');

    expect(urlSanitizers.origin('http://localhost:3000/path/page.html?a=1&b=2')).to.be.equal('http://localhost:3000');
  });

  it('urlSanitizers.path', () => {
    expect(urlSanitizers.path).to.be.a('function');
    expect(urlSanitizers.path()).to.be.a('string');

    expect(urlSanitizers.path('https://wwww.sample.com')).to.be.equal('/');
    expect(urlSanitizers.path('https://wwww.sample.com/')).to.be.equal('/');
    expect(urlSanitizers.path('https://wwww.sample.com/index.html')).to.be.equal('/index.html');
    expect(urlSanitizers.path('https://wwww.sample.com/path/')).to.be.equal('/path/');
    expect(urlSanitizers.path('https://wwww.sample.com/path/page.html')).to.be.equal('/path/page.html');

    expect(urlSanitizers.path('https://wwww.sample.com/path/page.html')).to.be.equal('/path/page.html');

    expect(urlSanitizers.path('http://localhost:3000')).to.be.equal('/');
    expect(urlSanitizers.path('http://localhost:3000/')).to.be.equal('/');
    expect(urlSanitizers.path('http://localhost:3000/index.html')).to.be.equal('/index.html');
    expect(urlSanitizers.path('http://localhost:3000/path/')).to.be.equal('/path/');
    expect(urlSanitizers.path('http://localhost:3000/path/page.html')).to.be.equal('/path/page.html');

    expect(urlSanitizers.path('http://localhost:3000/path/page.html?a=1&b=2')).to.be.equal('/path/page.html');
  });
});
