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
export function addCookieConsentTracking(sampleRUM) {
  const cmpCookie = document.cookie.split(';')
    .map((c) => c.trim())
    .find((cookie) => cookie.startsWith('OptanonAlertBoxClosed='));

  if (cmpCookie) {
    sampleRUM('consent', { source: 'onetrust', target: 'hidden' });
    return;
  }

  let consentMutationObserver;
  const trackShowConsent = () => {
    if (document.querySelector('body > div#onetrust-consent-sdk')) {
      sampleRUM('consent', { source: 'onetrust', target: 'show' });
      if (consentMutationObserver) {
        consentMutationObserver.disconnect();
      }
      return true;
    }
    return false;
  };

  if (!trackShowConsent()) {
    // eslint-disable-next-line max-len
    consentMutationObserver = window.MutationObserver ? new MutationObserver(trackShowConsent) : null;
    if (consentMutationObserver) {
      consentMutationObserver.observe(
        document.body,
        // eslint-disable-next-line object-curly-newline
        { attributes: false, childList: true, subtree: false },
      );
    }
  }
}
