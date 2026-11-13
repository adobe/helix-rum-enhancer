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
import { getCookie, classifyConsent } from '../modules/consent.js';

function readConsent() {
  const raw = getCookie('OptanonConsent');
  if (!raw || raw.length > 4096) {
    return null;
  }
  try {
    // Some integrations encode the entire cookie, others just its field values.
    return new URLSearchParams(raw.includes('=') ? raw : decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function getChoice(consent, closed) {
  if (!consent || consent.getAll('groups').length !== 1
    || consent.getAll('AwaitingReconsent').length > 1
    || ![null, 'false'].includes(consent.get('AwaitingReconsent'))) {
    return undefined;
  }

  const interactions = consent.get('interactionCount');
  if (consent.getAll('interactionCount').length > 1
    || (interactions !== null && !/^(0|[1-9]\d*)$/.test(interactions))) {
    return undefined;
  }
  // OneTrust writes defaults before any decision, sometimes with every group enabled.
  if (!closed && (interactions === null || interactions === '0')) {
    return undefined;
  }

  const entries = consent.get('groups').split(',');
  if (entries.length > 65 || entries.some((entry) => !/^(C\d{4}|\d{1,3}):[01]$/.test(entry))) {
    return undefined;
  }
  const groups = new Map(entries.map((entry) => entry.split(':')));
  if (groups.size !== entries.length) {
    return undefined;
  }
  // The observed standard and numeric schemas use these IDs for necessary cookies.
  const required = ['C0001', '1'].filter((id) => groups.has(id));
  if (required.length !== 1 || groups.get(required[0]) !== '1') {
    return undefined;
  }
  groups.delete(required[0]);
  return classifyConsent([...groups.values()].map((value) => value === '1'));
}

export function getConsentTarget() {
  const consent = readConsent();
  const closed = getCookie('OptanonAlertBoxClosed');
  const choice = getChoice(consent, !!closed);
  if (choice) {
    return choice;
  }

  if (closed !== undefined && consent?.get('AwaitingReconsent') !== 'true') {
    return 'hidden';
  }

  const banner = document.querySelector('#onetrust-banner-sdk') || document.querySelector('#onetrust-pc-sdk');

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

  sampleRUM('consent', { source: 'onetrust', target: getConsentTarget() });
  hasSentData = true;
}
