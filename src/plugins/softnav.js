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
const INTERACTION_WINDOW_MS = 3000;
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'click'];
const SCRIPTED_TRAVERSE_MS = 500;
const ROUTER_GLOBALS = ['next', '__NEXT_DATA__', '__remixContext', '__reactRouterContext', '__staticRouterHydrationData'];
function addSoftNavTracking({
  sampleRUM
}) {
  try {
    if (!ROUTER_GLOBALS.some(global => global in window)) {
      return;
    }
    let lastInteraction = 0;
    const touch = e => {
      if (e.isTrusted) {
        lastInteraction = Date.now();
      }
    };
    INTERACTION_EVENTS.forEach(type => {
      window.addEventListener(type, touch, {
        capture: true,
        passive: true
      });
    });
    let from = window.location.pathname;
    const report = (toURL, kind, browserUI = false) => {
      if (!toURL) {
        return;
      }
      let to;
      try {
        to = new URL(toURL, window.location.href);
      } catch (e) {
        return;
      }
      if (to.origin !== window.location.origin) {
        return;
      }
      if (to.pathname === from) {
        return;
      }
      const source = `${window.location.origin}${from}`;
      from = to.pathname;
      if (!browserUI && Date.now() - lastInteraction > INTERACTION_WINDOW_MS) {
        return;
      }
      sampleRUM('navigate', {
        source,
        target: kind
      });
    };
    if (window.navigation && typeof window.navigation.addEventListener === 'function') {
      let pending = null;
      window.navigation.addEventListener('navigate', e => {
        pending = null;
        if (e.hashChange || e.downloadRequest !== null) {
          return;
        }
        if (e.navigationType === 'reload') {
          return;
        }
        if (!e.destination || !e.destination.sameDocument) {
          return;
        }
        pending = {
          url: e.destination.url,
          kind: `soft:${e.navigationType}`,
          browserUI: e.navigationType === 'traverse' && e.userInitiated === true
        };
      });
      window.navigation.addEventListener('currententrychange', () => {
        const p = pending;
        pending = null;
        const entry = window.navigation.currentEntry;
        if (!p || !entry || entry.url !== p.url) {
          return;
        }
        report(entry.url, p.kind, p.browserUI);
      });
      return;
    }
    const wrap = (method, before, after) => {
      const original = window.history[method];
      if (typeof original !== 'function') {
        return;
      }
      window.history[method] = function patched(...args) {
        let ctx;
        try {
          ctx = before(args);
        } catch (err) {}
        const result = original.apply(this, args);
        try {
          after(ctx);
        } catch (err) {}
        return result;
      };
    };
    const resolve = args => args[2] == null ? null : new URL(args[2], window.location.href).href;
    wrap('pushState', resolve, url => report(url, 'soft:push'));
    wrap('replaceState', resolve, url => report(url, 'soft:replace'));
    let scriptedTraverse = 0;
    const stamp = () => {
      scriptedTraverse = Date.now();
    };
    ['back', 'forward', 'go'].forEach(method => wrap(method, stamp, () => {}));
    window.addEventListener('popstate', () => {
      const scripted = Date.now() - scriptedTraverse <= SCRIPTED_TRAVERSE_MS;
      scriptedTraverse = 0;
      report(window.location.href, 'soft:traverse', !scripted);
    });
  } catch (e) {}
}

export { addSoftNavTracking as default };
