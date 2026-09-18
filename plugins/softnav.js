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
/* eslint-env browser */

// A soft navigation is only reported when it follows a real user interaction. Framework
// routers navigate programmatically, so neither NavigateEvent.userInitiated nor user
// activation can carry that signal: a Next.js <Link> preventDefaults the click and calls
// router.push(), which the Navigation API reports as userInitiated: false (measured on
// Next.js 12.1.6 with a trusted click). Tracking the last trusted interaction ourselves is
// the only signal that survives the indirection, and it works identically for the
// Navigation API and the history-patching fallback.
const INTERACTION_WINDOW_MS = 1000;

// Only trusted events open the window. Sites replay their own synthetic clicks (measured:
// one trusted click produced a second click with isTrusted false), and an ungated version
// would let those whitelist genuinely programmatic navigations.
const INTERACTION_EVENTS = ['pointerdown', 'keydown'];

export default function addSoftNavTracking({ sampleRUM }) {
  try {
    let lastInteraction = 0;
    const touch = (e) => { if (e.isTrusted) lastInteraction = Date.now(); };
    INTERACTION_EVENTS.forEach((type) => {
      window.addEventListener(type, touch, { capture: true, passive: true });
    });

    // Tracked manually: by the time a navigation is observable the URL has already changed,
    // and document.referrer is only populated for hard navigations.
    let from = window.location.pathname;

    const report = (toURL, kind) => {
      let to;
      try {
        to = new URL(toURL, window.location.href);
      } catch (e) {
        return;
      }
      if (to.origin !== window.location.origin) return; // outbound, i.e. a hard navigation
      if (to.pathname === from) return; // shallow routing or a query/hash-only change
      // Same shape as a hard internal navigation, which reports urlSanitizers.path(source),
      // i.e. origin + pathname. Inlined rather than imported to keep the plugin
      // self-contained like its siblings; same-origin is guaranteed by the check above.
      const source = `${window.location.origin}${from}`;
      // Advance the cursor for every observed navigation, reported or not: a programmatic
      // route change still moves the user, so the next reported navigation must not cite a
      // path they have already left.
      from = to.pathname;
      if (Date.now() - lastInteraction > INTERACTION_WINDOW_MS) return;
      // `navigate` means internal navigation and `enter` means arrival from outside, so a
      // soft navigation is a `navigate`. The RUM id is deliberately preserved: one page view
      // can carry several navigate checkpoints, and reporting aggregates them.
      sampleRUM('navigate', { source, target: kind });
    };

    if (window.navigation && typeof window.navigation.addEventListener === 'function') {
      // Preferred: one event covers push, replace and traverse (back/forward), which a
      // pushState patch cannot see without also patching replaceState and popstate.
      window.navigation.addEventListener('navigate', (e) => {
        if (e.hashChange || e.downloadRequest !== null) return;
        if (e.navigationType === 'reload') return; // the reload checkpoint owns this
        report(e.destination && e.destination.url, `soft:${e.navigationType}`);
      });
      return;
    }

    // Fallback for browsers without the Navigation API (Safari and Firefox at time of
    // writing). Chrome's soft-navigation PerformanceObserver entry type would be the
    // natural replacement for all of this, but it produced no entries even for a trusted
    // click during testing, so it is not yet dependable.
    const wrap = (method, kind) => {
      const original = window.history[method];
      if (typeof original !== 'function') return;
      window.history[method] = function patched(...args) {
        const result = original.apply(this, args);
        try {
          report(args[2], kind);
        } catch (err) { /* never break the host router */ }
        return result;
      };
    };
    wrap('pushState', 'soft:push');
    wrap('replaceState', 'soft:replace');
    window.addEventListener('popstate', () => report(window.location.href, 'soft:traverse'));
  } catch (e) { /* silent plugin error catching, consistent with the other plugins */ }
}
