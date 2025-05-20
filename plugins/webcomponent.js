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

/** @type {MutationObserver|undefined} */
let webcomponentMO;

export default function addWebComponentTracking({
  context,
  sampleRUM,
  sourceSelector,
  targetSelector,
  createMO,
}) {
  // eslint-disable-next-line no-underscore-dangle
  function _addWebComponentTracking(obj) {
    if (!obj) {
      return;
    }

    const { tagName } = obj;
    if (tagName && tagName.includes('-')) {
      window.customElements.whenDefined(tagName.toLowerCase())
        .then(() => {
          if (obj.shadowRoot && !observedWC.get(obj)) {
            observedWC.set(obj, true);
            _addWebComponentTracking(obj.shadowRoot);
          }
        });
    } else {
      if (Object.getPrototypeOf(obj).toString().includes('ShadowRoot')) {
      // parent is a shadowRoot, add click tracking here
        obj.addEventListener('click', (event) => {
          if (event.optelHandled) {
            return;
          }
          // eslint-disable-next-line no-param-reassign
          event.optelHandled = true;
          sampleRUM('click', { target: targetSelector(event.target), source: sourceSelector(event.target) });
        });
      }
      [...obj.querySelectorAll('*')]
        .filter((el) => el.tagName && el.tagName.includes('-') && !observedWC.get(el))
        .forEach((el) => {
          _addWebComponentTracking(el);
        });
    }
  }

  // wc observer callback
  function webcomponentMCB(mutations) {
    mutations
      .forEach((m) => {
        _addWebComponentTracking(m.target);
      });
  }

  // activate webcomponent mutation observer
  function activateWebComponentMO() {
    webcomponentMO.active = true;
    webcomponentMO.observe(
      document.body,
      // eslint-disable-next-line object-curly-newline
      { subtree: true, attributes: false, childList: true },
    );
  }

  if (!webcomponentMO) {
    webcomponentMO = createMO(webcomponentMCB);
    activateWebComponentMO();
  }
  _addWebComponentTracking(context);
}
