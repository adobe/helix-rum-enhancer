/*
 * Copyright 2023 Adobe. All rights reserved.
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
const KNOWN_PROPERTIES = ['weight', 'id', 'referer', 'checkpoint', 't', 'source', 'target', 'cwv', 'CLS', 'FID', 'LCP', 'INP', 'TTFB'];
const DEFAULT_TRACKING_EVENTS = ['click', 'cwv', 'form', 'enterleave', 'viewblock', 'viewmedia', 'loadresource', 'utm'];
const { sampleRUM, queue, isSelected } = (window.hlx && window.hlx.rum) ? window.hlx.rum : {};

const urlSanitizers = {
  full: () => window.location.href,
  origin: () => window.location.origin,
  path: () => window.location.href.replace(/\?.*$/, ''),
};

const getTargetValue = (element) => element.getAttribute('data-rum-target') || element.getAttribute('href')
    || element.currentSrc || element.getAttribute('src') || element.dataset.action || element.action;

const targetselector = (element) => {
  try {
    if (!element) return undefined;
    let value = getTargetValue(element);
    if (!value && element.tagName !== 'A' && element.closest('a')) {
      value = getTargetValue(element.closest('a'));
    }
    if (value && !value.startsWith('https://')) {
      // resolve relative links
      value = new URL(value, window.location).href;
    }
    return value;
  } catch (error) {
    // something went wrong
    return null;
  }
};

const sourceselector = (element) => {
  try {
    if (element === document.body || element === document.documentElement || !element) {
      return undefined;
    }
    if (element.getAttribute('data-rum-source')) {
      return element.getAttribute('data-rum-source');
    }
    const form = element.closest('form');
    let formElementSelector = '';
    if (form && Array.from(form.elements).includes(element)) {
      formElementSelector = element.tagName === 'INPUT' ? `form input[type='${element.getAttribute('type')}']` : `form ${element.tagName.toLowerCase()}`;
    }

    const blockName = element.closest('.block') ? element.closest('.block').getAttribute('data-block-name') : '';
    if (element.id || formElementSelector) {
      const id = element.id ? `#${element.id}` : '';
      return blockName ? `.${blockName} ${formElementSelector}${id}` : `${formElementSelector}${id}`;
    }

    if (element.getAttribute('data-block-name')) {
      return `.${element.getAttribute('data-block-name')}`;
    }

    if (Array.from(element.classList).some((className) => className.match(/button|cta/))) {
      return blockName ? `.${blockName} .button` : '.button';
    }

    return sourceselector(element.parentElement);
  } catch (error) {
    return null;
  }
};

const formSubmitListener = (e) => sampleRUM('formsubmit', { target: targetselector(e.target), source: sourceselector(e.target) });
// eslint-disable-next-line no-use-before-define
const mutationObserver = window.MutationObserver ? new MutationObserver(mutationsCallback) : null;

// eslint-disable-next-line no-unused-vars
function optedIn(checkpoint, data) {
  // TODO: check config service to know if
  return true;
}
// Gets configured collection from the config service for the current domain
function getCollectionConfig() {
  return DEFAULT_TRACKING_EVENTS;
}

function trackCheckpoint(checkpoint, data, t) {
  const { weight, id } = window.hlx.rum;
  if (optedIn(checkpoint, data) && isSelected) {
    const sendPing = (pdata = data) => {
      // eslint-disable-next-line object-curly-newline, max-len
      const body = JSON.stringify({ weight, id, sanitizeURL: urlSanitizers[window.hlx.RUM_MASK_URL || 'path'], checkpoint, t, ...data }, KNOWN_PROPERTIES);
      const url = new URL(`.rum/${weight}`, sampleRUM.collectBaseURL || sampleRUM.baseURL).href;
      const headers = { type: 'application/json' };
      navigator.sendBeacon(url, new Blob([body], headers));
      // eslint-disable-next-line no-console
      console.debug(`ping:${checkpoint}`, pdata);
    };
    sendPing(data);
  }
}

function processQueue() {
  while (queue.length) {
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
            data.target = targetselector(element);
            data.source = sourceselector(element) || (element && element.outerHTML.slice(0, 30));
          }
          sampleRUM('cwv', data);
        };

        const featureToggle = () => window.location.hostname === 'blog.adobe.com';
        const isEager = (metric) => ['CLS', 'LCP'].includes(metric);

        // When loading `web-vitals` using a classic script, all the public
        // methods can be found on the `webVitals` global namespace.
        ['FID', 'INP', 'TTFB', 'CLS', 'LCP'].forEach((metric) => {
          const metricFn = window.webVitals[`on${metric}`];
          if (typeof metricFn === 'function') {
            const opts = isEager(metric) ? { reportAllChanges: featureToggle() } : undefined;
            metricFn(storeCWV, opts);
          }
        });
      };
      document.head.appendChild(script);
    } catch (error) {
      // something went wrong
    }
  }, 2000); // wait for delayed
}

function addEnterLeaveTracking() {
  // enter checkpoint when referrer is not the current page url
  const navigate = (source, type) => {
    const payload = { source, target: document.visibilityState };
    // reload: same page, navigate: same origin, enter: everything else
    if (type === 'reload' || source === window.location.href) {
      sampleRUM('reload', payload);
    } else if (type && type !== 'navigate') {
      sampleRUM(type, payload); // back, forward, prerender, etc.
    } else if (source && window.location.origin === new URL(source).origin) {
      sampleRUM('navigate', payload); // internal navigation
    } else {
      sampleRUM('enter', payload); // enter site
    }
  };
  navigate(document.referrer);

  new PerformanceObserver((list) => list
    .getEntries().map((entry) => navigate(document.referrer, entry.type)))
    .observe({ type: 'navigation', buffered: true });

  const leave = ((event) => {
    try {
      if (leave.left || (event.type === 'visibilitychange' && document.visibilityState !== 'hidden')) {
        return;
      }
      leave.left = true;
      sampleRUM('leave');
    } catch (error) {
      // something went wrong
    }
  });
  window.addEventListener('visibilitychange', ((event) => leave(event)));
  window.addEventListener('pagehide', ((event) => leave(event)));
}

function addLoadResourceTracking() {
  const observer = new PerformanceObserver((list) => {
    try {
      list.getEntries()
        .filter((entry) => !entry.responseStatus || entry.responseStatus < 400)
        .filter((entry) => window.location.hostname === new URL(entry.name).hostname)
        .filter((entry) => new URL(entry.name).pathname.match('.*(\\.plain\\.html|\\.json)$'))
        .forEach((entry) => {
          sampleRUM('loadresource', { source: entry.name, target: Math.round(entry.duration) });
        });

      if (window.origin === 'business.adobe.com') {
        // feature flagged for now
        list.getEntries()
          .filter((entry) => entry.responseStatus === 404)
          .forEach((entry) => {
            sampleRUM('missingresource', { source: entry.name, target: entry.hostname });
          });
      }
    } catch (error) {
      // something went wrong
    }
  });
  observer.observe({ type: 'resource', buffered: true });
}

function activateBlocksMutationObserver() {
  if (!mutationObserver || mutationObserver.active) {
    return;
  }
  mutationObserver.active = true;
  mutationObserver.observe(
    document.body,
    // eslint-disable-next-line object-curly-newline
    { subtree: true, attributes: true, attributeFilter: ['data-block-status'] },
  );
}

function getIntersectionObsever(checkpoint) {
  if (!window.IntersectionObserver) {
    return null;
  }
  activateBlocksMutationObserver();
  const observer = new IntersectionObserver((entries) => {
    try {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry) => {
          observer.unobserve(entry.target); // observe only once
          const target = targetselector(entry.target);
          const source = sourceselector(entry.target);
          sampleRUM(checkpoint, { target, source });
        });
    } catch (error) {
      // something went wrong
    }
  }, { threshold: 0.25 });
  return observer;
}
function addViewBlockTracking(element) {
  const blockobserver = getIntersectionObsever('viewblock');
  if (blockobserver) {
    const blocks = element.getAttribute('data-block-status') ? [element] : element.querySelectorAll('div[data-block-status="loaded"]');
    blocks.forEach((b) => blockobserver.observe(b));
  }
}

function addViewMediaTracking(parent) {
  const mediaobserver = getIntersectionObsever('viewmedia');
  if (mediaobserver) {
    parent.querySelectorAll('picture > img, video, audio, iframe').forEach((m) => {
      if (!m.closest('div .block') || m.closest('div[data-block-status="loaded"]')) {
        mediaobserver.observe(m);
      }
    });
  }
}

function addUTMParametersTracking() {
  const usp = new URLSearchParams(window.location.search);
  [...usp.entries()]
    .filter(([key]) => key.startsWith('utm_'))
    // exclude keys that may leak PII
    .filter(([key]) => key !== 'utm_id')
    .filter(([key]) => key !== 'utm_term')
    .forEach(([source, target]) => sampleRUM('utm', { source, target }));
}

function addFormTracking(parent) {
  activateBlocksMutationObserver();
  parent.querySelectorAll('form').forEach((form) => {
    form.removeEventListener('submit', formSubmitListener); // listen only once
    form.addEventListener('submit', formSubmitListener);
  });
}

const addObserver = (ck, fn, block) => getCollectionConfig().includes(ck) && fn(block);
function mutationsCallback(mutations) {
  mutations.filter((m) => m.type === 'attributes' && m.attributeName === 'data-block-status')
    .filter((m) => m.target.dataset.blockStatus === 'loaded')
    .forEach((m) => {
      addObserver('form', addFormTracking, m.target);
      addObserver('viewblock', addViewBlockTracking, m.target);
      addObserver('viewmedia', addViewMediaTracking, m.target);
    });
}

function addTrackingFromConfig() {
  const trackingFunctions = {
    click: () => {
      document.addEventListener('click', (event) => {
        sampleRUM('click', { target: targetselector(event.target), source: sourceselector(event.target) });
      });
    },
    cwv: () => addCWVTracking(),
    form: () => addFormTracking(window.document.body),
    enterleave: () => addEnterLeaveTracking(),
    loadresource: () => addLoadResourceTracking(),
    utm: () => addUTMParametersTracking(),
    viewblock: () => addViewBlockTracking(window.document.body),
    viewmedia: () => addViewMediaTracking(window.document.body),
  };

  getCollectionConfig().filter((ck) => trackingFunctions[ck])
    .forEach((ck) => trackingFunctions[ck]());
}

function initEnhancer() {
  try {
    if (sampleRUM) {
      addTrackingFromConfig();
      window.hlx.rum.collector = trackCheckpoint;
      processQueue();
    }
  } catch (error) {
    // something went wrong
  }
}

initEnhancer();
