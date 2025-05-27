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

/** @type {WeakMap<HTMLElement, boolean>} */
const observedWC = new WeakMap();

/** @type {MutationObserver&{active?:boolean}|undefined} */
let rootMO;

export default function addWebComponentTracking({
  context,
  sampleRUM,
  sourceSelector,
  targetSelector,
  createMO,
}) {
  /**
   * activate mutation observer
   * @param {MutationObserver&{active?:boolean}} mo
   * @param {HTMLElement} [root=document.body]
   * @returns {void}
   */
  function activateMutationObserver(mo, root = document.body) {
    /* c8 ignore next 3 */
    if (!mo || mo.active) {
      return;
    }
    // eslint-disable-next-line no-param-reassign
    mo.active = true;
    mo.observe(
      root,
      { subtree: true, attributes: false, childList: true },
    );
  }

  /**
   * @callback MutationCallback
   * @param {MutationRecord[]} mutations
   * @param {MutationObserver} observer
   */
  function mutationCB(mutations) {
    mutations
      .forEach((m) => {
        // eslint-disable-next-line no-use-before-define
        _addWebComponentTracking(m.target);
      });
  }

  // eslint-disable-next-line no-underscore-dangle
  function _addWebComponentTracking(obj) {
    /* c8 ignore next 3 */
    if (!obj) {
      return;
    }

    const { tagName } = obj;
    if (tagName && tagName.includes('-')) {
      window.customElements.whenDefined(tagName.toLowerCase())
        .then(() => {
          if (obj.shadowRoot && !observedWC.has(obj)) {
            observedWC.set(obj, true);
            const mo = createMO(mutationCB);
            activateMutationObserver(mo, obj.shadowRoot);
            // eslint-disable-next-line no-underscore-dangle, no-param-reassign
            obj.__optelMO = mo;
            _addWebComponentTracking(obj.shadowRoot);
          }
        });
    } else {
      let hasShadowRoot = false;
      try {
        hasShadowRoot = Object.getPrototypeOf(obj).toString().includes('ShadowRoot');
      } catch (e) { /* do nothing */ }
      if (hasShadowRoot) {
        // obj is a shadowRoot, add click tracking
        obj.addEventListener('click', (event) => {
          if (event.optelHandled) {
            return;
          }
          // eslint-disable-next-line no-param-reassign
          event.optelHandled = true;
          sampleRUM('click', { target: targetSelector(event.target), source: sourceSelector(event.target) });
        });
      }
      // look for web components below this element
      [...obj.querySelectorAll('*')]
        .filter((el) => el.tagName && el.tagName.includes('-') && !observedWC.has(el))
        .forEach((el) => {
          _addWebComponentTracking(el);
        });
    }
  }

  if (!rootMO) {
    rootMO = createMO(mutationCB);
    activateMutationObserver(rootMO);
  }
  _addWebComponentTracking(context);
}
