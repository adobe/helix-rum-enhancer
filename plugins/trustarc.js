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
import { getCookie, classifyConsent } from '../modules/consent.js';

function readPreference(raw) {
  if (!raw || raw.length > 4096) {
    return undefined;
  }
  try {
    // Strip timestamps / consent-resolution suffixes; never transmit them.
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
    // Standard TrustArc has required (0) and two optional buckets (1, 2).
    // Unknown custom buckets cannot safely be interpreted as this three-bucket schema.
    return classifyConsent(['1', '2'].map((id) => groups.includes(id)));
  }
  // The legacy slider is inclusive, unlike the granular approved-category list.
  const level = readPreference(legacy);
  return /^[012]$/.test(level) ? ['rejected', 'customized', 'granted'][Number(level)] : undefined;
}

export function getConsentTarget() {
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
export default function addCookieConsentTracking({ sampleRUM }) {
  if (hasSentData) {
    return;
  }

  sampleRUM('consent', { source: 'trustarc', target: getConsentTarget() });
  hasSentData = true;
}
