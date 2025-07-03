/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * A generic polling function that waits for a specific condition to be met.
 * @param {Function} predicate - A function that returns true when the condition is met.
 * @param {number} [timeout=10000] - The maximum time to wait in milliseconds.
 * @returns {Promise<Object|null>} A promise that resolves with the found event
 *                                 or null if not found.
 */
async function pollFor(predicate, timeout = 10000) {
  const wait = (delay) => new Promise((resolve) => {
    setTimeout(resolve, delay);
  });

  let found = window.events.find(predicate);
  let elapsed = 0;
  const interval = 100;

  while (!found && elapsed < timeout) {
    // eslint-disable-next-line no-await-in-loop
    await wait(interval);
    found = window.events.find(predicate);
    elapsed += interval;
  }
  return found;
}

/**
 * Polls for the accessibility audience event.
 * @param {number} [timeout=10000] - The maximum time to wait.
 * @returns {Promise<Object|null>} A promise that resolves with the audience event.
 */
export function pollForAudience(timeout) {
  return pollFor((e) => e.checkpoint === 'a11y', timeout);
}

/**
 * Polls for a specific error checkpoint in window.events.
 * @param {string} errorSource - The source of the error to look for.
 * @param {number} [timeout=5000] - The maximum time to wait.
 * @returns {Promise<Object|null>} A promise that resolves with the error event.
 */
export function pollForError(errorSource, timeout) {
  return pollFor((e) => e.checkpoint === 'error' && e.source === errorSource, timeout);
}

/**
 * Mocks the 'navigator.maxTouchPoints' property to be writable for tests.
 * @param {number} points - The number of touch points to simulate.
 * @returns {PropertyDescriptor|undefined} The original property descriptor to restore later.
 */
export function mockMaxTouchPoints(points) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'maxTouchPoints',
  );

  Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
    value: points,
    writable: true,
    configurable: true,
  });

  return originalDescriptor;
}

/**
 * Restores the original 'navigator.maxTouchPoints' property.
 * @param {PropertyDescriptor|undefined} originalDescriptor - The original descriptor to restore.
 */
export function restoreMaxTouchPoints(originalDescriptor) {
  if (originalDescriptor) {
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', originalDescriptor);
  }
}

/**
 * Mocks the 'window.visualViewport' property for tests.
 * @param {number} zoomPercentage - The zoom level to simulate (e.g., 100 for 100%).
 * @returns {PropertyDescriptor|undefined} The original property descriptor to restore later.
 */
export function mockVisualViewport(zoomPercentage) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'visualViewport',
  );

  Object.defineProperty(window, 'visualViewport', {
    value: { width: window.innerWidth / (zoomPercentage / 100) },
    configurable: true,
  });

  return originalDescriptor;
}

/**
 * Restores the original 'window.visualViewport' property.
 * @param {PropertyDescriptor|undefined} originalDescriptor - The original descriptor to restore.
 */
export function restoreVisualViewport(originalDescriptor) {
  if (originalDescriptor) {
    Object.defineProperty(window, 'visualViewport', originalDescriptor);
  }
}
