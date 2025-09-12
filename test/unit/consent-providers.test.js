/*
 * Copyright 2025 Adobe. All rights reserved.
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

describe('Consent Provider Plugins - Execution Count Tests', () => {
  let mockCalls;
  let mockSampleRUM;

  beforeEach(() => {
    mockCalls = [];
    mockSampleRUM = (checkpoint, data) => {
      mockCalls.push({ checkpoint, ...data });
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.cookie = '';
    localStorage.clear();
  });

  describe('TrustArc Plugin', () => {
    it('should execute only once when called multiple times', async () => {
      const banner = document.createElement('div');
      banner.id = 'truste-consent-track';
      banner.style.height = '100px';
      document.body.appendChild(banner);

      const { default: addCookieConsentTracking } = await import('../../plugins/trustarc.js');

      addCookieConsentTracking({ sampleRUM: mockSampleRUM });
      addCookieConsentTracking({ sampleRUM: mockSampleRUM });

      const consentCalls = mockCalls.filter((call) => call.checkpoint === 'consent' && call.source === 'trustarc');
      assert.strictEqual(consentCalls.length, 1, 'TrustArc plugin should execute only once');
      assert.strictEqual(consentCalls[0].target, 'show');
      assert.strictEqual(consentCalls[0].source, 'trustarc');
    });
  });

  describe('OneTrust Plugin', () => {
    it('should execute only once when called multiple times', async () => {
      const banner = document.createElement('div');
      banner.id = 'onetrust-banner-sdk';
      banner.style.height = '100px';
      document.body.appendChild(banner);

      const { default: addCookieConsentTracking } = await import('../../plugins/onetrust.js');

      addCookieConsentTracking({ sampleRUM: mockSampleRUM });
      addCookieConsentTracking({ sampleRUM: mockSampleRUM });

      const consentCalls = mockCalls.filter((call) => call.checkpoint === 'consent' && call.source === 'onetrust');
      assert.strictEqual(consentCalls.length, 1, 'OneTrust plugin should execute only once');
      assert.strictEqual(consentCalls[0].target, 'show');
      assert.strictEqual(consentCalls[0].source, 'onetrust');
    });
  });

  describe('Usercentrics Plugin', () => {
    it('should execute only once when called multiple times', async () => {
      const root = document.createElement('div');
      root.id = 'usercentrics-root';
      const shadowRoot = root.attachShadow({ mode: 'open' });
      const banner = document.createElement('div');
      banner.id = 'uc-center-container';
      banner.style.height = '100px';
      shadowRoot.appendChild(banner);
      document.body.appendChild(root);

      const { default: addCookieConsentTracking } = await import('../../plugins/usercentrics.js');

      addCookieConsentTracking({ sampleRUM: mockSampleRUM });
      addCookieConsentTracking({ sampleRUM: mockSampleRUM });

      const consentCalls = mockCalls.filter((call) => call.checkpoint === 'consent' && call.source === 'usercentrics');
      assert.strictEqual(consentCalls.length, 1, 'Usercentrics plugin should execute only once');
      assert.strictEqual(consentCalls[0].target, 'show');
      assert.strictEqual(consentCalls[0].source, 'usercentrics');
    });
  });
});
