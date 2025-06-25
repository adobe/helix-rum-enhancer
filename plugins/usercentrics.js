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

function sampleUserCentrics() {
  const ucgcm = localStorage.getItem('uc_gcm');

  if (ucgcm) {
    return { source: 'usercentrics', target: 'hidden' };
  }

  const { shadowRoot } = document.querySelector('#usercentrics-root');
  const container = shadowRoot.querySelector('#uc-center-container');

  if (container && container.offsetHeight > 0) {
    return { source: 'usercentrics', target: 'show' };
  }

  const wrapper = shadowRoot.querySelector('#uc-fading-wrapper');

  if (wrapper && wrapper.offsetHeight > 0) {
    return { source: 'usercentrics', target: 'show' };
  }

  return { source: 'usercentrics', target: 'suppressed' };
}

let hasSentData = false;
export default function addCookieConsentTracking({ sampleRUM }) {
  if (hasSentData) {
    return;
  }

  sampleRUM('consent', sampleUserCentrics());
  hasSentData = true;
}
