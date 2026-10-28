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
// The window has to cover the router's data fetch, not just the click handler: Next.js 12
// changes the URL only after the destination route's data has loaded, which took 959 ms
// from pointerdown to the navigate event on a desktop connection to bjsrestaurants.com.
// 3s leaves headroom for slower networks while still excluding unrelated later route changes.
const INTERACTION_WINDOW_MS = 3000;

// Only trusted events open the window. Sites replay their own synthetic clicks (measured:
// one trusted click produced a second click with isTrusted false), and an ungated version
// would let those whitelist genuinely programmatic navigations.
// `click` is included for activations that produce no pointerdown/keydown, such as
// assistive technology and voice or switch input.
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'click'];

// A same-document traversal started by history.back()/forward()/go() fires popstate within
// milliseconds. A call that cannot traverse (already at the oldest entry) fires nothing, so
// its stamp must expire quickly or it would swallow a later genuine browser-UI traversal.
const SCRIPTED_TRAVERSE_MS = 500;

// Cheap probe for a framework router. Lives here rather than in the core PLUGINS registry
// because the core bundle is capped at 16KB and has ~50 bytes of headroom, while a plugin
// bundle is unconstrained. Costs one fetch on a flagged origin that turns out to have no
// router, which is acceptable while the flag is scoped to a single origin.
const ROUTER_GLOBALS = [
  'next', // Next.js, pages and app router
  '__NEXT_DATA__', // Next.js pages router, inlined in the SSR payload
  '__remixContext', // Remix / React Router framework mode
  '__reactRouterContext',
  '__staticRouterHydrationData', // React Router SSR hydration
];

export default function addSoftNavTracking({ sampleRUM }) {
  try {
    if (!ROUTER_GLOBALS.some((global) => global in window)) {
      return; // no client-side router on this page
    }
    let lastInteraction = 0;
    const touch = (e) => {
      if (e.isTrusted) {
        lastInteraction = Date.now();
      }
    };
    INTERACTION_EVENTS.forEach((type) => {
      window.addEventListener(type, touch, { capture: true, passive: true });
    });

    // Tracked manually: by the time a navigation is observable the URL has already changed,
    // and document.referrer is only populated for hard navigations.
    let from = window.location.pathname;

    // `browserUI` bypasses the interaction gate: back/forward from the toolbar button or an
    // edge gesture delivers no pointerdown/keydown to the page. Callers pass it only for a
    // traversal that did not come from script (history.back/forward/go), so a programmatic
    // traversal stays behind the gate like any other programmatic navigation.
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
        return; // outbound, i.e. a hard navigation
      }
      if (to.pathname === from) {
        return; // shallow routing, or a query/hash-only change
      }
      // Same shape as a hard internal navigation, which reports urlSanitizers.path(source),
      // i.e. origin + pathname. Inlined rather than imported to keep the plugin
      // self-contained like its siblings; same-origin is guaranteed by the check above.
      const source = `${window.location.origin}${from}`;
      // Advance the cursor for every observed navigation, reported or not: a programmatic
      // route change still moves the user, so the next reported navigation must not cite a
      // path they have already left.
      from = to.pathname;
      if (!browserUI && Date.now() - lastInteraction > INTERACTION_WINDOW_MS) {
        return;
      }
      // `navigate` means internal navigation and `enter` means arrival from outside, so a
      // soft navigation is a `navigate`. The RUM id is deliberately preserved: one page view
      // can carry several navigate checkpoints, and reporting aggregates them.
      sampleRUM('navigate', { source, target: kind });
    };

    if (window.navigation && typeof window.navigation.addEventListener === 'function') {
      // Preferred: one event covers push, replace and traverse (back/forward), which a
      // pushState patch cannot see without also patching replaceState and popstate.
      // `navigate` fires before the change commits, and another listener (a route guard) can
      // still cancel it, so it only records what is pending; `currententrychange` fires once
      // the entry has actually changed and is where the navigation is reported.
      let pending = null;
      window.navigation.addEventListener('navigate', (e) => {
        pending = null;
        if (e.hashChange || e.downloadRequest !== null) {
          return;
        }
        if (e.navigationType === 'reload') {
          return; // the reload checkpoint owns this
        }
        if (!e.destination || !e.destination.sameDocument) {
          return; // cross-document: the next page reports its own hard navigate
        }
        // userInitiated is true for browser-UI back/forward and false for history.back() and
        // friends. It cannot gate pushes (a Next.js <Link> click reads false, see above), but
        // for a traversal it is exactly the browser-UI signal.
        pending = {
          url: e.destination.url,
          kind: `soft:${e.navigationType}`,
          browserUI: e.navigationType === 'traverse' && e.userInitiated === true,
        };
      });
      window.navigation.addEventListener('currententrychange', () => {
        const p = pending;
        pending = null;
        const entry = window.navigation.currentEntry;
        if (!p || !entry || entry.url !== p.url) {
          return; // not the navigation we saw start, or it was replaced before committing
        }
        report(entry.url, p.kind, p.browserUI);
      });
      return;
    }

    // Fallback for browsers without the Navigation API (Safari and Firefox at time of
    // writing). Chrome's soft-navigation PerformanceObserver entry type would be the natural
    // replacement for all of this, but it produced no entries even for a trusted click during
    // testing, so it is not yet dependable.
    const wrap = (method, before, after) => {
      const original = window.history[method];
      if (typeof original !== 'function') {
        return;
      }
      window.history[method] = function patched(...args) {
        let ctx;
        try {
          ctx = before(args);
        } catch (err) { /* never break the host router */ }
        const result = original.apply(this, args);
        try {
          after(ctx);
        } catch (err) { /* never break the host router */ }
        return result;
      };
    };
    // Resolve against the location BEFORE the history entry changes: a parent-relative URL
    // such as '../b' resolves differently once window.location has moved.
    const resolve = (args) => (args[2] == null
      ? null
      : new URL(args[2], window.location.href).href);
    wrap('pushState', resolve, (url) => report(url, 'soft:push'));
    wrap('replaceState', resolve, (url) => report(url, 'soft:replace'));

    // popstate cannot tell browser UI from script, so script-driven traversals are stamped
    // and the next popstate within the window is treated as programmatic.
    let scriptedTraverse = 0;
    const stamp = () => {
      scriptedTraverse = Date.now();
    };
    ['back', 'forward', 'go'].forEach((method) => wrap(method, stamp, () => {}));
    window.addEventListener('popstate', () => {
      const scripted = Date.now() - scriptedTraverse <= SCRIPTED_TRAVERSE_MS;
      scriptedTraverse = 0;
      report(window.location.href, 'soft:traverse', !scripted);
    });
  } catch (e) { /* silent plugin error catching, consistent with the other plugins */ }
}
