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
import { getTargetValue, targetSelector, sourceSelector } from '../../modules/dom.js';

describe('test dom#getTargetValue', () => {
  it('getTargetValue - basics', () => {
    assert.strictEqual(typeof getTargetValue, 'function');
  });

  it('getTargetValue - select data-rum-target attr', () => {
    const div = document.createElement('div');
    div.setAttribute('data-rum-target', 'test');
    assert.strictEqual(getTargetValue(div), 'test');
  });

  it('getTargetValue - select href attr', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com');
    assert.strictEqual(getTargetValue(a), 'https://www.example.com');
  });

  it('getTargetValue - select currentSrc attr', () => {
    const img = document.createElement('img');
    img.src = 'https://www.example.com/img.jpg';
    assert.strictEqual(getTargetValue(img), 'https://www.example.com/img.jpg');
  });

  it('getTargetValue - select src attr', () => {
    const img = document.createElement('img');
    img.setAttribute('src', 'https://www.example.com/img.jpg');
    assert.strictEqual(getTargetValue(img), 'https://www.example.com/img.jpg');
  });

  it('getTargetValue - select data-action attr', () => {
    const form = document.createElement('form');
    form.setAttribute('data-action', 'https://www.example.com/action');
    assert.strictEqual(getTargetValue(form), 'https://www.example.com/action');
  });

  it('getTargetValue - select action attr', () => {
    const form = document.createElement('form');
    form.setAttribute('action', 'https://www.example.com/action');
    assert.strictEqual(getTargetValue(form), 'https://www.example.com/action');
  });
});

describe('test dom#targetSelector', () => {
  it('targetSelector - basics', () => {
    assert.strictEqual(typeof targetSelector, 'function');
    assert.strictEqual(targetSelector(), undefined);
  });

  it('targetSelector - select target for link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com');
    assert.strictEqual(targetSelector(a), 'https://www.example.com');
  });

  it('targetSelector - select target for relative link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', '/target.html');
    assert.strictEqual(targetSelector(a), `${window.location.origin}/target.html`);
  });

  it('targetSelector - select target for span in a link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com/target.html');
    const span = document.createElement('span');
    span.textContent = 'test';
    a.append(span);
    assert.strictEqual(targetSelector(span), 'https://www.example.com/target.html');
  });

  it('targetSelector - select target for span with data-rum-target in a link', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'https://www.example.com/target.html');
    const span = document.createElement('span');
    span.textContent = 'test';
    span.setAttribute('data-rum-target', 'test');
    a.append(span);
    assert.strictEqual(targetSelector(span), `${window.location.origin}/test`);
  });

  it('targetSelector - select target for img', () => {
    const img = document.createElement('img');
    img.src = 'https://www.example.com/img.jpg';
    assert.strictEqual(targetSelector(img), 'https://www.example.com/img.jpg');
  });
});

describe('test dom#sourceSelector', () => {
  it('sourceSelector - basics', () => {
    assert.strictEqual(typeof sourceSelector, 'function');
    assert.strictEqual(sourceSelector(), undefined);
  });

  it('sourceSelector - select form by class', () => {
    const form = document.createElement('form');
    form.classList.add('form-class');
    form.classList.add('form-class-2');
    document.body.append(form);
    assert.strictEqual(sourceSelector(form), 'form.form-class');
  });

  it('sourceSelector - select form by id', () => {
    const form = document.createElement('form');
    form.id = 'form-id';
    document.body.append(form);
    assert.strictEqual(sourceSelector(form), 'form#form-id');
  });

  it('sourceSelector - should escape invalid characters', () => {
    const form1 = document.createElement('form');
    const container = document.createElement('div');
    container.id = 'contentcontainer-9065752e10';
    form1.id = '389';
    container.append(form1);
    document.body.append(container);

    const form2 = document.createElement('form');
    form2.classList.add('123abc');
    document.body.append(form2);

    const form3 = document.createElement('form');
    form3.id = 'eec6b0d9-bd39-42aa-9f96-29a7aced9765/root/container/modal';
    document.body.append(form3);

    assert.strictEqual(sourceSelector(form1), '#contentcontainer-9065752e10 form#\\33 89');
    assert.strictEqual(sourceSelector(form2), 'form.\\31 23abc');
    assert.strictEqual(sourceSelector(form3), 'form#eec6b0d9-bd39-42aa-9f96-29a7aced9765\\/root\\/container\\/modal');
  });
});
