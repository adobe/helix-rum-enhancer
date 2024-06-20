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

export const urlSanitizers = {
  /**
   * Returns the full url.
   * If no url is provided, it defaults to window.location.href.
   * @param {string} url (default: window.location.href) The url to sanitize
   * @returns {string} The sanitized url
   */
  full: (url = window.location.href) => new URL(url).toString(),
  /**
   * Returns the origin of the provided url.
   * If no url is provided, it defaults to window.location.href.
   * @param {string} url (default: window.location.href) The url to sanitize
   * @returns {string} The sanitized url
   */
  origin: (url = window.location.href) => new URL(url).origin,
  /**
   * Returns the sanitized url: the origin and the path (no query params or hash)
   * If no url is provided, it defaults to window.location.href.
   * @param {string} url (default: window.location.href) The url to sanitize
   * @returns {string} The sanitized url
   */
  path: (url = window.location.href) => {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  },
};

/**
 * getReactContainers
 * @param {DOMElement} container The DOM element to search for React containers
 * @returns {Array} Array of DOM elements (if more than one) used to bootstrap React
 */
export const getReactContainers = (container) => container.querySelector('[data-reactroot], [data-reactid]')
    || Array.from(container.querySelectorAll('*')).filter((e) => e._reactRootContainer !== undefined || Object.keys(e).some((k) => k.startsWith('__reactContainer')));

/**
 * Determines if the current page is running a React application
 * by inspecting React-related elements in the DOM.
 * @returns {bool}
 */
export const isReactApp = () => {
  // https://gist.github.com/rambabusaravanan/1d594bd8d1c3153bc8367753b17d074b
  if (!!window.React
    || !!document.querySelector('[data-reactroot], [data-reactid]')
    || Array.from(document.querySelectorAll('*')).some((e) => e._reactRootContainer !== undefined || Object.keys(e).some((k) => k.startsWith('__reactContainer')))
  ) return true;
  return false;
};
