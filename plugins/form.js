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

export const getSubmitType = (el) => {
  if (!el || el.tagName !== 'FORM') return undefined;
  // if the form has a search role or a search field, it's a search form
  if (el.getAttribute('role') === 'search'
    || el.querySelector('input[type="search"], input[role="searchbox"]')) return 'search';
  // if the form has one password input, it's a login form
  // if the form has more than one password input, it's a signup form
  const pwCount = el.querySelectorAll('input[type="password"]').length;
  if (pwCount === 1) return 'login';
  if (pwCount > 1) return 'signup';
  return 'formsubmit';
};

let rootMo = null;

export default function addFormTracking({
  createMO,
  sampleRUM, sourceSelector, targetSelector, context, getIntersectionObserver,
}) {
  // Track existing forms

  // Shared across all tracked forms — one WeakMap is sufficient
  const pendingSubmitFallback = new WeakMap();

  function cancelSubmitFallback(form) {
    const pending = pendingSubmitFallback.get(form);
    if (!pending) return;
    clearTimeout(pending.timerId);
    pendingSubmitFallback.delete(form);
  }

  function sendValidationErrors(form) {
    const invalidFields = form.querySelectorAll(':invalid');
    // Send error checkpoints for each invalid field
    invalidFields.forEach((field) => {
      if (field && field.validity) {
        const prototype = Object.getPrototypeOf(field.validity);
        const errorType = prototype
          ? Object.keys(Object.getOwnPropertyDescriptors(prototype))
            .filter((key) => key !== 'valid' && key !== 'constructor' && !key.startsWith('Symbol'))
            .find((key) => field.validity[key]) || 'custom'
          : 'custom';

        sampleRUM('error', {
          target: errorType,
          source: sourceSelector(field),
        });
      }
    });
    return invalidFields.length;
  }

  function scheduleSubmitFallback(form) {
    cancelSubmitFallback(form);
    const timerId = globalThis.setTimeout(() => {
      pendingSubmitFallback.delete(form);

      const invalidCount = sendValidationErrors(form);
      // Only send formsubmit event if there are no validation errors
      if (invalidCount === 0) {
        sampleRUM(getSubmitType(form), {
          target: targetSelector(form),
          source: sourceSelector(form),
        });
      }
    }, 0);

    pendingSubmitFallback.set(form, { timerId });
  }

  function trackForm(form) {
    // Click fallback: if submit does not fire (e.g., prevented by JS),
    // send the submit checkpoint on the next tick.
    form.addEventListener('click', (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      const submitControl = el.closest?.('button[type="submit"], input[type="submit"]');
      if (!submitControl) return;
      scheduleSubmitFallback(form);
    }, true);

    form.addEventListener('submit', (e) => {
      cancelSubmitFallback(form);

      const invalidCount = sendValidationErrors(form);
      // Only send formsubmit event if there are no validation errors
      if (invalidCount === 0) {
        sampleRUM(getSubmitType(e.target), {
          target: targetSelector(e.target),
          source: sourceSelector(e.target),
        });
      }
    }, { once: true });

    getIntersectionObserver('viewblock').observe(form);
    let lastSource;
    form.addEventListener('change', (e) => {
      if (e.target.checkVisibility && e.target.checkVisibility()) {
        const source = sourceSelector(e.target);
        if (source !== lastSource) {
          sampleRUM('fill', { source });
          lastSource = source;
        }
      }
    });
    form.addEventListener('focusin', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)
        || e.target.getAttribute('contenteditable') === 'true') {
        sampleRUM('click', { source: sourceSelector(e.target) });
      }
    });
  }

  context.querySelectorAll('form').forEach((form) => {
    trackForm(form);
  });

  // Create mutation observer to track dynamically added forms
  if (!rootMo) {
    rootMo = createMO((mutationList) => {
      mutationList.forEach((mutation) => {
        if (mutation.addedNodes) {
          [...mutation.addedNodes]
            // text nodes do not have querySelector method
            .filter((node) => node.tagName === 'FORM' || (node.querySelector && node.querySelector('form')))
            .forEach((e) => trackForm(e.querySelector('form') || e));
        }
      });
    });

    // Start observing the document for form additions
    rootMo.observe(document.body, {
      childList: true,
      attributes: false,
      subtree: true,
    });
  }
}
