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
  if (sampleRUM.oneTrustTrackingSet) {
    return;
  }
  // eslint-disable-next-line no-param-reassign
  sampleRUM.oneTrustTrackingSet = true;

  function onOneTrustLoaded(callback) {
    if (window.OneTrust) {
      callback(window.OneTrust);
      return;
    }
    Object.defineProperty(window, 'OneTrust', {
      configurable: true,
      get() {
        return undefined; // return undefined until it's explicitly set
      },
      set(value) {
        delete window.OneTrust;
        window.OneTrust = value; // restores normal behavior
        callback(window.OneTrust);
      },
    });
  }

  onOneTrustLoaded((oneTrust) => {
    if (!oneTrust || typeof oneTrust.IsAlertBoxClosed !== 'function' || typeof oneTrust.OnConsentChanged !== 'function') {
      return;
    }

    if (oneTrust.IsAlertBoxClosed()) {
      sampleRUM('consent', { source: 'onetrust', target: 'hidden' });
    } else {
      let hasBannerShown = false;
      oneTrust.OnConsentChanged(() => {
        if (!hasBannerShown) {
          sampleRUM('consent', { source: 'onetrust', target: 'show' });
          hasBannerShown = true;
        } else {
          sampleRUM('consent', { source: 'onetrust', target: 'closed' });
        }
      });
    }
  });
}

export function addUTMParametersTracking(sampleRUM) {
  const usp = new URLSearchParams(window.location.search);
  [...usp.entries()]
    .filter(([key]) => key.startsWith('utm_'))
    // exclude keys that may leak PII
    .filter(([key]) => key !== 'utm_id')
    .filter(([key]) => key !== 'utm_term')
    .forEach(([source, target]) => sampleRUM('utm', { source, target }));
}
export function addAdsParametersTracking(sampleRUM) {
  const networks = {
    google: /gclid|gclsrc|wbraid|gbraid/,
    doubleclick: /dclid/,
    microsoft: /msclkid/,
    facebook: /fb(cl|ad_|pxl_)id/,
    twitter: /tw(clid|src|term)/,
    linkedin: /li_fat_id/,
    pinterest: /epik/,
    tiktok: /ttclid/,
  };
  const params = Array.from(new URLSearchParams(window.location.search).keys());
  Object.entries(networks).forEach(([network, regex]) => {
    params.filter((param) => regex.test(param)).forEach((param) => sampleRUM('paid', { source: network, target: param }));
  });
}
export function addEmailParameterTracking(sampleRUM) {
  const networks = {
    mailchimp: /mc_(c|e)id/,
    marketo: /mkt_tok/,
  };
  const params = Array.from(new URLSearchParams(window.location.search).keys());
  Object.entries(networks).forEach(([network, regex]) => {
    params.filter((param) => regex.test(param)).forEach((param) => sampleRUM('email', { source: network, target: param }));
  });
}
