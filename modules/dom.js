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
import { isReactApp } from "./utils";

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

export const sourceSelector = (element) => {
  try {
    if (!element || element === document.body || element === document.documentElement) {
      return undefined;
    }
    if (element.getAttribute('data-rum-source')) {
      return element.getAttribute('data-rum-source');
    }
    const form = element.closest('form');
    let formElementSelector = '';
    if (form && Array.from(form.elements).includes(element)) {
      formElementSelector = element.tagName === 'INPUT' ? `form input[type='${element.getAttribute('type')}']` : `form ${element.tagName.toLowerCase()}`;
    }

    const blockName = element.closest('.block') ? element.closest('.block').getAttribute('data-block-name') : '';
    if ((element.id && !isReactApp()) || formElementSelector) {
      const id = element.id ? `#${element.id}` : '';
      return blockName ? `.${blockName} ${formElementSelector}${id}` : `${formElementSelector}${id}`;
    }

    if (element.getAttribute('data-block-name')) {
      return `.${element.getAttribute('data-block-name')}`;
    }

    if (Array.from(element.classList).some((className) => className.match(/button|cta/))) {
      return blockName ? `.${blockName} .button` : '.button';
    }

    return sourceSelector(element.parentElement);
    /* c8 ignore next 3 */
  } catch (error) {
    return null;
  }
};
