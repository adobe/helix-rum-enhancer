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
import { fflags } from '../../src/fflags.js';

describe('test fflags', () => {
  it('fflags.has is a function', () => {
    expect(fflags.has).to.be.a('function');
  });

  it('fflags.has returns a boolean', () => {
    expect(fflags.has('onetrust')).to.be.a('boolean');
  });

  it('fflags.enabled is a function', () => {
    expect(fflags.enabled).to.be.a('function');
  });

  it('fflags.enabled returns a boolean', () => {
    expect(fflags.enabled('onetrust', () => true)).to.be.a('boolean');
  });

  it('fflags.disabled is a function', () => {
    expect(fflags.disabled).to.be.a('function');
  });

  it('fflags.disabled returns a boolean', () => {
    expect(fflags.disabled('onetrust', () => true)).to.be.a('boolean');
  });

  it('fflags.onetrust is an array', () => {
    expect(fflags.onetrust).to.be.an('array');
  });

  it('fflags.ads is an array', () => {
    expect(fflags.ads).to.be.an('array');
  });

  it('fflags.email is an array', () => {
    expect(fflags.email).to.be.an('array');
  });
});
