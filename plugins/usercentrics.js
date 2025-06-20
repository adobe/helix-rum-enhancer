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
  const ucroot = document.querySelector('#usercentrics-root');

  if (ucroot && ucroot.offsetHeight > 0) {
    return { source: 'usercentrics', target: 'show' };
  }

  if (ucroot && ucroot.shadowRoot) {
    const shadowcontainer = ucroot.shadowRoot.querySelector('#uc-center-container');

    if (shadowcontainer && shadowcontainer.offsetHeight > 0) {
      return { source: 'usercentrics', target: 'show' };
    }
  }

  const uccontainer = document.querySelector('#uc-center-container');

  if (uccontainer && uccontainer.offsetHeight > 0) {
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
