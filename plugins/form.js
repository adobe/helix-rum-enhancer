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
  if (!el || el.tagName !== 'FORM') {
    return undefined;
  }
  if (el.getAttribute('role') === 'search'
    || el.querySelector('input[type="search"], input[role="searchbox"]')) {
    return 'search';
  }
  const pwCount = el.querySelectorAll('input[type="password"]').length;
  return (pwCount === 1 && 'login') || (pwCount > 1 && 'signup') || 'formsubmit';
};

let rootMo = null;
let submitListenerInstalled = false;
const firedForms = new WeakSet();

// Field-level validation signals across native, ARIA, Marketo, and Bootstrap conventions.
const ERROR_FIELD_SELECTORS = ':invalid, [aria-invalid="true"], .mktoInvalid, .is-invalid';
// Generic visible error-message containers (e.g. Revolt.tv .error-message divs).
const ERROR_TEXT_SELECTORS = '[class*="error" i]:not(:empty), [class*="invalid" i]:not(:empty), [role="alert"]:not(:empty)';

function reportFieldErrors(form, sampleRUM, sourceSelector) {
  const invalidFields = form.querySelectorAll(ERROR_FIELD_SELECTORS);
  invalidFields.forEach((field) => {
    if (field && field.validity) {
      const prototype = Object.getPrototypeOf(field.validity);
      const errorType = prototype
        ? Object.keys(Object.getOwnPropertyDescriptors(prototype))
          .filter((key) => key !== 'valid' && key !== 'constructor' && !key.startsWith('Symbol'))
          .find((key) => field.validity[key]) || 'custom'
        : 'custom';
      sampleRUM('error', { target: errorType, source: sourceSelector(field) });
    }
  });
  return invalidFields.length > 0;
}

function hasVisibleErrorText(form) {
  return [...form.querySelectorAll(ERROR_TEXT_SELECTORS)]
    .some((el) => el.offsetParent !== null && el.textContent.trim());
}

function fireFormSubmit(form, sampleRUM, sourceSelector, targetSelector) {
  if (firedForms.has(form)) {
    return;
  }
  firedForms.add(form);
  sampleRUM(getSubmitType(form), {
    target: targetSelector(form),
    source: sourceSelector(form),
  });
}

export default function addFormTracking({
  createMO,
  sampleRUM, sourceSelector, targetSelector, context, getIntersectionObserver,
}) {
  // Install ONE document-level submit listener for the whole page.
  // Bubble phase on document runs after every per-form handler, so
  // e.defaultPrevented reflects the final decision: did anything cancel the submission?
  if (!submitListenerInstalled) {
    submitListenerInstalled = true;
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!form || form.tagName !== 'FORM') {
        return;
      }

      if (!e.defaultPrevented) {
        // Nothing cancelled it - form will navigate. Fire synchronously so
        // sendBeacon survives the page unload. Native validation already
        // blocked invalid submissions before reaching us.
        fireFormSubmit(form, sampleRUM, sourceSelector, targetSelector);
        return;
      }

      // preventDefault was called - form is staying on this page.
      // Defer one tick so framework validators can populate error indicators.
      setTimeout(() => {
        const hasFieldErrors = reportFieldErrors(form, sampleRUM, sourceSelector);
        if (hasFieldErrors || hasVisibleErrorText(form)) {
          return;
        }
        fireFormSubmit(form, sampleRUM, sourceSelector, targetSelector);
      }, 0);
    });
  }

  function trackForm(form) {
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
