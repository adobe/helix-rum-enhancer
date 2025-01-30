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
/* eslint-env browser */

import { KNOWN_PROPERTIES, DEFAULT_TRACKING_EVENTS } from './defaults.js';
import { urlSanitizers } from './utils.js';
import { targetSelector, sourceSelector } from './dom.js';
import {
  addAdsParametersTracking,
  addCookieConsentTracking,
  addEmailParameterTracking,
  addUTMParametersTracking,
} from './martech.js';
import { fflags } from './fflags.js';

const { sampleRUM, queue, isSelected } = (window.hlx && window.hlx.rum) ? window.hlx.rum
  /* c8 ignore next */ : {};

// blocks mutation observer
// eslint-disable-next-line no-use-before-define, max-len
const blocksMO = window.MutationObserver ? new MutationObserver(blocksMCB)
  /* c8 ignore next */ : {};

// media mutation observer
// eslint-disable-next-line no-use-before-define, max-len
const mediaMO = window.MutationObserver ? new MutationObserver(mediaMCB)
  /* c8 ignore next */ : {};

function trackCheckpoint(checkpoint, data, t) {
  const { weight, id } = window.hlx.rum;
  if (isSelected) {
    const sendPing = (pdata = data) => {
      // eslint-disable-next-line object-curly-newline, max-len
      const body = JSON.stringify({ weight, id, referer: urlSanitizers[window.hlx.RUM_MASK_URL || 'path'](), checkpoint, t, ...data }, KNOWN_PROPERTIES);
      const urlParams = window.RUM_PARAMS ? `?${new URLSearchParams(window.RUM_PARAMS).toString()}` : '';
      const { href: url, origin } = new URL(`.rum/${weight}${urlParams}`, sampleRUM.collectBaseURL);
      if (window.location.origin === origin) {
        const headers = { type: 'application/json' };
        navigator.sendBeacon(url, new Blob([body], headers));
        /* c8 ignore next 3 */
      } else {
        navigator.sendBeacon(url, body);
      }
      // eslint-disable-next-line no-console
      console.debug(`ping:${checkpoint}`, pdata);
    };
    sendPing(data);
  }
}

function processQueue() {
  while (queue && queue.length) {
    const ck = queue.shift();
    trackCheckpoint(...ck);
  }
}

function addCWVTracking() {
  setTimeout(() => {
    try {
      const cwvScript = new URL('.rum/web-vitals/dist/web-vitals.iife.js', sampleRUM.baseURL).href;
      if (document.querySelector(`script[src="${cwvScript}"]`)) {
        // web vitals script has been loaded already
        return;
      }
      const script = document.createElement('script');
      script.src = cwvScript;
      script.onload = () => {
        const storeCWV = (measurement) => {
          const data = { cwv: {} };
          data.cwv[measurement.name] = measurement.value;
          if (measurement.name === 'LCP' && measurement.entries.length > 0) {
            const { element } = measurement.entries.pop();
            data.target = targetSelector(element);
            data.source = sourceSelector(element) || (element && element.outerHTML.slice(0, 30));
          }
          if (measurement.name === 'INP' && fflags.has('inpsource')) {
            const sortedEvents = measurement.entries.sort((a, b) => ((a.duration === b.duration)
              ? !!b.target : a.duration < b.duration));
            const element = sortedEvents.pop()?.target;
            data.source = sourceSelector(element) || (element && element.outerHTML.slice(0, 30));
          }
          sampleRUM('cwv', data);
        };

        const isEager = (metric) => ['CLS', 'LCP'].includes(metric);

        // When loading `web-vitals` using a classic script, all the public
        // methods can be found on the `webVitals` global namespace.
        ['INP', 'TTFB', 'CLS', 'LCP'].forEach((metric) => {
          const metricFn = window.webVitals[`on${metric}`];
          if (typeof metricFn === 'function') {
            let opts = {};
            fflags.enabled('eagercwv', () => {
              opts = { reportAllChanges: isEager(metric) };
            });
            metricFn(storeCWV, opts);
          }
        });
      };
      document.head.appendChild(script);
      /* c8 ignore next 3 */
    } catch (error) {
      // something went wrong
    }
  }, 2000); // wait for delayed
}

function addNavigationTracking() {
  // enter checkpoint when referrer is not the current page url
  const navigate = (source, type, redirectCount) => {
    // target can be 'visible', 'hidden' (background tab) or 'prerendered' (speculation rules)
    const payload = { source, target: document.visibilityState };
    /* c8 ignore next 13 */
    // prerendering cannot be tested yet with headless browsers
    if (document.prerendering) {
      // listen for "activation" of the current pre-rendered page
      document.addEventListener('prerenderingchange', () => {
        // pre-rendered page is now "activated"
        payload.target = 'prerendered';
        sampleRUM('navigate', payload); // prerendered navigation
      }, {
        once: true,
      });
      if (type === 'navigate') {
        sampleRUM('prerender', payload); // prerendering page
      }
    } else if (type === 'reload' || source === window.location.href) {
      sampleRUM('reload', payload);
    } else if (type && type !== 'navigate') {
      sampleRUM(type, payload); // back, forward, prerender, etc.
    } else if (source && window.location.origin === new URL(source).origin) {
      sampleRUM('navigate', payload); // internal navigation
    } else {
      sampleRUM('enter', payload); // enter site
    }
    fflags.enabled('redirect', () => {
      const from = new URLSearchParams(window.location.search).get('redirect_from');
      if (redirectCount || from) {
        sampleRUM('redirect', { source: from, target: redirectCount || 1 });
      }
    });
  };

  const processed = new Set(); // avoid processing duplicate types
  new PerformanceObserver((list) => list
    .getEntries()
    .filter(({ type }) => !processed.has(type))
    .map((e) => [e, processed.add(e.type)])
    .map(([e]) => navigate(
      window.hlx.referrer || document.referrer,
      e.type,
      e.redirectCount,
    ))).observe({ type: 'navigation', buffered: true });
}

function addLoadResourceTracking() {
  const observer = new PerformanceObserver((list) => {
    try {
      list.getEntries()
        .filter((e) => !e.responseStatus || e.responseStatus < 400)
        .filter((e) => window.location.hostname === new URL(e.name).hostname || fflags.has('allresources'))
        .filter((e) => new URL(e.name).pathname.match('.*(\\.plain\\.html$|\\.json|graphql|api)'))
        .forEach((e) => {
          sampleRUM('loadresource', { source: e.name, target: Math.round(e.duration) });
        });
      list.getEntries()
        .filter((e) => e.responseStatus >= 400)
        .forEach((e) => {
          sampleRUM('missingresource', { source: e.name, target: e.responseStatus });
        });
      /* c8 ignore next 3 */
    } catch (error) {
      // something went wrong
    }
  });
  observer.observe({ type: 'resource', buffered: true });
}

// activate blocks mutation observer
function activateBlocksMO() {
  if (!blocksMO || blocksMO.active) {
    return;
  }
  blocksMO.active = true;
  blocksMO.observe(
    document.body,
    // eslint-disable-next-line object-curly-newline
    { subtree: true, attributes: true, attributeFilter: ['data-block-status'] },
  );
}

// activate media mutation observer
function activateMediaMO() {
  if (!mediaMO || mediaMO.active) {
    return;
  }
  mediaMO.active = true;
  mediaMO.observe(
    document.body,
    // eslint-disable-next-line object-curly-newline
    { subtree: true, attributes: false, childList: true },
  );
}

function getIntersectionObsever(checkpoint) {
  /* c8 ignore next 3 */
  if (!window.IntersectionObserver) {
    return null;
  }
  activateBlocksMO();
  activateMediaMO();
  const observer = new IntersectionObserver((entries) => {
    try {
      entries
        .filter((e) => e.isIntersecting)
        .forEach((e) => {
          observer.unobserve(e.target); // observe only once
          const target = targetSelector(e.target);
          const source = sourceSelector(e.target);
          sampleRUM(checkpoint, { target, source });
        });
      /* c8 ignore next 3 */
    } catch (error) {
      // something went wrong
    }
  });
  return observer;
}
function addViewBlockTracking(element) {
  const blockobserver = getIntersectionObsever('viewblock');
  if (blockobserver) {
    const blocks = element.getAttribute('data-block-status') ? [element] : element.querySelectorAll('div[data-block-status="loaded"]');
    blocks.forEach((b) => blockobserver.observe(b));
  }
}

const observedMedia = new Set();
function addViewMediaTracking(parent) {
  const mediaobserver = getIntersectionObsever('viewmedia');
  if (mediaobserver) {
    parent.querySelectorAll('img, video, audio, iframe').forEach((m) => {
      if (!observedMedia.has(m)) {
        observedMedia.add(m);
        mediaobserver.observe(m);
      }
    });
  }
}

function addFormTracking(parent) {
  activateBlocksMO();
  activateMediaMO();
  parent.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (e) => sampleRUM('formsubmit', { target: targetSelector(e.target), source: sourceSelector(e.target) }), { once: true });
    let lastSource;
    form.addEventListener('change', (e) => {
      if (e.target.checkVisibility()) {
        const source = sourceSelector(e.target);
        if (source !== lastSource) {
          sampleRUM('fill', { source });
          lastSource = source;
        }
      }
    });
    form.addEventListener('focusin', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)
        || e.target.getAttribute('contenteditable') === 'true') {
        sampleRUM('click', { source: sourceSelector(e.target) });
      }
    });
  });
}

function addObserver(ck, fn, block) {
  return DEFAULT_TRACKING_EVENTS.includes(ck) && fn(block);
}

// blocks mutation observer callback
function blocksMCB(mutations) {
  // block specific mutations
  mutations
    .filter((m) => m.type === 'attributes' && m.attributeName === 'data-block-status')
    .filter((m) => m.target.dataset.blockStatus === 'loaded')
    .forEach((m) => {
      addObserver('form', addFormTracking, m.target);
      addObserver('viewblock', addViewBlockTracking, m.target);
    });
}

// media mutation observer callback
function mediaMCB(mutations) {
  // media mutations
  mutations
    .forEach((m) => {
      addObserver('viewmedia', addViewMediaTracking, m.target);
    });
}

function addTrackingFromConfig() {
  let lastSource;
  let lastTarget;
  document.addEventListener('click', (event) => {
    const source = sourceSelector(event.target);
    const target = targetSelector(event.target);
    if (source !== lastSource || target !== lastTarget) {
      sampleRUM('click', { target, source });
      lastSource = source;
      lastTarget = target;
    }
  });
  addCWVTracking();
  addFormTracking(window.document.body);
  addNavigationTracking();
  addLoadResourceTracking();
  addUTMParametersTracking(sampleRUM);
  addViewBlockTracking(window.document.body);
  addViewMediaTracking(window.document.body);
  addCookieConsentTracking(sampleRUM);
  addAdsParametersTracking(sampleRUM);
  addEmailParameterTracking(sampleRUM);
  fflags.enabled('language', () => {
    const target = navigator.language;
    const source = document.documentElement.lang;
    sampleRUM('language', { source, target });
  });
}

function initEnhancer() {
  try {
    if (sampleRUM) {
      addTrackingFromConfig();
      window.hlx.rum.collector = trackCheckpoint;
      processQueue();
    }
  /* c8 ignore next 3 */
  } catch (error) {
    // something went wrong
  }
}

initEnhancer();
