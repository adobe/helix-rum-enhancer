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
import { fflags } from './fflags.js';

const { sampleRUM, queue, isSelected } = (window.hlx && window.hlx.rum) ? window.hlx.rum
  /* c8 ignore next */ : {};

const createMO = (cb) => (window.MutationObserver ? new MutationObserver(cb)
/* c8 ignore next */ : {});

// blocks mutation observer
// eslint-disable-next-line no-use-before-define, max-len
const blocksMO = createMO(blocksMCB);

// media mutation observer
// eslint-disable-next-line no-use-before-define, max-len
const mediaMO = createMO(mediaMCB);

// Check for the presence of URL parameters
const hasUrlParameters = ({ urlParameters }) => urlParameters.keys().length > 0;

const PLUGINS = {
  cwv: 'cwv.js',
  navigation: 'navigation.js',
  // Interactive elements
  form: {
    condition: () => document.body.querySelector('form'),
    file: 'form.js',
  },
  video: {
    condition: () => document.body.querySelector('video'),
    file: 'video.js',
  },
  // Martech
  ads: {
    condition: hasUrlParameters,
    file: 'ads.js',
  },
  email: {
    condition: hasUrlParameters,
    file: 'email.js',
  },
  onetrust: {
    condition: () => document.cookie.split(';').map((c) => c.trim()).some((cookie) => cookie.startsWith('OptanonAlertBoxClosed=')),
    file: 'onetrust.js',
  },
  utm: {
    condition: hasUrlParameters,
    file: 'utm.js',
  },
};

const PLUGIN_PARAMETERS = {
  sampleRUM,
  sourceSelector,
  targetSelector,
  fflags,
  context: window.document.body,
};

async function loadPlugin(key, params) {
  const urlParameters = new URLSearchParams(window.location.search);
  const plugin = PLUGINS[key];
  if (!plugin) return Promise.reject(new Error(`Plugin ${key} not found`));
  if (!plugin.condition || plugin.condition({ urlParameters })) {
    return import(`../plugins/${plugin.file || plugin}`).then((p) => p.default && p.default(params));
  }
  return Promise.resolve();
}

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

function addLoadResourceTracking() {
  const observer = new PerformanceObserver((list) => {
    try {
      list.getEntries()
        .filter((e) => !e.responseStatus || e.responseStatus < 400)
        .filter((e) => window.location.hostname === new URL(e.name).hostname)
        .filter((e) => new URL(e.name).pathname.match('.*(\\.plain\\.html$|\\.json|graphql|api)'))
        .forEach((e) => {
          sampleRUM('loadresource', { source: e.name, target: Math.round(e.duration) });
        });
      list.getEntries()
        .filter((e) => e.responseStatus === 404)
        .forEach((e) => {
          sampleRUM('missingresource', { source: e.name, target: e.hostname });
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
      addObserver('form', (el) => loadPlugin('form', { ...PLUGIN_PARAMETERS, context: el }), m.target);
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
  activateBlocksMO();
  activateMediaMO();

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

  // Core tracking
  addLoadResourceTracking();
  addViewBlockTracking(window.document.body);
  addViewMediaTracking(window.document.body);

  // Tracking extensions
  Object.keys(PLUGINS).filter((key) => loadPlugin(key, PLUGIN_PARAMETERS));

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
