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
import { getTargetValue, targetselector } from '../../src/dom.js';

describe('test dom#getTargetValue', () => {
  it('getTargetValue - basics', () => {
    expect(getTargetValue).to.be.a('function');
  });

  it('getTargetValue - select data-rum-target attr', () => {
    const div = document.createElement('div');
    div.setAttribute('data-rum-target', 'test');
    expect(getTargetValue(div)).to.be.equal('test');
  });

  it('getTargetValue - select href attr', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com');
    expect(getTargetValue(a)).to.be.equal('https://www.example.com');
  });

  it('getTargetValue - select currentSrc attr', () => {
    const img = document.createElement('img');
    img.src = 'https://www.example.com/img.jpg';
    expect(getTargetValue(img)).to.be.equal('https://www.example.com/img.jpg');
  });

  it('getTargetValue - select src attr', () => {
    const img = document.createElement('img');
    img.setAttribute('src', 'https://www.example.com/img.jpg');
    expect(getTargetValue(img)).to.be.equal('https://www.example.com/img.jpg');
  });

  it('getTargetValue - select data-action attr', () => {
    const form = document.createElement('form');
    form.setAttribute('data-action', 'https://www.example.com/action');
    expect(getTargetValue(form)).to.be.equal('https://www.example.com/action');
  });

  it('getTargetValue - select action attr', () => {
    const form = document.createElement('form');
    form.setAttribute('action', 'https://www.example.com/action');
    expect(getTargetValue(form)).to.be.equal('https://www.example.com/action');
  });
});

describe('test dom#targetselector', () => {
  it('targetselector - basics', () => {
    expect(targetselector).to.be.a('function');
    // eslint-disable-next-line no-unused-expressions
    expect(targetselector()).to.be.undefined;
  });

  it('targetselector - select target for link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com');
    expect(targetselector(a)).to.be.equal('https://www.example.com');
  });

  it('targetselector - select target for relative link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', '/target.html');
    expect(targetselector(a)).to.be.equal('http://localhost:8000/target.html');
  });

  it('targetselector - select target for span in a link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com/target.html');
    const span = document.createElement('span');
    span.textContent = 'test';
    a.append(span);
    expect(targetselector(span)).to.be.equal('https://www.example.com/target.html');
  });

  it('targetselector - select target for span with data-rum-target in a link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com/target.html');
    const span = document.createElement('span');
    span.textContent = 'test';
    span.setAttribute('data-rum-target', 'test');
    a.append(span);
    expect(targetselector(span)).to.be.equal('http://localhost:8000/test');
  });

  it('targetselector - select target for img', () => {
    const img = document.createElement('img');
    img.src = 'https://www.example.com/img.jpg';
    expect(targetselector(img)).to.be.equal('https://www.example.com/img.jpg');
  });
});
