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
/* eslint-env mocha */

import { expect } from '@esm-bundle/chai';
import { sendKeys } from '@web/test-runner-commands';
import addSoftNavTracking from '../../plugins/softnav.js';

const { origin, pathname } = window.location;
const ROUTER_GLOBAL = '__NEXT_DATA__';

// Each test installs a fresh stub for window.navigation (or hides it) so that either branch
// of the plugin can be exercised in any browser, independent of native Navigation API support.
const setNavigation = (value) => {
  Object.defineProperty(window, 'navigation', { value, configurable: true, writable: true });
};
const setNavigationGetter = (get) => {
  Object.defineProperty(window, 'navigation', { get, configurable: true });
};

const fakeNavigation = () => {
  const target = new EventTarget();
  target.fire = (props) => {
    const e = new Event('navigate');
    Object.assign(e, {
      hashChange: false, downloadRequest: null, navigationType: 'push', ...props,
    });
    if (e.destination && !('sameDocument' in e.destination)) {
      e.destination = { sameDocument: true, ...e.destination };
    }
    target.dispatchEvent(e);
  };
  return target;
};

const interact = () => sendKeys({ press: 'Shift' });

// The interaction window is measured with Date.now(), so the clock is pinned per test to
// assert both edges of the window without real waits.
const realNow = Date.now;
let now;
const setClock = (t) => {
  now = t;
  Date.now = () => now;
};

describe('softnav plugin', () => {
  let calls;
  let sampleRUM;

  beforeEach(() => {
    calls = [];
    sampleRUM = (checkpoint, data) => calls.push({ checkpoint, ...data });
    window[ROUTER_GLOBAL] = { page: '/' };
  });

  afterEach(() => {
    Date.now = realNow;
    delete window.navigation;
    delete window[ROUTER_GLOBAL];
    delete window.history.pushState;
    delete window.history.replaceState;
  });

  it('does nothing without a client-side router', () => {
    delete window[ROUTER_GLOBAL];
    const nav = fakeNavigation();
    setNavigation(nav);
    addSoftNavTracking({ sampleRUM });
    nav.fire({ destination: { url: `${origin}/elsewhere` } });
    expect(calls).to.have.length(0);
  });

  it('swallows unexpected errors', () => {
    setNavigationGetter(() => {
      throw new Error('boom');
    });
    expect(() => addSoftNavTracking({ sampleRUM })).to.not.throw();
  });

  describe('Navigation API', () => {
    let nav;

    beforeEach(() => {
      nav = fakeNavigation();
      setNavigation(nav);
      addSoftNavTracking({ sampleRUM });
    });

    it('ignores navigations without a trusted interaction', () => {
      window.dispatchEvent(new KeyboardEvent('keydown'));
      nav.fire({ destination: { url: `${origin}/a` } });
      expect(calls).to.have.length(0);
    });

    it('reports a navigation after a trusted interaction', async () => {
      await interact();
      nav.fire({ destination: { url: `${origin}/a` } });
      expect(calls).to.deep.equal([
        { checkpoint: 'navigate', source: `${origin}${pathname}`, target: 'soft:push' },
      ]);
    });

    it('skips hash changes, downloads, reloads and same-path navigations', async () => {
      await interact();
      nav.fire({ hashChange: true, destination: { url: `${origin}/a` } });
      nav.fire({ downloadRequest: 'file.pdf', destination: { url: `${origin}/a` } });
      nav.fire({ navigationType: 'reload', destination: { url: `${origin}/a` } });
      nav.fire({ destination: { url: `${origin}${pathname}?q=1` } });
      expect(calls).to.have.length(0);
    });

    it('skips cross-origin and unparseable destinations', async () => {
      await interact();
      nav.fire({ destination: { url: 'https://example.com/a' } });
      nav.fire({ destination: { url: 'http://[' } });
      expect(calls).to.have.length(0);
    });

    it('tolerates a missing destination', async () => {
      await interact();
      nav.fire({ navigationType: 'traverse' });
      expect(calls).to.have.length(0);
    });

    it('skips cross-document navigations', async () => {
      await interact();
      nav.fire({ destination: { url: `${origin}/a`, sameDocument: false } });
      expect(calls).to.have.length(0);
    });

    it('reports within 3s of an interaction and drops past it', async () => {
      setClock(1000000);
      await interact();
      setClock(1000000 + 2500);
      nav.fire({ destination: { url: `${origin}/a` } });
      setClock(1000000 + 3001);
      nav.fire({ destination: { url: `${origin}/b` } });
      expect(calls).to.deep.equal([
        { checkpoint: 'navigate', source: `${origin}${pathname}`, target: 'soft:push' },
      ]);
    });

    it('reports traversals without a preceding interaction', () => {
      nav.fire({ navigationType: 'traverse', destination: { url: `${origin}/a` } });
      expect(calls).to.deep.equal([
        { checkpoint: 'navigate', source: `${origin}${pathname}`, target: 'soft:traverse' },
      ]);
    });
  });

  describe('history fallback', () => {
    let pushed;

    beforeEach(() => {
      pushed = [];
      // Navigation API present but unusable, so the fallback must be taken.
      setNavigation({});
      window.history.pushState = (...args) => {
        pushed.push(args);
        return 'pushed';
      };
    });

    it('wraps pushState and replaceState and listens to popstate', async () => {
      window.history.replaceState = () => {};
      addSoftNavTracking({ sampleRUM });

      await interact();
      expect(window.history.pushState({}, '', '/p')).to.equal('pushed');
      expect(pushed).to.have.length(1);
      window.history.replaceState({}, '', '/r');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(calls.map((c) => c.target)).to.deep.equal(['soft:push', 'soft:replace', 'soft:traverse']);
      expect(calls.map((c) => c.source)).to.deep.equal([
        `${origin}${pathname}`, `${origin}/p`, `${origin}/r`,
      ]);
    });

    it('reports an untouched back (popstate) without a preceding interaction', () => {
      addSoftNavTracking({ sampleRUM });
      // a programmatic push is dropped, but moves the cursor to /p
      window.history.pushState({}, '', '/p');
      expect(calls).to.have.length(0);
      // browser-UI back: no pointerdown/keydown reaches the page, only popstate
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(calls).to.deep.equal([
        { checkpoint: 'navigate', source: `${origin}/p`, target: 'soft:traverse' },
      ]);
    });

    it('does not report a cross-document navigation', async () => {
      addSoftNavTracking({ sampleRUM });
      await interact();
      // A same-origin document navigation calls no history method and fires no popstate in
      // the old document, only pagehide, so the fallback cannot double-count it.
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
      expect(calls).to.have.length(0);
    });

    it('reports within 3s of an interaction and drops past it', async () => {
      addSoftNavTracking({ sampleRUM });
      setClock(1000000);
      await interact();
      setClock(1000000 + 2500);
      window.history.pushState({}, '', '/a');
      setClock(1000000 + 3001);
      window.history.pushState({}, '', '/b');
      expect(calls).to.deep.equal([
        { checkpoint: 'navigate', source: `${origin}${pathname}`, target: 'soft:push' },
      ]);
    });

    it('ignores a history entry pushed without a URL', async () => {
      addSoftNavTracking({ sampleRUM });
      await interact();
      // pushState(state, title) keeps the current URL; it must neither be reported nor move
      // the cursor (resolving undefined against the page URL would yield ".../undefined")
      window.history.pushState({}, '');
      window.history.pushState({}, '', '/a');
      expect(calls).to.deep.equal([
        { checkpoint: 'navigate', source: `${origin}${pathname}`, target: 'soft:push' },
      ]);
    });

    it('skips history methods that are not functions', () => {
      window.history.replaceState = undefined;
      addSoftNavTracking({ sampleRUM });
      expect(window.history.replaceState).to.equal(undefined);
    });

    it('never breaks the host router when reporting fails', async () => {
      addSoftNavTracking({
        sampleRUM: () => {
          throw new Error('boom');
        },
      });
      await interact();
      expect(window.history.pushState({}, '', '/p')).to.equal('pushed');
      expect(pushed).to.have.length(1);
    });
  });
});
