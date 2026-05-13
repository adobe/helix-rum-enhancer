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
const observedWC = new WeakMap();
let rootMO;
const isValidTagName = tagName => /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(tagName.toLowerCase());
function addWebComponentTracking({
  context,
  sampleRUM,
  sourceSelector,
  targetSelector,
  createMO
}) {
  function activateMutationObserver(mo, root = document.body) {
    if (!mo || mo.active) {
      return;
    }
    mo.active = true;
    mo.observe(root, {
      subtree: true,
      attributes: false,
      childList: true
    });
  }
  function mutationCB(mutations) {
    mutations.forEach(m => {
      _addWebComponentTracking(m.target);
    });
  }
  function _addWebComponentTracking(obj) {
    if (!obj) {
      return;
    }
    const {
      tagName
    } = obj;
    if (tagName && tagName.includes('-') && isValidTagName(tagName)) {
      window.customElements.whenDefined(tagName.toLowerCase()).then(() => {
        if (obj.shadowRoot && !observedWC.has(obj)) {
          observedWC.set(obj, true);
          const mo = createMO(mutationCB);
          activateMutationObserver(mo, obj.shadowRoot);
          obj.__optelMO = mo;
          _addWebComponentTracking(obj.shadowRoot);
        }
      });
    } else {
      let hasShadowRoot = false;
      try {
        hasShadowRoot = Object.getPrototypeOf(obj).toString().includes('ShadowRoot');
      } catch (e) {}
      if (hasShadowRoot) {
        obj.addEventListener('click', event => {
          if (event.optelHandled) {
            return;
          }
          event.optelHandled = true;
          sampleRUM('click', {
            target: targetSelector(event.target),
            source: sourceSelector(event.target)
          });
        });
      }
      [...obj.querySelectorAll('*')].filter(el => el.tagName && el.tagName.includes('-') && !observedWC.has(el)).forEach(el => {
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

export { addWebComponentTracking as default };
