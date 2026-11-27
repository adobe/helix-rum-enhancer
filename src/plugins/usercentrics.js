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
function getCookie(name) {
  try {
    const matches = document.cookie.split(';').map(c => c.trim()).filter(c => c.startsWith(`${name}=`));
    if (!matches.length) {
      return undefined;
    }
    return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
  } catch {
    return undefined;
  }
}
function getLocalStorage(name) {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}
function classifyConsent(choices) {
  if (!choices.length || choices.length > 64 || choices.some(v => typeof v !== 'boolean')) {
    return undefined;
  }
  if (choices.every(Boolean)) {
    return 'granted';
  }
  if (choices.some(Boolean)) {
    return 'customized';
  }
  return 'rejected';
}

function getChoice(gcm) {
  if (gcm) {
    if (gcm.length > 4096) {
      return undefined;
    }
    try {
      const data = JSON.parse(gcm);
      const signals = ['adStorage', 'analyticsStorage', 'adPersonalization', 'adUserData'];
      return classifyConsent(signals.map(key => {
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
  if (getCookie('uc_consent_status_essential') !== 'true') {
    return undefined;
  }
  const categories = ['functional', 'marketing', 'analytics', 'personalisation'];
  return classifyConsent(categories.map(category => {
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
function getConsentTarget() {
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
function addCookieConsentTracking({
  sampleRUM
}) {
  if (hasSentData) {
    return;
  }
  sampleRUM('consent', {
    source: 'usercentrics',
    target: getConsentTarget()
  });
  hasSentData = true;
}

export { addCookieConsentTracking as default, getConsentTarget };
