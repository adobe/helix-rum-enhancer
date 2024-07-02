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
export const fflags = {
  has: (flag) => fflags[flag].indexOf(Array.from(window.origin)
    .map((a) => a.charCodeAt(0))
    .reduce((a, b) => a + b, 1) % 1371) !== -1,
  enabled: (flag, callback) => fflags.has(flag) && callback(),
  disabled: (flag, callback) => !fflags.has(flag) && callback(),
  onetrust: [543, 770, 1136],
  email: [1139, 543],
};
