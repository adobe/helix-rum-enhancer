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
// web-vitals is bundled into this plugin from the lockfile-pinned package. There is no
// runtime script load, so nothing outside this release's manifest is executed.
/* eslint-disable import/no-extraneous-dependencies, import/no-relative-packages */
import {
  onCLS, onINP, onLCP, onTTFB,
} from '../node_modules/web-vitals/dist/web-vitals.js';
/* eslint-enable import/no-extraneous-dependencies, import/no-relative-packages */

const METRICS = {
  CLS: onCLS, INP: onINP, LCP: onLCP, TTFB: onTTFB,
};

export default function addCWVTracking({
  sampleRUM, sourceSelector, targetSelector, fflags,
}) {
  setTimeout(() => {
    try {
      // Older enhancers loaded web-vitals from this URL. If the page includes it itself,
      // keep the previous behavior and don't register a second set of observers.
      const cwvScript = new URL('.rum/web-vitals/dist/web-vitals.iife.js', sampleRUM.baseURL).href;
      /* c8 ignore next 3 */
      if (document.querySelector(`script[src="${cwvScript}"]`)) {
        return;
      }
      const storeCWV = (measurement) => {
        const data = { cwv: {} };
        data.cwv[measurement.name] = measurement.value;
        if (measurement.name === 'LCP' && measurement.entries.length > 0) {
          const { element } = measurement.entries.pop();
          data.target = targetSelector(element);
          data.source = sourceSelector(element) || (element && element.outerHTML.slice(0, 30));
        }
        if (measurement.name === 'CLS' && measurement.entries.length > 0) {
          // Attribute CLS to the element of the single largest layout shift
          // (mirrors web-vitals' `largestShiftTarget`, derived from the standard entries).
          const largest = measurement.entries
            .reduce((a, b) => (b.value > (a ? a.value : 0) ? b : a), undefined);
          const node = largest && largest.sources
            && largest.sources.map((s) => s.node).find((n) => n && n.nodeType === 1);
          if (node) {
            data.source = sourceSelector(node) || node.outerHTML.slice(0, 30);
          }
        }
        sampleRUM('cwv', data);
      };

      const isEager = (metric) => ['CLS', 'LCP'].includes(metric);

      ['INP', 'TTFB', 'CLS', 'LCP'].forEach((metric) => {
        let opts = {};
        fflags.enabled('eagercwv', () => {
          opts = { reportAllChanges: isEager(metric) };
        });
        METRICS[metric](storeCWV, opts);
      });
      /* c8 ignore next 3 */
    } catch (error) {
      // something went wrong
    }
  }, 2000); // wait for delayed
}
