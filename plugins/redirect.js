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
/* eslint-env browser */

/**
 * Estimate external redirect hops from elapsed ms before fetchStart.
 * Uses a conservative 5-RTT model and subtracts one for the final request.
 * @param {number} ms
 * @return {number}
 */
function estimateRedirectCount(ms) {
  const rtt = (navigator.connection && navigator.connection.rtt) || 100;
  return Math.max(1, Math.round(ms / (rtt * 5)) - 1);
}
export default function addRedirectTracking({ sampleRUM, perfEntry }) {
  try {
    const from = new URLSearchParams(window.location.search).get('redirect_from');

    let duration;
    let redirectValue;
    if (perfEntry && perfEntry.redirectCount > 0) {
      duration = Math.max(0, Math.round(perfEntry.redirectEnd - perfEntry.redirectStart));
      redirectValue = `${perfEntry.redirectCount}:${duration}`;
    } else if (perfEntry && perfEntry.fetchStart > 50) {
      duration = Math.round(perfEntry.fetchStart);
      redirectValue = `${estimateRedirectCount(duration)}~${duration}`;
    }

    if (redirectValue || from) {
      const fallback = perfEntry && perfEntry.fetchStart ? Math.round(perfEntry.fetchStart) : 0;
      sampleRUM('redirect', { source: from, target: redirectValue || `1~${fallback}` });
    }
    /* c8 ignore next 3 */
  } catch (e) {
    // silent failure
  }
}
