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
import { KNOWN_PROPERTIES, DEFAULT_TRACKING_EVENTS } from '../../modules/defaults.js';

describe('test defaults', () => {
  it('KNOWN_PROPERTIES is an array of string', () => {
    assert.ok(Array.isArray(KNOWN_PROPERTIES));
    KNOWN_PROPERTIES.forEach((prop) => {
      assert.strictEqual(typeof prop, 'string');
    });
  });

  it('DEFAULT_TRACKING_EVENTS is an array of string', () => {
    assert.ok(Array.isArray(DEFAULT_TRACKING_EVENTS));
    DEFAULT_TRACKING_EVENTS.forEach((prop) => {
      assert.strictEqual(typeof prop, 'string');
    });
  });
});
