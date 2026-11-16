/*
 * Copyright 2026 Adobe. All rights reserved.
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
import { classifyConsent, getCookie, getLocalStorage } from '../../modules/consent.js';
import onetrust, { getConsentTarget as oneTrustTarget } from '../../plugins/onetrust.js';
import trustarc, { getConsentTarget as trustArcTarget } from '../../plugins/trustarc.js';
import usercentrics, { getConsentTarget as usercentricsTarget } from '../../plugins/usercentrics.js';

const signals = ['adStorage', 'analyticsStorage', 'adPersonalization', 'adUserData'];
const categories = ['functional', 'marketing', 'analytics', 'personalisation'];
const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
let cookies;

function setOneTrust(groups, fields = {}, closed = true) {
  cookies = [`OptanonConsent=${new URLSearchParams({ groups, ...fields })}`];
  if (closed) {
    cookies.push('OptanonAlertBoxClosed=2026-11-13T00:00:00Z');
  }
}

function setGCM(values) {
  localStorage.setItem('uc_gcm', JSON.stringify(Object.fromEntries(
    signals.map((key, index) => [key, values[index]]),
  )));
}

function setCategoryCookies(values) {
  cookies = ['uc_consent_status_essential=true', ...categories.map(
    (key, index) => `uc_consent_status_${key}=${values[index]}`,
  )];
}

function banner(id) {
  const el = document.createElement('div');
  el.id = id;
  el.style.height = '100px';
  document.body.append(el);
  return el;
}

function blockStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new Error('storage blocked'); },
  });
}

describe('Stored consent choices', () => {
  beforeEach(() => {
    cookies = [];
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => cookies.join('; '),
    });
    localStorage.clear();
  });

  afterEach(() => {
    delete document.cookie;
    Object.defineProperty(window, 'localStorage', storageDescriptor);
    localStorage.clear();
    document.body.innerHTML = '';
  });

  describe('safe readers and classification', () => {
    it('matches exact cookie names and preserves equals signs in values', () => {
      cookies = ['OtherOptanonConsent=wrong', 'OptanonConsent=groups=C0001:1'];
      expect(getCookie('OptanonConsent')).to.equal('groups=C0001:1');
      expect(getCookie('Optanon')).to.equal(undefined);
    });

    it('does not select an arbitrary value from duplicate cookies', () => {
      cookies = ['OptanonConsent=a', 'OptanonConsent=b'];
      expect(getCookie('OptanonConsent')).to.equal(null);
    });

    it('tolerates blocked cookies and localStorage', () => {
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get() { throw new Error('cookies blocked'); },
      });
      blockStorage();
      expect(getCookie('OptanonConsent')).to.equal(undefined);
      expect(getLocalStorage('uc_gcm')).to.equal(null);
      expect(oneTrustTarget()).to.equal('suppressed');
      expect(trustArcTarget()).to.equal('suppressed');
      expect(usercentricsTarget()).to.equal('suppressed');
    });

    [[], [undefined], [true, null], [1, 0], ['true'], new Array(65).fill(true)].forEach((values, i) => {
      it(`does not classify incomplete or invalid choice set ${i}`, () => {
        expect(classifyConsent(values)).to.equal(undefined);
      });
    });
  });

  describe('OneTrust', () => {
    [
      ['C0001:1,C0002:1,C0004:1', 'granted'],
      ['C0001:1,C0002:0,C0004:0', 'rejected'],
      ['C0001:1,C0002:1,C0004:0', 'customized'],
      ['C0004:0,C0001:1,C0002:1', 'customized'],
      ['1:1,4:1', 'granted'],
      ['1:1,4:0', 'rejected'],
      ['1:1,2:1,4:0', 'customized'],
      ['C0001:1,C0002:1,C0011:0', 'customized'],
      ['C0001:1,C0002:0,C0011:0', 'rejected'],
    ].forEach(([groups, expected]) => {
      it(`reports ${expected} for ${groups} with or without a dismissal cookie`, () => {
        setOneTrust(groups);
        expect(oneTrustTarget()).to.equal(expected);
        setOneTrust(groups, {}, false);
        expect(oneTrustTarget()).to.equal(expected);
      });
    });

    it('reads a fully encoded cookie as well as encoded fields', () => {
      setOneTrust('C0001:1,C0002:1');
      cookies[0] = `OptanonConsent=${encodeURIComponent('groups=C0001:1,C0002:1')}`;
      expect(oneTrustTarget()).to.equal('granted');
    });

    it('reads the stored level when an interaction counter is present', () => {
      setOneTrust('C0001:1,C0002:0', { interactionCount: '1' }, false);
      expect(oneTrustTarget()).to.equal('rejected');
    });

    [undefined, '0', '-1', '1x', 'NaN', 'Infinity', '0.5'].forEach((count) => {
      [
        ['1:1,4:1', 'granted'],
        ['C0001:1,C0002:0,C0004:0', 'rejected'],
        ['C0001:1,C0002:1,C0004:0', 'customized'],
      ].forEach(([groups, expected]) => {
        it(`reports ${expected} independently of interactionCount=${count}`, () => {
          setOneTrust(groups, count === undefined ? {} : { interactionCount: count }, false);
          expect(oneTrustTarget()).to.equal(expected);
          banner('onetrust-banner-sdk');
          expect(oneTrustTarget()).to.equal(expected);
        });
      });
    });

    it('does not double-decode group values', () => {
      setOneTrust('C0001%3A1%2CC0002%3A1');
      expect(oneTrustTarget()).to.equal('hidden');
    });

    it('reports the same level before and after interaction when groups are unchanged', () => {
      setOneTrust('C0001:1,C0002:0,C0004:0', { interactionCount: '0' }, false);
      banner('onetrust-banner-sdk');
      expect(oneTrustTarget()).to.equal('rejected');
      setOneTrust('C0001:1,C0002:0,C0004:0', { interactionCount: '1' });
      expect(oneTrustTarget()).to.equal('rejected');
    });

    it('does not classify stale choices while reconsent is pending', () => {
      setOneTrust('C0001:1,C0002:1', { interactionCount: '2', AwaitingReconsent: 'true' });
      expect(oneTrustTarget()).to.equal('suppressed');
      banner('onetrust-banner-sdk');
      expect(oneTrustTarget()).to.equal('show');
    });

    it('accepts an explicitly completed reconsent flag', () => {
      setOneTrust('C0001:1,C0002:1', { AwaitingReconsent: 'false' });
      expect(oneTrustTarget()).to.equal('granted');
    });

    [
      '', 'C0001:1', 'C0001:0,C0002:1', 'C0002:1', 'C0001:1,1:1,C0002:0',
      'C0001:1,C0002:1,C0002:0', 'C0001:1,C0002:1,C0002:1',
      'C0001:1,C0002:yes', 'C0001:1,C0002:2', 'C0001:1,C0002:1,',
      'C0001:1,unknown:1', 'C0001:1,C0002:1:0', 'C0001:1,C0002:%FF',
    ].forEach((groups) => {
      it(`retains hidden for ambiguous or invalid groups ${groups}`, () => {
        setOneTrust(groups);
        expect(oneTrustTarget()).to.equal('hidden');
      });
    });

    it('bounds the category count and cookie length', () => {
      setOneTrust(`1:1,${Array.from({ length: 65 }, (_, i) => `${i + 2}:1`).join(',')}`);
      expect(oneTrustTarget()).to.equal('hidden');
      setOneTrust('C0001:1,C0002:1', { extra: 'x'.repeat(4096) });
      expect(oneTrustTarget()).to.equal('hidden');
    });

    ['groups=C0001:1,C0002:0', 'AwaitingReconsent=true&AwaitingReconsent=false'].forEach((extra) => {
      it(`rejects duplicate fields: ${extra}`, () => {
        setOneTrust('C0001:1,C0002:1');
        cookies[0] += `&${extra}`;
        expect(oneTrustTarget()).to.not.equal('granted');
      });
    });

    it('ignores duplicate interaction counters without a dismissal cookie', () => {
      setOneTrust('C0001:1,C0002:1', { interactionCount: '1' }, false);
      cookies[0] += '&interactionCount=0';
      expect(oneTrustTarget()).to.equal('granted');
    });

    it('ignores invalid interaction counters with a dismissal cookie too', () => {
      setOneTrust('C0001:1,C0002:1', { interactionCount: 'invalid' });
      expect(oneTrustTarget()).to.equal('granted');
      setOneTrust('C0001:1,C0002:1', { interactionCount: '1' });
      cookies[0] += '&interactionCount=0';
      expect(oneTrustTarget()).to.equal('granted');
    });

    it('classifies a valid level even when the dismissal cookie is empty', () => {
      setOneTrust('C0001:1,C0002:1', {}, false);
      cookies.push('OptanonAlertBoxClosed=');
      expect(oneTrustTarget()).to.equal('granted');
    });

    it('tolerates missing or broken cookie payloads', () => {
      cookies = ['OptanonAlertBoxClosed=recorded'];
      expect(oneTrustTarget()).to.equal('hidden');
      cookies.push('OptanonConsent=%FF');
      expect(oneTrustTarget()).to.equal('hidden');
    });
  });

  describe('TrustArc', () => {
    [
      ['0', 'rejected'], ['0:', 'rejected'], ['0,1:', 'customized'],
      ['0,2:', 'customized'], ['0,1,2:', 'granted'], ['2,0,1:', 'granted'],
      ['0%2C1%2C2%3A%3Aexpressed%2Ceu', 'granted'],
    ].forEach(([value, expected]) => {
      it(`reports ${expected} for granular preferences ${value}`, () => {
        cookies = [`notice_gdpr_prefs=${value}`];
        expect(trustArcTarget()).to.equal(expected);
      });
    });

    ['rejected', 'customized', 'granted'].forEach((expected, level) => {
      it(`reports ${expected} for legacy slider ${level}`, () => {
        cookies = [`notice_preferences=${level}:`];
        expect(trustArcTarget()).to.equal(expected);
      });
    });

    it('does not fall back to the slider when granular cookies are duplicated', () => {
      cookies = ['notice_gdpr_prefs=0:', 'notice_gdpr_prefs=0,1:', 'notice_preferences=2:'];
      expect(trustArcTarget()).to.equal('hidden');
    });

    it('uses granular preferences instead of the inclusive slider', () => {
      cookies = ['notice_gdpr_prefs=0,2:', 'notice_preferences=2:'];
      expect(trustArcTarget()).to.equal('customized');
    });

    ['', '1', '0,1,1', '0,1,2,3', '0,2,4', '0,', 'bad', '%FF', 'x'.repeat(4097)].forEach((value, i) => {
      it(`does not turn invalid/custom granular preferences into a legacy grant (${i})`, () => {
        cookies = [`notice_gdpr_prefs=${value}`, 'notice_preferences=2:'];
        expect(trustArcTarget()).to.equal('hidden');
      });
    });

    ['', '3:', '-1:', 'NaN', 'toString', '__proto__', 'constructor'].forEach((value) => {
      it(`does not classify unsupported legacy preferences ${value}`, () => {
        cookies = [`notice_preferences=${value}`];
        expect(trustArcTarget()).to.equal('suppressed');
      });
    });

    it('retains the banner fallback when no preferences are stored', () => {
      const el = banner('truste-consent-track');
      expect(trustArcTarget()).to.equal('show');
      el.style.display = 'none';
      expect(trustArcTarget()).to.equal('suppressed');
    });
  });

  describe('Usercentrics', () => {
    [
      [['granted', 'granted', 'granted', 'granted'], 'granted'],
      [['denied', 'denied', 'denied', 'denied'], 'rejected'],
      [['denied', 'granted', 'denied', 'denied'], 'customized'],
    ].forEach(([values, expected]) => {
      it(`reports ${expected} for complete GCM signals`, () => {
        setGCM(values);
        expect(usercentricsTarget()).to.equal(expected);
      });
    });

    [
      [[true, true, true, true], 'granted'],
      [[false, false, false, false], 'rejected'],
      [[false, false, true, false], 'customized'],
    ].forEach(([values, expected]) => {
      it(`reports ${expected} for the supported category-cookie integration`, () => {
        setCategoryCookies(values);
        expect(usercentricsTarget()).to.equal(expected);
      });
    });

    ['granted', 'rejected', 'customized'].forEach((expected) => {
      it(`reports ${expected} GCM signals regardless of the interaction marker`, () => {
        const values = expected === 'customized'
          ? ['granted', 'denied', 'denied', 'denied']
          : signals.map(() => (expected === 'granted' ? 'granted' : 'denied'));
        setGCM(values);
        localStorage.setItem('uc_user_interaction', 'false');
        expect(usercentricsTarget()).to.equal(expected);
        localStorage.setItem('uc_user_interaction', 'true');
        expect(usercentricsTarget()).to.equal(expected);
      });

      it(`reports ${expected} category cookies without interaction evidence`, () => {
        const values = expected === 'customized' ? [true, false, false, false]
          : categories.map(() => expected === 'granted');
        setCategoryCookies(values);
        localStorage.setItem('uc_user_interaction', 'false');
        expect(usercentricsTarget()).to.equal(expected);
      });
    });

    ['1', 'null', '[]', '{}', 'bad JSON', '{', 'x'.repeat(4097)].forEach((value, i) => {
      it(`retains hidden for unrecognized GCM storage (${i})`, () => {
        localStorage.setItem('uc_gcm', value);
        expect(usercentricsTarget()).to.equal('hidden');
      });
    });

    it('does not classify incomplete, boolean or unknown GCM signals', () => {
      setGCM(['denied']);
      expect(usercentricsTarget()).to.equal('hidden');
      setGCM([true, true, true, true]);
      expect(usercentricsTarget()).to.equal('hidden');
      setGCM(['granted', 'granted', 'granted', 'unknown']);
      expect(usercentricsTarget()).to.equal('hidden');
    });

    it('does not use category cookies to conceal invalid GCM data', () => {
      setCategoryCookies([true, true, true, true]);
      localStorage.setItem('uc_gcm', 'broken');
      expect(usercentricsTarget()).to.equal('hidden');
    });

    it('requires complete, strictly boolean category cookies', () => {
      setCategoryCookies([true, true, true, undefined]);
      expect(usercentricsTarget()).to.equal('hidden');
      setCategoryCookies([true, true, true, '1']);
      expect(usercentricsTarget()).to.equal('hidden');
      setCategoryCookies([true, true, true, true]);
      cookies[0] = 'uc_consent_status_essential=false';
      expect(usercentricsTarget()).to.equal('hidden');
    });

    it('can read category cookies when localStorage is blocked', () => {
      setCategoryCookies([false, false, false, false]);
      blockStorage();
      expect(usercentricsTarget()).to.equal('rejected');
    });

    it('does not treat arbitrary uc cookies or controller history as consent', () => {
      cookies = ['uc_custom=true'];
      localStorage.setItem('uc_settings', '{"controllerId":"do-not-send","services":[]}');
      expect(usercentricsTarget()).to.equal('suppressed');
    });

    it('tolerates a missing host or shadow root and blocked storage', () => {
      expect(usercentricsTarget()).to.equal('suppressed');
      const host = banner('usercentrics-root');
      expect(usercentricsTarget()).to.equal('suppressed');
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<div id="uc-center-container" style="height:100px"></div>';
      blockStorage();
      expect(usercentricsTarget()).to.equal('show');
    });
  });

  describe('plugin emission', () => {
    [
      ['onetrust', onetrust, () => setOneTrust('C0001:1,C0002:1', { consentId: 'do-not-send' })],
      ['trustarc', trustarc, () => { cookies = ['notice_gdpr_prefs=0,1,2:do-not-send']; }],
      ['usercentrics', usercentrics, () => setGCM(signals.map(() => 'granted'))],
    ].forEach(([source, plugin, prepare]) => {
      it(`${source} emits only the fixed target once`, () => {
        prepare();
        const calls = [];
        const sampleRUM = (checkpoint, data) => calls.push({ checkpoint, ...data });
        plugin({ sampleRUM });
        plugin({ sampleRUM });
        expect(calls).to.deep.equal([{ checkpoint: 'consent', source, target: 'granted' }]);
      });
    });
  });
});
