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
import { getTargetValue } from '../../src/dom.js';

describe('test dom#getTargetValue', () => {
  it('getTargetValue basics', () => {
    expect(getTargetValue).to.be.a('function');
  });

  it('getTargetValue - select data-rum-target attr', () => {
    const div = document.createElement('div');
    div.setAttribute('data-rum-target', 'test');
    expect(getTargetValue(div)).to.be.equal('test');
  });

  it('getTargetValue - select href attr', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'http://www.example.com');
    expect(getTargetValue(a)).to.be.equal('http://www.example.com');
  });

  it('getTargetValue - select currentSrc attr', () => {
    const img = document.createElement('img');
    img.src = 'http://www.example.com/img.jpg';
    expect(getTargetValue(img)).to.be.equal('http://www.example.com/img.jpg');
  });

  it('getTargetValue - select src attr', () => {
    const img = document.createElement('img');
    img.setAttribute('src', 'http://www.example.com/img.jpg');
    expect(getTargetValue(img)).to.be.equal('http://www.example.com/img.jpg');
  });

  it('getTargetValue - select data-action attr', () => {
    const form = document.createElement('form');
    form.setAttribute('data-action', 'http://www.example.com/action');
    expect(getTargetValue(form)).to.be.equal('http://www.example.com/action');
  });

  it('getTargetValue - select action attr', () => {
    const form = document.createElement('form');
    form.setAttribute('action', 'http://www.example.com/action');
    expect(getTargetValue(form)).to.be.equal('http://www.example.com/action');
  });
});
