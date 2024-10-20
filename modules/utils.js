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

const { href } = window.location;

export const urlSanitizers = {
  /**
   * Returns the full url.
   * If no url is provided, it defaults to window.location.href.
   * @param {string} url (default: window.location.href) The url to sanitize
   * @returns {string} The sanitized url
   */
  full: (url = href) => new URL(url).toString(),
  /**
   * Returns the origin of the provided url.
   * If no url is provided, it defaults to window.location.href.
   * @param {string} url (default: window.location.href) The url to sanitize
   * @returns {string} The sanitized url
   */
  origin: (url = href) => new URL(url).origin,
  /**
   * Returns the sanitized url: the origin and the path (no query params or hash)
   * If no url is provided, it defaults to window.location.href.
   * @param {string} url (default: window.location.href) The url to sanitize
   * @returns {string} The sanitized url
   */
  path: (url = href) => {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  },
};
