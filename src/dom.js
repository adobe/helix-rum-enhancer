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
  } catch (error) {
    // something went wrong
    return null;
  }
};
