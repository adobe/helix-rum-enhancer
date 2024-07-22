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
/* eslint-disable no-unused-expressions */

import { expect } from '@esm-bundle/chai';
import { dataValidator, dataPreProcessor, urlSanitizers } from '../../modules/utils.js';

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

    expect(urlSanitizers.path('https://wwww.sample.com')).to.be.equal('https://wwww.sample.com/');
    expect(urlSanitizers.path('https://wwww.sample.com/')).to.be.equal('https://wwww.sample.com/');
    expect(urlSanitizers.path('https://wwww.sample.com/index.html')).to.be.equal('https://wwww.sample.com/index.html');
    expect(urlSanitizers.path('https://wwww.sample.com/path/')).to.be.equal('https://wwww.sample.com/path/');
    expect(urlSanitizers.path('https://wwww.sample.com/path/page.html')).to.be.equal('https://wwww.sample.com/path/page.html');

    expect(urlSanitizers.path('https://www.sample.com/?a=1&b=2')).to.be.equal('https://www.sample.com/');
    expect(urlSanitizers.path('https://www.sample.com/path/page.html?a=1&b=2')).to.be.equal('https://www.sample.com/path/page.html');

    expect(urlSanitizers.path('http://localhost:3000')).to.be.equal('http://localhost:3000/');
    expect(urlSanitizers.path('http://localhost:3000/')).to.be.equal('http://localhost:3000/');
    expect(urlSanitizers.path('http://localhost:3000/index.html')).to.be.equal('http://localhost:3000/index.html');
    expect(urlSanitizers.path('http://localhost:3000/path/')).to.be.equal('http://localhost:3000/path/');
    expect(urlSanitizers.path('http://localhost:3000/path/page.html')).to.be.equal('http://localhost:3000/path/page.html');

    expect(urlSanitizers.path('http://localhost:3000/?a=1&b=2')).to.be.equal('http://localhost:3000/');
    expect(urlSanitizers.path('http://localhost:3000/path/page.html?a=1&b=2')).to.be.equal('http://localhost:3000/path/page.html');
  });
});

describe('test utils#dataValidator', () => {
  describe('audience', () => {
    it('has a validator for the "audience" checkpoint', () => {
      expect(dataValidator.audience).to.be.ok;
    });

    it('validates that source and target are proper identifiers', () => {
      expect(dataValidator.audience({ source: 'foo', target: 'foo' })).to.be.true;
      expect(dataValidator.audience({ source: 'f-o-o', target: 'f-o-o' })).to.be.true;
      expect(dataValidator.audience({ source: 'f_o_o', target: 'f_o_o' })).to.be.true;
      expect(dataValidator.audience({ source: 'f00', target: 'f00' })).to.be.true;
      expect(dataValidator.audience({ source: 'foo', target: 'foo,bar,baz' })).to.be.true;
      expect(dataValidator.audience({ source: 'default', target: 'foo,bar,baz' })).to.be.true;

      expect(dataValidator.audience({ source: 'foo', target: 'bar,baz' })).to.be.false;
      expect(dataValidator.audience({ source: 'foo bar', target: 'baz qux' })).to.be.false;
      expect(dataValidator.audience({ source: 'foo!', target: 'foo!' })).to.be.false;
    });
  });

  describe('experiment', () => {
    it('has a validator for the "experiment" checkpoint', () => {
      expect(dataValidator.experiment).to.be.ok;
    });

    it('validates that source and target are proper identifiers', () => {
      expect(dataValidator.experiment({ source: 'foo', target: 'bar' })).to.be.true;
      expect(dataValidator.experiment({ source: 'f-o-o', target: 'b-a-r' })).to.be.true;
      expect(dataValidator.experiment({ source: 'f_o_o', target: 'b_a_r' })).to.be.true;
      expect(dataValidator.experiment({ source: 'f00', target: 'b4r' })).to.be.true;

      expect(dataValidator.experiment({ source: 'foo', target: 'bar:baz' })).to.be.false;
      expect(dataValidator.experiment({ source: 'foo bar', target: 'baz qux' })).to.be.false;
      expect(dataValidator.experiment({ source: 'foo!', target: 'bar?' })).to.be.false;
    });
  });
});

describe('test utils#dataPreProcessor', () => {
  describe('audience', () => {
    let rnd;

    before(() => {
      rnd = Math.random();
    });

    after(() => {
      Math.random = rnd;
    });

    it('returns the original audience if we are above the randomization threshold', () => {
      Math.random = () => 0.6;
      const data = dataPreProcessor.audience({ source: 'foo', target: 'foo,bar' });
      expect(data.source).to.eq('foo');
      expect(data.target).to.eq('default:foo:bar');
    });

    it('returns a random audience if we are below the randomization threshold', () => {
      Math.random = () => 0.59;
      const data = dataPreProcessor.audience({ source: 'foo', target: 'foo,bar' });
      expect(['default', 'foo', 'bar'].includes(data.source)).to.true;
      expect(data.target).to.eq('default:foo:bar');
    });
  });
});
