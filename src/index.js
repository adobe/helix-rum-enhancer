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
(function () {
  'use strict';

  const h = (s, a) => [...s].reduce((p, c) => p + c.charCodeAt(0), a) % 1371;
  const fflags = {
    has: f => fflags[f].includes(h(window.origin, 1)) || /localhost/.test(window.origin),
    enabled: (f, c) => fflags.has(f) && c(),
    disabled: (f, c) => !fflags.has(f) && c(),
    eagercwv: [683],
    example: [543, 770, 1136],
    allresources: [543, 1139, 339],
    a11y: [557, 781, 897, 955, 959]
  };

  const KNOWN_PROPERTIES = ['weight', 'id', 'referer', 'checkpoint', 't', 'source', 'target', 'cwv', 'CLS', 'FID', 'LCP', 'INP', 'TTFB', 'ua'];
  const DEFAULT_TRACKING_EVENTS = ['click', 'cwv', 'form', 'viewblock', 'viewmedia', 'loadresource', 'utm', 'paid', 'email', 'consent'];
  fflags.enabled('example', () => DEFAULT_TRACKING_EVENTS.push('example'));

  const {
    href
  } = window.location;
  const urlSanitizers = {
    full: (url = href) => new URL(url).toString(),
    origin: (url = href) => new URL(url).origin,
    path: (url = href) => {
      const u = new URL(url);
      return `${u.origin}${u.pathname}`;
    }
  };

  const getTargetValue = el => el.getAttribute('data-rum-target') || el.getAttribute('href') || el.currentSrc || el.getAttribute('src') || el.dataset.action || el.action;
  const targetSelector = el => {
    try {
      if (!el) {
        return undefined;
      }
      let v = getTargetValue(el);
      if (!v && el.tagName !== 'A' && el.closest('a')) {
        v = getTargetValue(el.closest('a'));
      }
      if (v && !v.startsWith('https://')) {
        v = new URL(v, window.location).href;
      }
      return v;
    } catch (error) {
      return null;
    }
  };
  const untrustedClickPayload = event => {
    if (event && event.isTrusted === false) {
      const ua = navigator.userAgent;
      return {
        ua: ua.includes('+http') ? ua : `${ua} +http://event.untrusted`
      };
    }
    return {};
  };
  function walk(el, check) {
    if (!el || el === document.body || el === document.documentElement) {
      return undefined;
    }
    return check(el) || walk(el.parentElement || el.parentNode && el.parentNode.host, check);
  }
  function isDialog(el) {
    const cs = window.getComputedStyle(el);
    return el.tagName === 'DIALOG' || ['dialog', 'alertdialog'].find(r => el.getAttribute('role') === r) || el.getAttribute('aria-modal') === 'true' || cs && cs.position === 'fixed' && cs.zIndex > 100;
  }
  function isButton(el) {
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' && el.getAttribute('type') === 'button') {
      return true;
    }
    if (el.tagName === 'A') {
      return Array.from(el.classList).some(cls => cls.match(/button|cta/));
    }
    return el.getAttribute('role') === 'button';
  }
  function srcContext(el) {
    const form = el.closest('form');
    if (form) {
      const id = form.getAttribute('id');
      if (id) {
        return `form#${CSS.escape(id)}`;
      }
      return `form${form.classList.length > 0 ? `.${CSS.escape(form.classList[0])}` : ''}`;
    }
    const block = el.closest('.block[data-block-name]');
    return block && `.${block.getAttribute('data-block-name')}` || walk(el, isDialog) && 'dialog' || walk(el, e => e.tagName && e.tagName.includes('-') && e.tagName.toLowerCase()) || ['nav', 'header', 'footer', 'aside'].find(t => el.closest(t)) || walk(el, e => e.id && `#${CSS.escape(e.id)}`);
  }
  function srcElement(el) {
    const f = el.closest('form');
    if (f && Array.from(f.elements).includes(el)) {
      return el.tagName.toLowerCase() + (['INPUT', 'BUTTON'].includes(el.tagName) ? `[type='${el.getAttribute('type') || ''}']` : '');
    }
    return walk(el, isButton) && 'button' || el.tagName.toLowerCase().match(/^(a|img|video|form)$/) && el.tagName.toLowerCase();
  }
  function srcId(el) {
    return el.id && `#${CSS.escape(el.id)}` || el.getAttribute('data-block-name') && `.${el.getAttribute('data-block-name')}` || el.classList.length > 0 && `.${CSS.escape(el.classList[0])}`;
  }
  const sourceSelector = el => {
    try {
      if (!el || el === document.body || el === document.documentElement) {
        return undefined;
      }
      if (el.getAttribute('data-rum-source')) {
        return el.getAttribute('data-rum-source');
      }
      const ctx = srcContext(el.parentElement) || '';
      const name = srcElement(el) || '';
      const id = srcId(el) || '';
      return `${ctx} ${name}${id}`.trim() || `"${el.textContent.substring(0, 10)}"`;
    } catch (error) {
      return null;
    }
  };

  const {
    sampleRUM,
    queue,
    isSelected
  } = window.hlx && window.hlx.rum ? window.hlx.rum : {};
  const createMO = cb => window.MutationObserver ? new MutationObserver(cb) : {};
  const [blocksMO, mediaMO] = [blocksMCB, mediaMCB].map(createMO);
  const hasCookie = key => document.cookie.split(';').some(c => c.trim().startsWith(`${key}=`));
  const pluginBase = new URL(document.currentScript.src).href.replace(/index(\.map)?\.js/, 'plugins');
  const CONSENT_PROVIDERS = [{
    name: 'onetrust',
    detect: () => hasCookie('OptanonAlertBoxClosed') || document.querySelector('#onetrust-banner-sdk, #onetrust-pc-sdk')
  }, {
    name: 'trustarc',
    detect: () => ['notice_gdpr_prefs', 'notice_preferences'].some(hasCookie) || document.querySelector('#truste-consent-track')
  }, {
    name: 'usercentrics',
    detect: () => window.localStorage.getItem('uc_gcm') || document.querySelector('#usercentrics-root')
  }];
  const getConsent = () => CONSENT_PROVIDERS.find(({
    detect
  }) => detect());
  const bodyChildMO = {
    target: document.body,
    options: {
      attributes: false,
      childList: true,
      subtree: false
    }
  };
  const PLUGINS = {
    cwv: `${pluginBase}/cwv.js`,
    a11y: `${pluginBase}/a11y.js`,
    form: {
      url: `${pluginBase}/form.js`,
      when: () => document.querySelector('form'),
      isBlockDependent: true,
      moParams: bodyChildMO
    },
    redirect: {
      url: `${pluginBase}/redirect.js`,
      when: ({
        perfEntry: pe,
        urlParameters: usp
      }) => pe && (usp.get('redirect_from') || pe.redirectCount > 0 || pe.fetchStart > 50)
    },
    video: {
      url: `${pluginBase}/video.js`,
      when: () => document.querySelector('video'),
      isBlockDependent: true
    },
    webcomponent: {
      url: `${pluginBase}/webcomponent.js`,
      when: () => [...document.querySelectorAll('*')].some(el => el.tagName && el.tagName.includes('-')),
      isBlockDependent: true
    },
    martech: {
      url: `${pluginBase}/martech.js`,
      when: ({
        urlParameters
      }) => urlParameters.size > 0
    },
    consent: {
      when: () => getConsent(),
      isBlockDependent: true,
      moParams: bodyChildMO
    }
  };
  const MAX_EV = 1023;
  const vmDedupe = new Set();
  function getIntersectionObserver(checkpoint) {
    if (!window.IntersectionObserver) {
      return null;
    }
    const obs = new IntersectionObserver(entries => {
      try {
        entries.filter(e => e.isIntersecting).forEach(e => {
          obs.unobserve(e.target);
          const target = targetSelector(e.target);
          const source = sourceSelector(e.target);
          if (checkpoint === 'viewmedia') {
            const key = `${source}\0${target}`;
            if (vmDedupe.has(key)) {
              return;
            }
            if (vmDedupe.size < MAX_EV) {
              vmDedupe.add(key);
            }
          }
          sampleRUM(checkpoint, {
            target,
            source
          });
        });
      } catch (error) {}
    });
    return obs;
  }
  const PLUGIN_PARAMS = {
    context: document.body,
    fflags,
    sampleRUM,
    sourceSelector,
    targetSelector,
    untrustedClickPayload,
    getIntersectionObserver,
    createMO
  };
  const pluginCache = new Map();
  function loadPlugin(key, params) {
    const plugin = PLUGINS[key];
    const usp = new URLSearchParams(window.location.search);
    if (!pluginCache.has(key) && plugin.when && !plugin.when({
      ...params,
      urlParameters: usp
    })) {
      if (plugin.moParams && !plugin.isBeingObserved) {
        createPluginMO(key, params, usp);
      }
      return null;
    }
    if (key === 'consent') {
      plugin.url = `${pluginBase}/${getConsent().name}.js`;
    }
    if (!pluginCache.has(key)) {
      pluginCache.set(key, import(`${plugin.url || plugin}`));
    }
    return pluginCache.get(key).then(p => p.default && p.default(params) || typeof p === 'function' && p(params)).catch(() => {});
  }
  function loadPlugins(filter = () => true, params = PLUGIN_PARAMS) {
    Object.entries(PLUGINS).filter(([, plugin]) => filter(plugin)).map(([key]) => loadPlugin(key, params));
  }
  function createPluginMO(key, params, usp) {
    const plugin = PLUGINS[key];
    const obs = createMO(() => {
      if (plugin.when({
        urlParameters: usp
      })) {
        plugin.isBeingObserved = false;
        obs.disconnect();
        loadPlugin(key, params);
      }
    });
    if (obs instanceof MutationObserver) {
      plugin.isBeingObserved = true;
      obs.observe(plugin.moParams.target, plugin.moParams.options);
    }
  }
  let maxEvents = MAX_EV;
  function trackCheckpoint(checkpoint, data, t) {
    const {
      weight,
      id
    } = window.hlx.rum;
    if (isSelected && maxEvents) {
      maxEvents -= 1;
      const body = JSON.stringify({
        weight,
        id,
        referer: urlSanitizers[window.hlx.RUM_MASK_URL || 'path'](),
        checkpoint,
        t,
        ...data
      }, KNOWN_PROPERTIES);
      const urlParams = window.RUM_PARAMS ? `?${new URLSearchParams(window.RUM_PARAMS).toString()}` : '';
      const {
        href: url,
        origin
      } = new URL(`.rum/${weight}${urlParams.length > 1 ? urlParams : ''}`, sampleRUM.collectBaseURL);
      if (window.location.origin === origin) {
        const headers = {
          type: 'application/json'
        };
        navigator.sendBeacon(url, new Blob([body], headers));
      } else {
        navigator.sendBeacon(url, body);
      }
      console.debug(`ping:${checkpoint}`, data);
    }
  }
  function processQueue() {
    while (queue && queue.length) {
      const ck = queue.shift();
      trackCheckpoint(...ck);
    }
  }
  function addNavigationTracking() {
    const navigate = (source, type, perfEntry) => {
      const payload = {
        source: source && urlSanitizers.path(source),
        target: document.visibilityState
      };
      if (document.prerendering) {
        document.addEventListener('prerenderingchange', () => {
          payload.target = 'prerendered';
          sampleRUM('navigate', payload);
        }, {
          once: true
        });
        if (type === 'navigate') {
          sampleRUM('prerender', payload);
        }
      } else if (type === 'reload' || source === window.location.href) {
        sampleRUM('reload', payload);
      } else if (type && type !== 'navigate') {
        sampleRUM(type, payload);
      } else if (source && window.location.origin === new URL(source).origin) {
        sampleRUM('navigate', payload);
      } else {
        sampleRUM('enter', payload);
      }
      loadPlugin('redirect', {
        ...PLUGIN_PARAMS,
        perfEntry
      });
    };
    const processed = new Set();
    new PerformanceObserver(list => list.getEntries().filter(({
      type
    }) => !processed.has(type)).map(e => [e, processed.add(e.type)]).map(([e]) => navigate(window.hlx.referrer || document.referrer, e.type, e))).observe({
      type: 'navigation',
      buffered: true
    });
  }
  function addLoadResourceTracking() {
    const obs = new PerformanceObserver(list => {
      try {
        const entries = list.getEntries();
        entries.filter(e => !e.responseStatus || e.responseStatus < 400).filter(e => window.location.hostname === new URL(e.name).hostname || fflags.has('allresources')).filter(e => {
          const {
            pathname,
            hostname
          } = new URL(e.name);
          const extMatch = pathname.match(hostname !== window.location.hostname ? '.*(\\.html$|\\.json|\\.js|graphql|api)' : '.*(\\.plain\\.html$|\\.json|graphql|api)');
          const isDropIn = fflags.has('allresources') && (pathname.includes('__dropins__/storefront-') || pathname.includes('scripts/dropins/storefront-'));
          const isImage = fflags.has('allresources') && pathname.match(/\.(png|jpe?g|svg)$/i);
          return extMatch || isDropIn || isImage;
        }).forEach(e => {
          sampleRUM('loadresource', {
            source: e.name,
            target: Math.round(e.duration)
          });
        });
        entries.filter(e => e.responseStatus >= 400).filter(e => !new URL(e.name).pathname.match('.*(/\\.rum/1[0-9]{0,3})')).forEach(e => {
          sampleRUM('missingresource', {
            source: e.name,
            target: e.responseStatus
          });
        });
      } catch (error) {}
    });
    obs.observe({
      type: 'resource',
      buffered: true
    });
  }
  function activateBlocksMO() {
    if (!blocksMO || blocksMO.active) {
      return;
    }
    blocksMO.active = true;
    blocksMO.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-block-status']
    });
  }
  function activateMediaMO() {
    if (!mediaMO || mediaMO.active) {
      return;
    }
    mediaMO.active = true;
    mediaMO.observe(document.body, {
      subtree: true,
      attributes: false,
      childList: true
    });
  }
  function addViewBlockTracking(el) {
    const blockObs = getIntersectionObserver('viewblock');
    if (blockObs) {
      const blocks = el.getAttribute('data-block-status') ? [el] : el.querySelectorAll('div[data-block-status="loaded"]');
      blocks.forEach(b => blockObs.observe(b));
    }
  }
  const observedMedia = new Set();
  function addViewMediaTracking(parent) {
    const mediaObs = getIntersectionObserver('viewmedia');
    if (mediaObs) {
      parent.querySelectorAll('img, video, audio, iframe').forEach(m => {
        if (!observedMedia.has(m)) {
          observedMedia.add(m);
          mediaObs.observe(m);
        }
      });
    }
  }
  function addObserver(ck, fn, block) {
    return DEFAULT_TRACKING_EVENTS.includes(ck) && fn(block);
  }
  function blocksMCB(mutations) {
    mutations.filter(m => m.type === 'attributes' && m.attributeName === 'data-block-status').filter(m => m.target.dataset.blockStatus === 'loaded').forEach(m => {
      addObserver('form', el => loadPlugins(p => p.isBlockDependent, {
        ...PLUGIN_PARAMS,
        context: el
      }), m.target);
      addObserver('viewblock', addViewBlockTracking, m.target);
    });
  }
  function mediaMCB(mutations) {
    mutations.forEach(m => {
      addObserver('viewmedia', addViewMediaTracking, m.target);
    });
  }
  function addTrackingFromConfig() {
    activateBlocksMO();
    activateMediaMO();
    document.addEventListener('click', event => {
      if (event.optelHandled) {
        return;
      }
      sampleRUM('click', {
        target: targetSelector(event.target),
        source: sourceSelector(event.target),
        ...untrustedClickPayload(event)
      });
    });
    addNavigationTracking();
    addLoadResourceTracking();
    addViewBlockTracking(document.body);
    addViewMediaTracking(document.body);
    loadPlugins();
    const target = navigator.language;
    const source = document.documentElement.lang;
    sampleRUM('language', {
      source,
      target
    });
  }
  function initEnhancer() {
    try {
      if (sampleRUM) {
        addTrackingFromConfig();
        window.hlx.rum.collector = trackCheckpoint;
        processQueue();
      }
    } catch (error) {}
  }
  initEnhancer();

})();
