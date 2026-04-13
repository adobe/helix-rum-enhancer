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
const getSubmitType = el => {
  if (!el || el.tagName !== 'FORM') return undefined;
  if (el.getAttribute('role') === 'search' || el.querySelector('input[type="search"], input[role="searchbox"]')) return 'search';
  const pwCount = el.querySelectorAll('input[type="password"]').length;
  if (pwCount === 1) return 'login';
  if (pwCount > 1) return 'signup';
  return 'formsubmit';
};
let rootMo = null;
function addFormTracking({
  createMO,
  sampleRUM,
  sourceSelector,
  targetSelector,
  context,
  getIntersectionObserver
}) {
  function trackForm(form) {
    form.addEventListener('submit', e => {
      const invalidFields = form.querySelectorAll(':invalid');
      invalidFields.forEach(field => {
        if (field && field.validity) {
          const prototype = Object.getPrototypeOf(field.validity);
          const errorType = prototype ? Object.keys(Object.getOwnPropertyDescriptors(prototype)).filter(key => key !== 'valid' && key !== 'constructor' && !key.startsWith('Symbol')).find(key => field.validity[key]) || 'custom' : 'custom';
          sampleRUM('error', {
            target: errorType,
            source: sourceSelector(field)
          });
        }
      });
      if (invalidFields.length === 0) {
        sampleRUM(getSubmitType(e.target), {
          target: targetSelector(e.target),
          source: sourceSelector(e.target)
        });
      }
    }, {
      once: true
    });
    getIntersectionObserver('viewblock').observe(form);
    let lastSource;
    form.addEventListener('change', e => {
      if (e.target.checkVisibility && e.target.checkVisibility()) {
        const source = sourceSelector(e.target);
        if (source !== lastSource) {
          sampleRUM('fill', {
            source
          });
          lastSource = source;
        }
      }
    });
    form.addEventListener('focusin', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName) || e.target.getAttribute('contenteditable') === 'true') {
        sampleRUM('click', {
          source: sourceSelector(e.target)
        });
      }
    });
  }
  context.querySelectorAll('form').forEach(form => {
    trackForm(form);
  });
  if (!rootMo) {
    rootMo = createMO(mutationList => {
      mutationList.forEach(mutation => {
        if (mutation.addedNodes) {
          [...mutation.addedNodes].filter(node => node.tagName === 'FORM' || node.querySelector && node.querySelector('form')).forEach(e => trackForm(e.querySelector('form') || e));
        }
      });
    });
    rootMo.observe(document.body, {
      childList: true,
      attributes: false,
      subtree: true
    });
  }
}

export { addFormTracking as default, getSubmitType };
