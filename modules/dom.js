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
export const getTargetValue = (element) => element.getAttribute('data-rum-target') || element.getAttribute('href')
    || element.currentSrc || element.getAttribute('src') || element.dataset.action || element.action;

export const targetSelector = (element) => {
  try {
    if (!element) return undefined;
    let value = getTargetValue(element);
    if (!value && element.tagName !== 'A' && element.closest('a')) {
      value = getTargetValue(element.closest('a'));
    }
    if (value && !value.startsWith('https://')) {
    // resolve relative links
      value = new URL(value, window.location).href;
    }
    return value;
    /* c8 ignore next 3 */
  } catch (error) {
    return null;
  }
};

function walk(element, checkFn) {
  if (!element || element === document.body || element === document.documentElement) {
    return undefined;
  }
  const checkValue = checkFn(element);
  return checkValue || walk(element.parentElement, checkFn);
}

function isDialog(element) {
  // doing it well
  if (element.tagName === 'DIALOG') return true;
  // making the best of it
  if (element.getAttribute('role') === 'dialog') return true;
  if (element.getAttribute('role') === 'alertdialog') return true;
  if (element.getAttribute('aria-modal') === 'true') return true;
  // doing it wrong
  const computedStyle = window.getComputedStyle(element);
  return (computedStyle && computedStyle.position === 'fixed' && computedStyle.zIndex > 100);
}

function isButton(element) {
  if (element.tagName === 'BUTTON') return true;
  if (element.tagName === 'INPUT' && element.getAttribute('type') === 'button') return true;
  if (element.tagName === 'A') {
    const classes = Array.from(element.classList);
    return classes.some((className) => className.match(/button|cta/));
  }
  return element.getAttribute('role') === 'button';
}

function getSourceContext(element) {
  if (element.closest('form')) return 'form';
  const block = element.closest('.block[data-block-name]');
  if (block) return `.${block.getAttribute('data-block-name')}`;
  if (walk(element, isDialog)) return 'dialog';
  if (element.closest('nav')) return 'nav';
  if (element.closest('header')) return 'header';
  if (element.closest('footer')) return 'footer';
  if (element.closest('aside')) return 'aside';
  return (walk(element, (e) => e.id && `#${e.id}`));
}

function getSourceElement(element) {
  if (element.closest('form') && Array.from(element.closest('form').elements).includes(element)) return element.tagName.toLowerCase() + (element.tagName === 'INPUT' ? `[type='${element.getAttribute('type') || ''}']` : '');
  if (walk(element, isButton)) return 'button';
  return element.tagName.toLowerCase().match(/^(a|img|video)$/) && element.tagName.toLowerCase();
}

function getSourceIdentifier(element) {
  if (element.id) return `#${element.id}`;
  if (element.getAttribute('data-block-name')) return `.${element.getAttribute('data-block-name')}`;
  return (element.classList.length > 0 && `.${element.classList[0]}`);
}
export const sourceSelector = (element) => {
  try {
    if (!element || element === document.body || element === document.documentElement) {
      return undefined;
    }
    if (element.getAttribute('data-rum-source')) {
      return element.getAttribute('data-rum-source');
    }
    const context = getSourceContext(element.parentElement) || '';
    const elementName = getSourceElement(element) || '';
    const identifier = getSourceIdentifier(element) || '';
    return `${context} ${elementName}${identifier}`.trim() || `"${element.textContent.substring(0, 10)}"`;
    /* c8 ignore next 3 */
  } catch (error) {
    return null;
  }
};
