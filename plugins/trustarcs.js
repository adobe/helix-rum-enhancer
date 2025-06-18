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
function sampleTrustArcs() {
  const taConsentTrack = document.querySelector('#truste-consent-track');

  if (taConsentTrack && taConsentTrack.offsetHeight > 0) {
    return { source: 'trustarcs', target: 'show' };
  }

  const taConsentContent = document.querySelector('#truste-consent-content');

  if (taConsentContent && taConsentContent.offsetHeight > 0) {
    return { source: 'trustarcs', target: 'show' };
  }

  return { source: 'trustarcs', target: 'suppressed' };
}

let hasSentData = false;
export default function addCookieConsentTracking({ sampleRUM }) {
  if (hasSentData) {
    return;
  }

  sampleRUM('consent', sampleTrustArcs());
  hasSentData = true;
}
