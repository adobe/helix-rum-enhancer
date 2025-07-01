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
 * Polls for the 'audience' event to be captured in window.events.
 * This is necessary because the audience scoring is asynchronous and can be delayed.
 * @param {number} [timeout=18000] - The maximum time to wait in milliseconds.
 * @returns {Promise<Object|null>} A promise that resolves with the audience event or null if not
 *                                 found within the timeout.
 */
export async function pollForAudience(timeout = 18000) {
  const wait = (delay) => new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
  const find = () => window.events.find((e) => e.checkpoint === 'audience');

  let found = find();
  let elapsed = 0;
  const interval = 100;

  while (!found && elapsed < timeout) {
    // eslint-disable-next-line no-await-in-loop
    await wait(interval);
    found = find();
    elapsed += interval;
  }
  return found;
}

/**
 * Polls for a specific error checkpoint in window.events.
 * @param {string} errorSource - The source of the error to look for (e.g., 'focus-trap:single').
 * @param {number} [timeout=5000] - The maximum time to wait in milliseconds.
 * @returns {Promise<Object|null>} A promise that resolves with the error event or
 *                                 null if not found.
 */
export async function pollForError(errorSource, timeout = 5000) {
  const wait = (delay) => new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
  const find = () => window.events.find((e) => e.checkpoint === 'error' && e.source === errorSource);

  let found = find();
  let elapsed = 0;
  const interval = 100;

  while (!found && elapsed < timeout) {
    // eslint-disable-next-line no-await-in-loop
    await wait(interval);
    found = find();
    elapsed += interval;
  }
  return found;
}

/**
 * Mocks the 'navigator.maxTouchPoints' property to be writable for tests.
 * @returns {PropertyDescriptor|undefined} The original property descriptor to restore later.
 */
export function mockMaxTouchPoints() {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'maxTouchPoints',
  );

  Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
    value: 1,
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
 * Mocks the 'window.visualViewport' property to be writable for tests.
 * @returns {PropertyDescriptor|undefined} The original property descriptor to restore later.
 */
export function mockVisualViewport() {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'visualViewport',
  );

  Object.defineProperty(window, 'visualViewport', {
    value: { width: window.innerWidth / 2 },
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
