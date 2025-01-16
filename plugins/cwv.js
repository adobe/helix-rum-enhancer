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
export default function addCWVTracking({
  sampleRUM, sourceSelector, targetSelector, fflags,
}) {
  setTimeout(() => {
    try {
      const cwvScript = new URL('.rum/web-vitals/dist/web-vitals.iife.js', sampleRUM.baseURL).href;
      if (document.querySelector(`script[src="${cwvScript}"]`)) {
        // web vitals script has been loaded already
        return;
      }
      const script = document.createElement('script');
      script.src = cwvScript;
      script.onload = () => {
        const storeCWV = (measurement) => {
          const data = { cwv: {} };
          data.cwv[measurement.name] = measurement.value;
          if (measurement.name === 'LCP' && measurement.entries.length > 0) {
            const { element } = measurement.entries.pop();
            data.target = targetSelector(element);
            data.source = sourceSelector(element) || (element && element.outerHTML.slice(0, 30));
          }
          sampleRUM('cwv', data);
        };

        const isEager = (metric) => ['CLS', 'LCP'].includes(metric);

        // When loading `web-vitals` using a classic script, all the public
        // methods can be found on the `webVitals` global namespace.
        ['INP', 'TTFB', 'CLS', 'LCP'].forEach((metric) => {
          const metricFn = window.webVitals[`on${metric}`];
          if (typeof metricFn === 'function') {
            let opts = {};
            fflags.enabled('eagercwv', () => {
              opts = { reportAllChanges: isEager(metric) };
            });
            metricFn(storeCWV, opts);
          }
        });
      };
      document.head.appendChild(script);
      /* c8 ignore next 3 */
    } catch (error) {
      // something went wrong
    }
  }, 2000); // wait for delayed
}
