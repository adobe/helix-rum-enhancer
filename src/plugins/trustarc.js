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

function readPreference(raw) {
  if (!raw || raw.length > 4096) {
    return undefined;
  }
  try {
    return decodeURIComponent(raw).split(':')[0];
  } catch {
    return undefined;
  }
}
function getChoice(granular, legacy) {
  if (granular !== undefined) {
    const value = readPreference(granular);
    if (!value || !/^[012](,[012])*$/.test(value)) {
      return undefined;
    }
    const groups = value.split(',');
    if (!groups.includes('0') || new Set(groups).size !== groups.length) {
      return undefined;
    }
    return classifyConsent(['1', '2'].map(id => groups.includes(id)));
  }
  const level = readPreference(legacy);
  return /^[012]$/.test(level) ? ['rejected', 'customized', 'granted'][Number(level)] : undefined;
}
function getConsentTarget() {
  const granular = getCookie('notice_gdpr_prefs');
  const legacy = getCookie('notice_preferences');
  const choice = getChoice(granular, legacy);
  if (choice) {
    return choice;
  }
  if (granular !== undefined && legacy !== undefined) {
    return 'hidden';
  }
  const banner = document.querySelector('#truste-consent-track') || document.querySelector('#truste-consent-content');
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
    source: 'trustarc',
    target: getConsentTarget()
  });
  hasSentData = true;
}

export { addCookieConsentTracking as default, getConsentTarget };
