/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// Read only the requested value. Storage can be unavailable in sandboxed documents.
export function getCookie(name) {
  try {
    const matches = document.cookie.split(';').map((c) => c.trim())
      .filter((c) => c.startsWith(`${name}=`));
    if (!matches.length) {
      return undefined;
    }
    // null distinguishes an ambiguous cookie from an absent one (undefined).
    return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
  } catch {
    return undefined;
  }
}

export function getLocalStorage(name) {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

// Required categories must be removed by the provider before calling this helper.
// Incomplete, ambiguous or empty sets must not become a grant or a rejection.
export function classifyConsent(choices) {
  if (!choices.length || choices.length > 64 || choices.some((v) => typeof v !== 'boolean')) {
    return undefined;
  }
  if (choices.every(Boolean)) {
    return 'granted';
  }
  if (choices.some(Boolean)) {
    return 'customized';
  }
  return 'rejected';
}
