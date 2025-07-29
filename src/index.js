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
    redirect: [620, 1139],
    example: [543, 770, 1136],
    language: [543, 959, 1139, 620],
    allresources: [543, 1139],
    a11y: [557, 781, 897, 955, 959]
  };

  const KNOWN_PROPERTIES = ['weight', 'id', 'referer', 'checkpoint', 't', 'source', 'target', 'cwv', 'CLS', 'FID', 'LCP', 'INP', 'TTFB'];
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
      if (!el) return undefined;
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
  function walk(el, checkFn) {
    if (!el || el === document.body || el === document.documentElement) {
      return undefined;
    }
    return checkFn(el) || walk(el.parentElement || el.parentNode && el.parentNode.host, checkFn);
  }
  function isDialog(el) {
    if (el.tagName === 'DIALOG') return true;
    const cs = window.getComputedStyle(el);
    return ['dialog', 'alertdialog'].find(r => el.getAttribute('role') === r) || el.getAttribute('aria-modal') === 'true' || cs && cs.position === 'fixed' && cs.zIndex > 100;
  }
  function isButton(el) {
    if (el.tagName === 'BUTTON') return true;
    if (el.tagName === 'INPUT' && el.getAttribute('type') === 'button') return true;
    if (el.tagName === 'A') {
      const classes = Array.from(el.classList);
      return classes.some(className => className.match(/button|cta/));
    }
    return el.getAttribute('role') === 'button';
  }
  function getSourceContext(el) {
    const formEl = el.closest('form');
    if (formEl) {
      const id = formEl.getAttribute('id');
      if (id) {
        return `form#${CSS.escape(id)}`;
      }
      return `form${formEl.classList.length > 0 ? `.${CSS.escape(formEl.classList[0])}` : ''}`;
    }
    const block = el.closest('.block[data-block-name]');
    return block && `.${block.getAttribute('data-block-name')}` || walk(el, isDialog) && 'dialog' || walk(el, e => e.tagName && e.tagName.includes('-') && e.tagName.toLowerCase()) || ['nav', 'header', 'footer', 'aside'].find(t => el.closest(t)) || walk(el, e => e.id && `#${CSS.escape(e.id)}`);
  }
  function getSourceElement(el) {
    const f = el.closest('form');
    if (f && Array.from(f.elements).includes(el)) {
      return el.tagName.toLowerCase() + (['INPUT', 'BUTTON'].includes(el.tagName) ? `[type='${el.getAttribute('type') || ''}']` : '');
    }
    if (walk(el, isButton)) return 'button';
    return el.tagName.toLowerCase().match(/^(a|img|video|form)$/) && el.tagName.toLowerCase();
  }
  function getSourceIdentifier(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.getAttribute('data-block-name')) return `.${el.getAttribute('data-block-name')}`;
    return el.classList.length > 0 && `.${CSS.escape(el.classList[0])}`;
  }
  const sourceSelector = el => {
    try {
      if (!el || el === document.body || el === document.documentElement) {
        return undefined;
      }
      if (el.getAttribute('data-rum-source')) {
        return el.getAttribute('data-rum-source');
      }
      const ctx = getSourceContext(el.parentElement) || '';
      const name = getSourceElement(el) || '';
      const id = getSourceIdentifier(el) || '';
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
  const hasCookieKey = key => document.cookie.split(';').some(c => c.trim().startsWith(`${key}=`));
  const pluginBasePath = new URL(document.currentScript.src).href.replace(/index(\.map)?\.js/, 'plugins');
  const CONSENT_PROVIDERS = [{
    name: 'onetrust',
    detect: () => hasCookieKey('OptanonAlertBoxClosed') || document.querySelector('#onetrust-banner-sdk, #onetrust-pc-sdk')
  }, {
    name: 'trustarc',
    detect: () => ['notice_gdpr_prefs', 'notice_preferences'].some(hasCookieKey) || document.querySelector('#truste-consent-track, #consent_blackbar')
  }, {
    name: 'usercentrics',
    detect: () => window.localStorage.getItem('uc_gcm') || document.querySelector('#usercentrics-root')
  }];
  const getConsentProvider = () => CONSENT_PROVIDERS.find(({
    detect
  }) => detect());
  const PLUGINS = {
    cwv: `${pluginBasePath}/cwv.js`,
    a11y: `${pluginBasePath}/a11y.js`,
    form: {
      url: `${pluginBasePath}/form.js`,
      when: () => document.querySelector('form'),
      isBlockDependent: true
    },
    video: {
      url: `${pluginBasePath}/video.js`,
      when: () => document.querySelector('video'),
      isBlockDependent: true
    },
    webcomponent: {
      url: `${pluginBasePath}/webcomponent.js`,
      when: () => [...document.querySelectorAll('*')].some(el => el.tagName && el.tagName.includes('-')),
      isBlockDependent: true
    },
    martech: {
      url: `${pluginBasePath}/martech.js`,
      when: ({
        urlParameters
      }) => urlParameters.size > 0
    },
    consent: {
      when: () => getConsentProvider(),
      isBlockDependent: true,
      mutationObserverParams: {
        target: document.body,
        options: {
          attributes: false,
          childList: true,
          subtree: false
        }
      }
    }
  };
  function getIntersectionObserver(checkpoint) {
    if (!window.IntersectionObserver) {
      return null;
    }
    const observer = new IntersectionObserver(entries => {
      try {
        entries.filter(e => e.isIntersecting).forEach(e => {
          observer.unobserve(e.target);
          const target = targetSelector(e.target);
          const source = sourceSelector(e.target);
          sampleRUM(checkpoint, {
            target,
            source
          });
        });
      } catch (error) {}
    });
    return observer;
  }
  const PLUGIN_PARAMETERS = {
    context: document.body,
    fflags,
    sampleRUM,
    sourceSelector,
    targetSelector,
    getIntersectionObserver,
    createMO
  };
  const pluginCache = new Map();
  function loadPlugin(key, params) {
    const plugin = PLUGINS[key];
    const usp = new URLSearchParams(window.location.search);
    if (!pluginCache.has(key) && plugin.when && !plugin.when({
      urlParameters: usp
    })) {
      if (plugin.mutationObserverParams && !plugin.isBeingObserved) {
        createPluginMO(key, params, usp);
      }
      return null;
    }
    if (key === 'consent') {
      plugin.url = `${pluginBasePath}/${getConsentProvider().name}.js`;
    }
    if (!pluginCache.has(key)) {
      pluginCache.set(key, import(`${plugin.url || plugin}`));
    }
    return pluginCache.get(key).then(p => p.default && p.default(params) || typeof p === 'function' && p(params)).catch(() => {});
  }
  function loadPlugins(filter = () => true, params = PLUGIN_PARAMETERS) {
    Object.entries(PLUGINS).filter(([, plugin]) => filter(plugin)).map(([key]) => loadPlugin(key, params));
  }
  function createPluginMO(key, params, usp) {
    const plugin = PLUGINS[key];
    const observer = createMO(() => {
      if (plugin.when({
        urlParameters: usp
      })) {
        plugin.isBeingObserved = false;
        observer.disconnect();
        loadPlugin(key, params);
      }
    });
    if (observer instanceof MutationObserver) {
      plugin.isBeingObserved = true;
      observer.observe(plugin.mutationObserverParams.target, plugin.mutationObserverParams.options);
    }
  }
  let maxEvents = 1023;
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
      } = new URL(`.rum/${weight}${urlParams}`, sampleRUM.collectBaseURL);
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
    const navigate = (source, type, redirectCount) => {
      const payload = {
        source,
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
      fflags.enabled('redirect', () => {
        const from = new URLSearchParams(window.location.search).get('redirect_from');
        if (redirectCount || from) {
          sampleRUM('redirect', {
            source: from,
            target: redirectCount || 1
          });
        }
      });
    };
    const processed = new Set();
    new PerformanceObserver(list => list.getEntries().filter(({
      type
    }) => !processed.has(type)).map(e => [e, processed.add(e.type)]).map(([e]) => navigate(window.hlx.referrer || document.referrer, e.type, e.redirectCount))).observe({
      type: 'navigation',
      buffered: true
    });
  }
  function addLoadResourceTracking() {
    const observer = new PerformanceObserver(list => {
      try {
        const entries = list.getEntries();
        entries.filter(e => !e.responseStatus || e.responseStatus < 400).filter(e => window.location.hostname === new URL(e.name).hostname || fflags.has('allresources')).filter(e => new URL(e.name).pathname.match('.*(\\.plain\\.html$|\\.json|graphql|api)') || fflags.has('allresources') && (new URL(e.name).pathname.includes('__dropins__/storefront-') || new URL(e.name).pathname.includes('scripts/dropins/storefront-'))).forEach(e => {
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
    observer.observe({
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
  function addViewBlockTracking(element) {
    const blockobserver = getIntersectionObserver('viewblock');
    if (blockobserver) {
      const blocks = element.getAttribute('data-block-status') ? [element] : element.querySelectorAll('div[data-block-status="loaded"]');
      blocks.forEach(b => blockobserver.observe(b));
    }
  }
  const observedMedia = new Set();
  function addViewMediaTracking(parent) {
    const mediaobserver = getIntersectionObserver('viewmedia');
    if (mediaobserver) {
      parent.querySelectorAll('img, video, audio, iframe').forEach(m => {
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
  function blocksMCB(mutations) {
    mutations.filter(m => m.type === 'attributes' && m.attributeName === 'data-block-status').filter(m => m.target.dataset.blockStatus === 'loaded').forEach(m => {
      addObserver('form', el => loadPlugins(p => p.isBlockDependent, {
        ...PLUGIN_PARAMETERS,
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
        source: sourceSelector(event.target)
      });
    });
    addNavigationTracking();
    addLoadResourceTracking();
    addViewBlockTracking(document.body);
    addViewMediaTracking(document.body);
    loadPlugins();
    fflags.enabled('language', () => {
      const target = navigator.language;
      const source = document.documentElement.lang;
      sampleRUM('language', {
        source,
        target
      });
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
