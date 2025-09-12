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
import { fflags } from '../../modules/fflags.js';

describe('test fflags', () => {
  it('fflags.has is a function', () => {
    assert.strictEqual(typeof fflags.has, 'function');
  });

  it('fflags.has returns a boolean', () => {
    assert.strictEqual(typeof fflags.has('example'), 'boolean');
  });

  it('fflags.enabled is a function', () => {
    assert.strictEqual(typeof fflags.enabled, 'function');
  });

  it('fflags.enabled returns a boolean', () => {
    assert.strictEqual(typeof fflags.enabled('example', () => true), 'boolean');
  });

  it('fflags.disabled is a function', () => {
    assert.strictEqual(typeof fflags.disabled, 'function');
  });

  it('fflags.disabled returns a boolean', () => {
    assert.strictEqual(typeof fflags.disabled('example', () => true), 'boolean');
  });

  it('fflags.example is an array', () => {
    assert.ok(Array.isArray(fflags.example));
  });
});
