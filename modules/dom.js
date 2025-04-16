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
export const getTargetValue = (el) => el.getAttribute('data-rum-target') || el.getAttribute('href')
    || el.currentSrc || el.getAttribute('src') || el.dataset.action || el.action;

export const targetSelector = (el) => {
  try {
    if (!el) return undefined;
    let v = getTargetValue(el);
    if (!v && el.tagName !== 'A' && el.closest('a')) {
      v = getTargetValue(el.closest('a'));
    }
    if (v && !v.startsWith('https://')) {
    // resolve relative links
      v = new URL(v, window.location).href;
    }
    return v;
    /* c8 ignore next 3 */
  } catch (error) {
    return null;
  }
};

function walk(el, checkFn) {
  if (!el || el === document.body || el === document.documentElement) {
    return undefined;
  }
  return checkFn(el) || walk(el.parentElement, checkFn);
}

function isDialog(el) {
  // doing it well
  if (el.tagName === 'DIALOG') return true;
  // making the best of it
  const cs = window.getComputedStyle(el);
  return ['dialog', 'alertdialog'].find((r) => el.getAttribute('role') === r)
    || el.getAttribute('aria-modal') === 'true'
    || (cs && cs.position === 'fixed' && cs.zIndex > 100);
}

function isButton(el) {
  if (el.tagName === 'BUTTON') return true;
  if (el.tagName === 'INPUT' && el.getAttribute('type') === 'button') return true;
  if (el.tagName === 'A') {
    const classes = Array.from(el.classList);
    return classes.some((className) => className.match(/button|cta/));
  }
  return el.getAttribute('role') === 'button';
}

function getSourceContext(el) {
  const formEl = el.closest('form');
  if (formEl) {
    const id = formEl.getAttribute('id');
    if (id) {
      return `form#${id}`;
    }
    return `form${formEl.classList.length > 0 ? `.${formEl.classList[0]}` : ''}`;
  }
  const block = el.closest('.block[data-block-name]');
  return ((block && `.${block.getAttribute('data-block-name')}`)
    || (walk(el, isDialog) && 'dialog')
    || ['nav', 'header', 'footer', 'aside'].find((t) => el.closest(t))
    || walk(el, (e) => e.id && `#${e.id}`));
}

function getSourceElement(el) {
  const f = el.closest('form');
  if (f && Array.from(f.elements).includes(el)) {
    return (el.tagName.toLowerCase()
        + (['INPUT', 'BUTTON'].includes(el.tagName)
          ? `[type='${el.getAttribute('type') || ''}']`
          : ''));
  }
  if (walk(el, isButton)) return 'button';
  return el.tagName.toLowerCase().match(/^(a|img|video|form)$/) && el.tagName.toLowerCase();
}

function getSourceIdentifier(el) {
  if (el.id) return `#${el.id}`;
  if (el.getAttribute('data-block-name')) return `.${el.getAttribute('data-block-name')}`;
  return (el.classList.length > 0 && `.${el.classList[0]}`);
}
export const sourceSelector = (el) => {
  try {
    if (!el || el === document.body || el === document.documentElement) {
      return undefined;
    }
    if (el.getAttribute('data-rum-source')) {
      return el.getAttribute('data-rum-source');
    }
    const ctx = getSourceContext(el.parentElement) || '';
    const name = getSourceElement(el) || '';
    const id = getSourceIdentifier(el) || '';
    return `${ctx} ${name}${id}`.trim() || `"${el.textContent.substring(0, 10)}"`;
    /* c8 ignore next 3 */
  } catch (error) {
    return null;
  }
};
