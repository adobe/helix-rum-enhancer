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
function trackConsent() {
  const cmpCookie = document.cookie.split(';').map(c => c.trim()).find(cookie => cookie.startsWith('OptanonAlertBoxClosed='));
  if (cmpCookie) {
    return 'hidden';
  }
  const banner = document.querySelector('#onetrust-banner-sdk') || document.querySelector('#onetrust-pc-sdk');
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
    source: 'onetrust',
    target: trackConsent()
  });
  hasSentData = true;
}

export { addCookieConsentTracking as default };
