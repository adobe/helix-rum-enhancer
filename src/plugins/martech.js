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
function addAdsParametersTracking(usp, {
  sampleRUM
}) {
  const networks = {
    google: /gclid|gclsrc|wbraid|gbraid/,
    doubleclick: /dclid/,
    microsoft: /msclkid/,
    facebook: /fb(cl|ad_|pxl_)id/,
    twitter: /tw(clid|src|term)/,
    linkedin: /li_fat_id/,
    pinterest: /epik/,
    tiktok: /ttclid/
  };
  const params = Array.from(usp.keys());
  Object.entries(networks).forEach(([network, regex]) => {
    params.filter(param => regex.test(param)).forEach(param => sampleRUM('paid', {
      source: network,
      target: param
    }));
  });
}
function addEmailParameterTracking(usp, {
  sampleRUM
}) {
  const networks = {
    mailchimp: /mc_(c|e)id/,
    marketo: /mkt_tok/
  };
  const params = Array.from(usp.keys());
  Object.entries(networks).forEach(([network, regex]) => {
    params.filter(param => regex.test(param)).forEach(param => sampleRUM('email', {
      source: network,
      target: param
    }));
  });
}
function addUTMParametersTracking(usp, {
  sampleRUM
}) {
  Array.from(usp.entries()).filter(([key]) => key.startsWith('utm_')).filter(([key]) => key !== 'utm_id').filter(([key]) => key !== 'utm_term').forEach(([source, target]) => sampleRUM('utm', {
    source,
    target
  }));
}
function addMartechTraking({
  sampleRUM
}) {
  const usp = new URLSearchParams(window.location.search);
  addAdsParametersTracking(usp, {
    sampleRUM
  });
  addEmailParameterTracking(usp, {
    sampleRUM
  });
  addUTMParametersTracking(usp, {
    sampleRUM
  });
}

export { addMartechTraking as default };
