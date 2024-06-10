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
import { urlSanitizers } from '../../src/utils.js';

describe('test utils#urlSanitizers', () => {
  it('urlSanitizers.full', () => {
    expect(urlSanitizers.full).to.be.a('function');
    expect(urlSanitizers.full()).to.be.a('string');
  });

  it('urlSanitizers.origin', () => {
    expect(urlSanitizers.origin).to.be.a('function');
    expect(urlSanitizers.origin()).to.be.a('string');
  });

  it('urlSanitizers.path', () => {
    expect(urlSanitizers.path).to.be.a('function');
    expect(urlSanitizers.path()).to.be.a('string');
  });
});
