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
export default function addFormTracking({
  sampleRUM, sourceSelector, targetSelector, context,
}) {
  context.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (e) => sampleRUM('formsubmit', { target: targetSelector(e.target), source: sourceSelector(e.target) }), { once: true });
    let lastSource;
    form.addEventListener('change', (e) => {
      const source = sourceSelector(e.target);
      if (source !== lastSource) {
        sampleRUM('fill', { source });
        lastSource = source;
      }
    });
    form.addEventListener('focusin', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)
        || e.target.getAttribute('contenteditable') === 'true') {
        sampleRUM('click', { source: sourceSelector(e.target) });
      }
    });
  });
}
