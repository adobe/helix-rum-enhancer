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
import { getTargetValue, targetSelector, sourceSelector } from '../../src/dom.js';

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

describe('test dom#targetSelector', () => {
  it('targetSelector - basics', () => {
    expect(targetSelector).to.be.a('function');
    // eslint-disable-next-line no-unused-expressions
    expect(targetSelector()).to.be.undefined;
  });

  it('targetSelector - select target for link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com');
    expect(targetSelector(a)).to.be.equal('https://www.example.com');
  });

  it('targetSelector - select target for relative link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', '/target.html');
    expect(targetSelector(a)).to.be.equal('http://localhost:8000/target.html');
  });

  it('targetSelector - select target for span in a link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com/target.html');
    const span = document.createElement('span');
    span.textContent = 'test';
    a.append(span);
    expect(targetSelector(span)).to.be.equal('https://www.example.com/target.html');
  });

  it('targetSelector - select target for span with data-rum-target in a link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com/target.html');
    const span = document.createElement('span');
    span.textContent = 'test';
    span.setAttribute('data-rum-target', 'test');
    a.append(span);
    expect(targetSelector(span)).to.be.equal('http://localhost:8000/test');
  });

  it('targetSelector - select target for img', () => {
    const img = document.createElement('img');
    img.src = 'https://www.example.com/img.jpg';
    expect(targetSelector(img)).to.be.equal('https://www.example.com/img.jpg');
  });
});

describe('test dom#sourceSelector', () => {
  it('sourceSelector - basics', () => {
    expect(sourceSelector).to.be.a('function');
    // eslint-disable-next-line no-unused-expressions
    expect(sourceSelector()).to.be.undefined;
  });

  it('sourceSelector - select source when data-rum-source is set ', () => {
    const div = document.createElement('div');
    div.setAttribute('data-rum-source', 'test');
    expect(sourceSelector(div)).to.be.equal('test');

    // works also for nested elements
    const span = document.createElement('span');
    div.append(span);
    expect(sourceSelector(span)).to.be.equal('test');
  });

  it('sourceSelector - select source for form and inputs', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    form.append(input);
    const textarea = document.createElement('textarea');
    form.append(textarea);

    expect(sourceSelector(input)).to.be.equal('form input[type=\'text\']');
    expect(sourceSelector(textarea)).to.be.equal('form textarea');
  });

  it('sourceSelector - select source for block', () => {
    const div = document.createElement('div');
    div.classList.add('block');
    div.setAttribute('data-block-name', 'test');
    expect(sourceSelector(div)).to.be.equal('.test');
  });

  it('sourceSelector - select source for button', () => {
    const button = document.createElement('button');
    button.classList.add('button');
    expect(sourceSelector(button)).to.be.equal('.button');
  });

  it('sourceSelector - select source for cta', () => {
    const div = document.createElement('div');
    div.classList.add('cta');
    expect(sourceSelector(div)).to.be.equal('.button');
  });
});
