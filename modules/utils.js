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

const DIFFERENTIAL_SELECTION_PROBABILITY = 0.6;

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
 * A map of validators that take the RUM data object as input and return a boolean indicating
 * whether the data is valid and not and should be submitted to the backend.
 */
export const dataValidator = {
  audience: (data) => !!(data.source
    && data.source.match(/^[\w-]+$/)
    && data.target
    && data.target.match(/^[\w-,]+$/)
    && ['default', ...data.target.split(',')].includes(data.source)),
  experiment: (data) => !!(data.source
    && data.source.match(/^[\w-]+$/)
    && data.target
    && data.target.match(/^[\w-]+$/)),
};

/**
 * Randomly anonymize the audience to dillute potential PII.
 * @param {Object} data The RUM data for the audience
 * @param {Object} data.source The source info for the event
 * @param {Object} data.target The target info for the event
 * @returns the modified data
 */
function anonymizeAudience({ source, target } = {}) {
  const allAudiences = ['default', ...(source?.split(',') || [])];
  const isRandomized = Math.random() < DIFFERENTIAL_SELECTION_PROBABILITY;
  if (isRandomized) {
    const randomAudience = Math.floor(Math.random() * allAudiences.length);
    // eslint-disable-next-line no-param-reassign
    source = allAudiences[randomAudience];
  }
  // eslint-disable-next-line no-param-reassign, no-unused-vars
  target = [...new Set(['default', ...target.split(',')]).values()].join(':');
  return { source, target };
}

/**
 * A map of processors that take the RUM data object as input and manipulate it before it is sent
 * to the backend.
 */
export const dataPreProcessor = {
  audience: (data) => anonymizeAudience(data),
};
