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
import { getCookie, getLocalStorage, classifyConsent } from '../modules/consent.js';

function getChoice(gcm) {
  if (gcm) {
    if (gcm.length > 4096) {
      return undefined;
    }
    try {
      const data = JSON.parse(gcm);
      const signals = ['adStorage', 'analyticsStorage', 'adPersonalization', 'adUserData'];
      return classifyConsent(signals.map((key) => {
        if (data?.[key] === 'granted') {
          return true;
        }
        if (data?.[key] === 'denied') {
          return false;
        }
        return undefined;
      }));
    } catch {
      return undefined;
    }
  }

  // Explicitly supported category-cookie integration observed on Hamleys.
  // Do not inspect arbitrary uc_* cookies or expose uc_settings / controller IDs.
  if (getCookie('uc_consent_status_essential') !== 'true') {
    return undefined;
  }
  const categories = ['functional', 'marketing', 'analytics', 'personalisation'];
  return classifyConsent(categories.map((category) => {
    const value = getCookie(`uc_consent_status_${category}`);
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return undefined;
  }));
}

export function getConsentTarget() {
  const gcm = getLocalStorage('uc_gcm');
  const choice = getChoice(gcm);
  if (choice) {
    return choice;
  }

  if (gcm || getCookie('uc_consent_status_essential') !== undefined) {
    return 'hidden';
  }

  const shadowRoot = document.querySelector('#usercentrics-root')?.shadowRoot;
  const banner = shadowRoot?.querySelector('#uc-center-container') || shadowRoot?.querySelector('#uc-fading-wrapper');

  if (banner && banner.offsetHeight > 0) {
    return 'show';
  }

  return 'suppressed';
}

let hasSentData = false;
export default function addCookieConsentTracking({ sampleRUM }) {
  if (hasSentData) {
    return;
  }

  sampleRUM('consent', { source: 'usercentrics', target: getConsentTarget() });
  hasSentData = true;
}
