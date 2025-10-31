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
const h = (s, a) => [...s].reduce((p, c) => p + c.charCodeAt(0), a) % 1371;

export const fflags = {
  has: (f) => fflags[f].includes(h(window.origin, 1)) || /localhost/.test(window.origin),
  enabled: (f, c) => fflags.has(f) && c(),
  disabled: (f, c) => !fflags.has(f) && c(),
  eagercwv: [683],
  example: [543, 770, 1136],
  allresources: [543, 1139],
  a11y: [557, 781, 897, 955, 959],
  noresources: [397], // applyonline.hdfcbank.com - disable resource tracking
};
