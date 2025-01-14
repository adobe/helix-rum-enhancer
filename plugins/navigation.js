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
export default function addNavigationTracking({ sampleRUM, fflags }) {
  // enter checkpoint when referrer is not the current page url
  const navigate = (source, type, redirectCount) => {
    // target can be 'visible', 'hidden' (background tab) or 'prerendered' (speculation rules)
    const payload = { source, target: document.visibilityState };
    /* c8 ignore next 13 */
    // prerendering cannot be tested yet with headless browsers
    if (document.prerendering) {
      // listen for "activation" of the current pre-rendered page
      document.addEventListener('prerenderingchange', () => {
        // pre-rendered page is now "activated"
        payload.target = 'prerendered';
        sampleRUM('navigate', payload); // prerendered navigation
      }, {
        once: true,
      });
      if (type === 'navigate') {
        sampleRUM('prerender', payload); // prerendering page
      }
    } else if (type === 'reload' || source === window.location.href) {
      sampleRUM('reload', payload);
    } else if (type && type !== 'navigate') {
      sampleRUM(type, payload); // back, forward, prerender, etc.
    } else if (source && window.location.origin === new URL(source).origin) {
      sampleRUM('navigate', payload); // internal navigation
    } else {
      sampleRUM('enter', payload); // enter site
    }
    fflags.enabled('redirect', () => {
      const from = new URLSearchParams(window.location.search).get('redirect_from');
      if (redirectCount || from) {
        sampleRUM('redirect', { source: from, target: redirectCount || 1 });
      }
    });
  };

  const processed = new Set(); // avoid processing duplicate types
  new PerformanceObserver((list) => list
    .getEntries()
    .filter(({ type }) => !processed.has(type))
    .map((e) => [e, processed.add(e.type)])
    .map(([e]) => navigate(
      window.hlx.referrer || document.referrer,
      e.type,
      e.redirectCount,
    ))).observe({ type: 'navigation', buffered: true });
}
