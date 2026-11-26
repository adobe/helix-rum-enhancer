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
    a11y: [557, 781, 897, 955, 959],
    softnav: [273]
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

  function getCookie(name) {
    try {
      const matches = document.cookie.split(';').map(c => c.trim()).filter(c => c.startsWith(`${name}=`));
      if (!matches.length) {
        return undefined;
      }
      return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
    } catch {
      return undefined;
    }
  }
  function getLocalStorage(name) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  }

  const {
    sampleRUM,
    queue,
    isSelected
  } = window.hlx && window.hlx.rum ? window.hlx.rum : {};
  const createMO = cb => window.MutationObserver ? new MutationObserver(cb) : {};
  const [blocksMO, mediaMO] = [blocksMCB, mediaMCB].map(createMO);
  const hasCookie = key => getCookie(key) !== undefined;
  const pluginBase = new URL(document.currentScript.src).href.replace(/index(\.map)?\.js/, 'plugins');
  const CONSENT_PROVIDERS = [{
    name: 'onetrust',
    detect: () => ['OptanonAlertBoxClosed', 'OptanonConsent'].some(hasCookie) || document.querySelector('#onetrust-banner-sdk, #onetrust-pc-sdk')
  }, {
    name: 'trustarc',
    detect: () => ['notice_gdpr_prefs', 'notice_preferences'].some(hasCookie) || document.querySelector('#truste-consent-track')
  }, {
    name: 'usercentrics',
    detect: () => getLocalStorage('uc_gcm') || hasCookie('uc_consent_status_essential') || document.querySelector('#usercentrics-root')
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
    softnav: {
      url: `${pluginBase}/softnav.js`,
      when: ({
        fflags: f
      }) => f.has('softnav')
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWFwLmpzIiwic291cmNlcyI6WyIuLi9tb2R1bGVzL2ZmbGFncy5qcyIsIi4uL21vZHVsZXMvZGVmYXVsdHMuanMiLCIuLi9tb2R1bGVzL3V0aWxzLmpzIiwiLi4vbW9kdWxlcy9kb20uanMiLCIuLi9tb2R1bGVzL2NvbnNlbnQuanMiLCIuLi9tb2R1bGVzL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAyNCBBZG9iZS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgZmlsZSBpcyBsaWNlbnNlZCB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5XG4gKiBvZiB0aGUgTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyXG4gKiB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBSRVBSRVNFTlRBVElPTlNcbiAqIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZVxuICogZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuY29uc3QgaCA9IChzLCBhKSA9PiBbLi4uc10ucmVkdWNlKChwLCBjKSA9PiBwICsgYy5jaGFyQ29kZUF0KDApLCBhKSAlIDEzNzE7XG5cbmV4cG9ydCBjb25zdCBmZmxhZ3MgPSB7XG4gIGhhczogKGYpID0+IGZmbGFnc1tmXS5pbmNsdWRlcyhoKHdpbmRvdy5vcmlnaW4sIDEpKSB8fCAvbG9jYWxob3N0Ly50ZXN0KHdpbmRvdy5vcmlnaW4pLFxuICBlbmFibGVkOiAoZiwgYykgPT4gZmZsYWdzLmhhcyhmKSAmJiBjKCksXG4gIGRpc2FibGVkOiAoZiwgYykgPT4gIWZmbGFncy5oYXMoZikgJiYgYygpLFxuICBlYWdlcmN3djogWzY4M10sXG4gIGV4YW1wbGU6IFs1NDMsIDc3MCwgMTEzNl0sXG4gIGFsbHJlc291cmNlczogWzU0MywgMTEzOSwgMzM5XSxcbiAgYTExeTogWzU1NywgNzgxLCA4OTcsIDk1NSwgOTU5XSxcbiAgc29mdG5hdjogWzI3M10sXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDI0IEFkb2JlLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBmaWxlIGlzIGxpY2Vuc2VkIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHlcbiAqIG9mIHRoZSBMaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXJcbiAqIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIFJFUFJFU0VOVEFUSU9OU1xuICogT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlXG4gKiBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5pbXBvcnQgeyBmZmxhZ3MgfSBmcm9tICcuL2ZmbGFncy5qcyc7XG5cbmV4cG9ydCBjb25zdCBLTk9XTl9QUk9QRVJUSUVTID0gWyd3ZWlnaHQnLCAnaWQnLCAncmVmZXJlcicsICdjaGVja3BvaW50JywgJ3QnLCAnc291cmNlJywgJ3RhcmdldCcsICdjd3YnLCAnQ0xTJywgJ0ZJRCcsICdMQ1AnLCAnSU5QJywgJ1RURkInLCAndWEnXTtcbmV4cG9ydCBjb25zdCBERUZBVUxUX1RSQUNLSU5HX0VWRU5UUyA9IFsnY2xpY2snLCAnY3d2JywgJ2Zvcm0nLCAndmlld2Jsb2NrJywgJ3ZpZXdtZWRpYScsICdsb2FkcmVzb3VyY2UnLCAndXRtJywgJ3BhaWQnLCAnZW1haWwnLCAnY29uc2VudCddO1xuZmZsYWdzLmVuYWJsZWQoJ2V4YW1wbGUnLCAoKSA9PiBERUZBVUxUX1RSQUNLSU5HX0VWRU5UUy5wdXNoKCdleGFtcGxlJykpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDI0IEFkb2JlLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBmaWxlIGlzIGxpY2Vuc2VkIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHlcbiAqIG9mIHRoZSBMaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXJcbiAqIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIFJFUFJFU0VOVEFUSU9OU1xuICogT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlXG4gKiBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmNvbnN0IHsgaHJlZiB9ID0gd2luZG93LmxvY2F0aW9uO1xuXG5leHBvcnQgY29uc3QgdXJsU2FuaXRpemVycyA9IHtcbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZ1bGwgdXJsLlxuICAgKiBJZiBubyB1cmwgaXMgcHJvdmlkZWQsIGl0IGRlZmF1bHRzIHRvIHdpbmRvdy5sb2NhdGlvbi5ocmVmLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIChkZWZhdWx0OiB3aW5kb3cubG9jYXRpb24uaHJlZikgVGhlIHVybCB0byBzYW5pdGl6ZVxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgc2FuaXRpemVkIHVybFxuICAgKi9cbiAgZnVsbDogKHVybCA9IGhyZWYpID0+IG5ldyBVUkwodXJsKS50b1N0cmluZygpLFxuICAvKipcbiAgICogUmV0dXJucyB0aGUgb3JpZ2luIG9mIHRoZSBwcm92aWRlZCB1cmwuXG4gICAqIElmIG5vIHVybCBpcyBwcm92aWRlZCwgaXQgZGVmYXVsdHMgdG8gd2luZG93LmxvY2F0aW9uLmhyZWYuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgKGRlZmF1bHQ6IHdpbmRvdy5sb2NhdGlvbi5ocmVmKSBUaGUgdXJsIHRvIHNhbml0aXplXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBzYW5pdGl6ZWQgdXJsXG4gICAqL1xuICBvcmlnaW46ICh1cmwgPSBocmVmKSA9PiBuZXcgVVJMKHVybCkub3JpZ2luLFxuICAvKipcbiAgICogUmV0dXJucyB0aGUgc2FuaXRpemVkIHVybDogdGhlIG9yaWdpbiBhbmQgdGhlIHBhdGggKG5vIHF1ZXJ5IHBhcmFtcyBvciBoYXNoKVxuICAgKiBJZiBubyB1cmwgaXMgcHJvdmlkZWQsIGl0IGRlZmF1bHRzIHRvIHdpbmRvdy5sb2NhdGlvbi5ocmVmLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIChkZWZhdWx0OiB3aW5kb3cubG9jYXRpb24uaHJlZikgVGhlIHVybCB0byBzYW5pdGl6ZVxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgc2FuaXRpemVkIHVybFxuICAgKi9cbiAgcGF0aDogKHVybCA9IGhyZWYpID0+IHtcbiAgICBjb25zdCB1ID0gbmV3IFVSTCh1cmwpO1xuICAgIHJldHVybiBgJHt1Lm9yaWdpbn0ke3UucGF0aG5hbWV9YDtcbiAgfSxcbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMjQgQWRvYmUuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGZpbGUgaXMgbGljZW5zZWQgdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weVxuICogb2YgdGhlIExpY2Vuc2UgYXQgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlclxuICogdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgUkVQUkVTRU5UQVRJT05TXG4gKiBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2VcbiAqIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRUYXJnZXRWYWx1ZSA9IChlbCkgPT4gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJ1bS10YXJnZXQnKSB8fCBlbC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKVxuICB8fCBlbC5jdXJyZW50U3JjIHx8IGVsLmdldEF0dHJpYnV0ZSgnc3JjJykgfHwgZWwuZGF0YXNldC5hY3Rpb24gfHwgZWwuYWN0aW9uO1xuXG5leHBvcnQgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAoZWwpID0+IHtcbiAgdHJ5IHtcbiAgICBpZiAoIWVsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZXQgdiA9IGdldFRhcmdldFZhbHVlKGVsKTtcbiAgICBpZiAoIXYgJiYgZWwudGFnTmFtZSAhPT0gJ0EnICYmIGVsLmNsb3Nlc3QoJ2EnKSkge1xuICAgICAgdiA9IGdldFRhcmdldFZhbHVlKGVsLmNsb3Nlc3QoJ2EnKSk7XG4gICAgfVxuICAgIGlmICh2ICYmICF2LnN0YXJ0c1dpdGgoJ2h0dHBzOi8vJykpIHtcbiAgICAgIC8vIHJlc29sdmUgcmVsYXRpdmUgbGlua3NcbiAgICAgIHYgPSBuZXcgVVJMKHYsIHdpbmRvdy5sb2NhdGlvbikuaHJlZjtcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gICAgLyogYzggaWdub3JlIG5leHQgMyAqL1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgdW50cnVzdGVkQ2xpY2tQYXlsb2FkID0gKGV2ZW50KSA9PiB7XG4gIGlmIChldmVudCAmJiBldmVudC5pc1RydXN0ZWQgPT09IGZhbHNlKSB7XG4gICAgY29uc3QgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuICAgIHJldHVybiB7IHVhOiB1YS5pbmNsdWRlcygnK2h0dHAnKSA/IHVhIDogYCR7dWF9ICtodHRwOi8vZXZlbnQudW50cnVzdGVkYCB9O1xuICB9XG4gIHJldHVybiB7fTtcbn07XG5cbmZ1bmN0aW9uIHdhbGsoZWwsIGNoZWNrKSB7XG4gIGlmICghZWwgfHwgZWwgPT09IGRvY3VtZW50LmJvZHkgfHwgZWwgPT09IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4gY2hlY2soZWwpIHx8IHdhbGsoZWwucGFyZW50RWxlbWVudCB8fCAoZWwucGFyZW50Tm9kZSAmJiBlbC5wYXJlbnROb2RlLmhvc3QpLCBjaGVjayk7XG59XG5cbmZ1bmN0aW9uIGlzRGlhbG9nKGVsKSB7XG4gIGNvbnN0IGNzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpO1xuICByZXR1cm4gZWwudGFnTmFtZSA9PT0gJ0RJQUxPRydcbiAgICB8fCBbJ2RpYWxvZycsICdhbGVydGRpYWxvZyddLmZpbmQoKHIpID0+IGVsLmdldEF0dHJpYnV0ZSgncm9sZScpID09PSByKVxuICAgIHx8IGVsLmdldEF0dHJpYnV0ZSgnYXJpYS1tb2RhbCcpID09PSAndHJ1ZSdcbiAgICB8fCAoY3MgJiYgY3MucG9zaXRpb24gPT09ICdmaXhlZCcgJiYgY3MuekluZGV4ID4gMTAwKTtcbn1cblxuZnVuY3Rpb24gaXNCdXR0b24oZWwpIHtcbiAgaWYgKGVsLnRhZ05hbWUgPT09ICdCVVRUT04nIHx8IChlbC50YWdOYW1lID09PSAnSU5QVVQnICYmIGVsLmdldEF0dHJpYnV0ZSgndHlwZScpID09PSAnYnV0dG9uJykpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoZWwudGFnTmFtZSA9PT0gJ0EnKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oZWwuY2xhc3NMaXN0KS5zb21lKChjbHMpID0+IGNscy5tYXRjaCgvYnV0dG9ufGN0YS8pKTtcbiAgfVxuICByZXR1cm4gZWwuZ2V0QXR0cmlidXRlKCdyb2xlJykgPT09ICdidXR0b24nO1xufVxuXG5mdW5jdGlvbiBzcmNDb250ZXh0KGVsKSB7XG4gIGNvbnN0IGZvcm0gPSBlbC5jbG9zZXN0KCdmb3JtJyk7XG4gIGlmIChmb3JtKSB7XG4gICAgY29uc3QgaWQgPSBmb3JtLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICBpZiAoaWQpIHtcbiAgICAgIHJldHVybiBgZm9ybSMke0NTUy5lc2NhcGUoaWQpfWA7XG4gICAgfVxuICAgIHJldHVybiBgZm9ybSR7Zm9ybS5jbGFzc0xpc3QubGVuZ3RoID4gMCA/IGAuJHtDU1MuZXNjYXBlKGZvcm0uY2xhc3NMaXN0WzBdKX1gIDogJyd9YDtcbiAgfVxuICBjb25zdCBibG9jayA9IGVsLmNsb3Nlc3QoJy5ibG9ja1tkYXRhLWJsb2NrLW5hbWVdJyk7XG4gIHJldHVybiAoKGJsb2NrICYmIGAuJHtibG9jay5nZXRBdHRyaWJ1dGUoJ2RhdGEtYmxvY2stbmFtZScpfWApXG4gICAgfHwgKHdhbGsoZWwsIGlzRGlhbG9nKSAmJiAnZGlhbG9nJylcbiAgICB8fCAod2FsayhlbCwgKGUpID0+IGUudGFnTmFtZSAmJiBlLnRhZ05hbWUuaW5jbHVkZXMoJy0nKSAmJiBlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkpXG4gICAgfHwgWyduYXYnLCAnaGVhZGVyJywgJ2Zvb3RlcicsICdhc2lkZSddLmZpbmQoKHQpID0+IGVsLmNsb3Nlc3QodCkpXG4gICAgfHwgd2FsayhlbCwgKGUpID0+IGUuaWQgJiYgYCMke0NTUy5lc2NhcGUoZS5pZCl9YCkpO1xufVxuXG5mdW5jdGlvbiBzcmNFbGVtZW50KGVsKSB7XG4gIGNvbnN0IGYgPSBlbC5jbG9zZXN0KCdmb3JtJyk7XG4gIGlmIChmICYmIEFycmF5LmZyb20oZi5lbGVtZW50cykuaW5jbHVkZXMoZWwpKSB7XG4gICAgcmV0dXJuIChlbC50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICsgKFsnSU5QVVQnLCAnQlVUVE9OJ10uaW5jbHVkZXMoZWwudGFnTmFtZSlcbiAgICAgICAgPyBgW3R5cGU9JyR7ZWwuZ2V0QXR0cmlidXRlKCd0eXBlJykgfHwgJyd9J11gXG4gICAgICAgIDogJycpKTtcbiAgfVxuICByZXR1cm4gKHdhbGsoZWwsIGlzQnV0dG9uKSAmJiAnYnV0dG9uJylcbiAgICB8fCAoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpLm1hdGNoKC9eKGF8aW1nfHZpZGVvfGZvcm0pJC8pICYmIGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSk7XG59XG5cbmZ1bmN0aW9uIHNyY0lkKGVsKSB7XG4gIHJldHVybiAoZWwuaWQgJiYgYCMke0NTUy5lc2NhcGUoZWwuaWQpfWApXG4gICAgfHwgKGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1uYW1lJykgJiYgYC4ke2VsLmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1uYW1lJyl9YClcbiAgICB8fCAoZWwuY2xhc3NMaXN0Lmxlbmd0aCA+IDAgJiYgYC4ke0NTUy5lc2NhcGUoZWwuY2xhc3NMaXN0WzBdKX1gKTtcbn1cblxuZXhwb3J0IGNvbnN0IHNvdXJjZVNlbGVjdG9yID0gKGVsKSA9PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFlbCB8fCBlbCA9PT0gZG9jdW1lbnQuYm9keSB8fCBlbCA9PT0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAoZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJ1bS1zb3VyY2UnKSkge1xuICAgICAgcmV0dXJuIGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1ydW0tc291cmNlJyk7XG4gICAgfVxuICAgIGNvbnN0IGN0eCA9IHNyY0NvbnRleHQoZWwucGFyZW50RWxlbWVudCkgfHwgJyc7XG4gICAgY29uc3QgbmFtZSA9IHNyY0VsZW1lbnQoZWwpIHx8ICcnO1xuICAgIGNvbnN0IGlkID0gc3JjSWQoZWwpIHx8ICcnO1xuICAgIHJldHVybiBgJHtjdHh9ICR7bmFtZX0ke2lkfWAudHJpbSgpIHx8IGBcIiR7ZWwudGV4dENvbnRlbnQuc3Vic3RyaW5nKDAsIDEwKX1cImA7XG4gICAgLyogYzggaWdub3JlIG5leHQgMyAqL1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDI2IEFkb2JlLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBmaWxlIGlzIGxpY2Vuc2VkIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHlcbiAqIG9mIHRoZSBMaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXJcbiAqIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIFJFUFJFU0VOVEFUSU9OU1xuICogT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlXG4gKiBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8vIFJlYWQgb25seSB0aGUgcmVxdWVzdGVkIHZhbHVlLiBTdG9yYWdlIGNhbiBiZSB1bmF2YWlsYWJsZSBpbiBzYW5kYm94ZWQgZG9jdW1lbnRzLlxuZXhwb3J0IGZ1bmN0aW9uIGdldENvb2tpZShuYW1lKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgbWF0Y2hlcyA9IGRvY3VtZW50LmNvb2tpZS5zcGxpdCgnOycpLm1hcCgoYykgPT4gYy50cmltKCkpXG4gICAgICAuZmlsdGVyKChjKSA9PiBjLnN0YXJ0c1dpdGgoYCR7bmFtZX09YCkpO1xuICAgIGlmICghbWF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8vIG51bGwgZGlzdGluZ3Vpc2hlcyBhbiBhbWJpZ3VvdXMgY29va2llIGZyb20gYW4gYWJzZW50IG9uZSAodW5kZWZpbmVkKS5cbiAgICByZXR1cm4gbWF0Y2hlcy5sZW5ndGggPT09IDEgPyBtYXRjaGVzWzBdLnNsaWNlKG5hbWUubGVuZ3RoICsgMSkgOiBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2NhbFN0b3JhZ2UobmFtZSkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0obmFtZSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8vIFJlcXVpcmVkIGNhdGVnb3JpZXMgbXVzdCBiZSByZW1vdmVkIGJ5IHRoZSBwcm92aWRlciBiZWZvcmUgY2FsbGluZyB0aGlzIGhlbHBlci5cbi8vIEluY29tcGxldGUsIGFtYmlndW91cyBvciBlbXB0eSBzZXRzIG11c3Qgbm90IGJlY29tZSBhIGdyYW50IG9yIGEgcmVqZWN0aW9uLlxuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5Q29uc2VudChjaG9pY2VzKSB7XG4gIGlmICghY2hvaWNlcy5sZW5ndGggfHwgY2hvaWNlcy5sZW5ndGggPiA2NCB8fCBjaG9pY2VzLnNvbWUoKHYpID0+IHR5cGVvZiB2ICE9PSAnYm9vbGVhbicpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoY2hvaWNlcy5ldmVyeShCb29sZWFuKSkge1xuICAgIHJldHVybiAnZ3JhbnRlZCc7XG4gIH1cbiAgaWYgKGNob2ljZXMuc29tZShCb29sZWFuKSkge1xuICAgIHJldHVybiAnY3VzdG9taXplZCc7XG4gIH1cbiAgcmV0dXJuICdyZWplY3RlZCc7XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMjQgQWRvYmUuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGZpbGUgaXMgbGljZW5zZWQgdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weVxuICogb2YgdGhlIExpY2Vuc2UgYXQgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlclxuICogdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgUkVQUkVTRU5UQVRJT05TXG4gKiBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2VcbiAqIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuXG5pbXBvcnQgeyBLTk9XTl9QUk9QRVJUSUVTLCBERUZBVUxUX1RSQUNLSU5HX0VWRU5UUyB9IGZyb20gJy4vZGVmYXVsdHMuanMnO1xuaW1wb3J0IHsgdXJsU2FuaXRpemVycyB9IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IHsgdGFyZ2V0U2VsZWN0b3IsIHNvdXJjZVNlbGVjdG9yLCB1bnRydXN0ZWRDbGlja1BheWxvYWQgfSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQgeyBmZmxhZ3MgfSBmcm9tICcuL2ZmbGFncy5qcyc7XG5pbXBvcnQgeyBnZXRDb29raWUsIGdldExvY2FsU3RvcmFnZSB9IGZyb20gJy4vY29uc2VudC5qcyc7XG5cbmNvbnN0IHsgc2FtcGxlUlVNLCBxdWV1ZSwgaXNTZWxlY3RlZCB9ID0gKHdpbmRvdy5obHggJiYgd2luZG93LmhseC5ydW0pID8gd2luZG93LmhseC5ydW1cbiAgLyogYzggaWdub3JlIG5leHQgKi8gOiB7fTtcblxuY29uc3QgY3JlYXRlTU8gPSAoY2IpID0+ICh3aW5kb3cuTXV0YXRpb25PYnNlcnZlciA/IG5ldyBNdXRhdGlvbk9ic2VydmVyKGNiKVxuLyogYzggaWdub3JlIG5leHQgKi8gOiB7fSk7XG5cbi8vIGJsb2NrcyAmIG1lZGlhIG11dGF0aW9uIG9ic2VydmVyc1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lXG5jb25zdCBbYmxvY2tzTU8sIG1lZGlhTU9dID0gW2Jsb2Nrc01DQiwgbWVkaWFNQ0JdLm1hcChjcmVhdGVNTyk7XG5cbi8vIENoZWNrIGZvciB0aGUgcHJlc2VuY2Ugb2YgYSBnaXZlbiBjb29raWVcbmNvbnN0IGhhc0Nvb2tpZSA9IChrZXkpID0+IGdldENvb2tpZShrZXkpICE9PSB1bmRlZmluZWQ7XG5cbi8vIFNldCB0aGUgYmFzZSBwYXRoIGZvciB0aGUgcGx1Z2luc1xuY29uc3QgcGx1Z2luQmFzZSA9IG5ldyBVUkwoZG9jdW1lbnQuY3VycmVudFNjcmlwdC5zcmMpLmhyZWYucmVwbGFjZSgvaW5kZXgoXFwubWFwKT9cXC5qcy8sICdwbHVnaW5zJyk7XG5cbmNvbnN0IENPTlNFTlRfUFJPVklERVJTID0gW1xuICB7XG4gICAgbmFtZTogJ29uZXRydXN0JyxcbiAgICBkZXRlY3Q6ICgpID0+IFsnT3B0YW5vbkFsZXJ0Qm94Q2xvc2VkJywgJ09wdGFub25Db25zZW50J10uc29tZShoYXNDb29raWUpIHx8IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNvbmV0cnVzdC1iYW5uZXItc2RrLCAjb25ldHJ1c3QtcGMtc2RrJyksXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAndHJ1c3RhcmMnLFxuICAgIGRldGVjdDogKCkgPT4gWydub3RpY2VfZ2Rwcl9wcmVmcycsICdub3RpY2VfcHJlZmVyZW5jZXMnXS5zb21lKGhhc0Nvb2tpZSkgfHwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3RydXN0ZS1jb25zZW50LXRyYWNrJyksXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAndXNlcmNlbnRyaWNzJyxcbiAgICBkZXRlY3Q6ICgpID0+IGdldExvY2FsU3RvcmFnZSgndWNfZ2NtJykgfHwgaGFzQ29va2llKCd1Y19jb25zZW50X3N0YXR1c19lc3NlbnRpYWwnKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdXNlcmNlbnRyaWNzLXJvb3QnKSxcbiAgfSxcbl07XG5cbmNvbnN0IGdldENvbnNlbnQgPSAoKSA9PiBDT05TRU5UX1BST1ZJREVSUy5maW5kKCh7IGRldGVjdCB9KSA9PiBkZXRlY3QoKSk7XG5jb25zdCBib2R5Q2hpbGRNTyA9IHtcbiAgdGFyZ2V0OiBkb2N1bWVudC5ib2R5LFxuICBvcHRpb25zOiB7IGF0dHJpYnV0ZXM6IGZhbHNlLCBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IGZhbHNlIH0sXG59O1xuXG5jb25zdCBQTFVHSU5TID0ge1xuICBjd3Y6IGAke3BsdWdpbkJhc2V9L2N3di5qc2AsXG4gIGExMXk6IGAke3BsdWdpbkJhc2V9L2ExMXkuanNgLFxuICAvLyBJbnRlcmFjdGl2ZSBlbGVtZW50c1xuICBmb3JtOiB7XG4gICAgdXJsOiBgJHtwbHVnaW5CYXNlfS9mb3JtLmpzYCxcbiAgICB3aGVuOiAoKSA9PiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdmb3JtJyksXG4gICAgaXNCbG9ja0RlcGVuZGVudDogdHJ1ZSxcbiAgICBtb1BhcmFtczogYm9keUNoaWxkTU8sXG4gIH0sXG4gIHJlZGlyZWN0OiB7XG4gICAgdXJsOiBgJHtwbHVnaW5CYXNlfS9yZWRpcmVjdC5qc2AsXG4gICAgd2hlbjogKHsgcGVyZkVudHJ5OiBwZSwgdXJsUGFyYW1ldGVyczogdXNwIH0pID0+IChcbiAgICAgIHBlICYmICh1c3AuZ2V0KCdyZWRpcmVjdF9mcm9tJykgfHwgcGUucmVkaXJlY3RDb3VudCA+IDAgfHwgcGUuZmV0Y2hTdGFydCA+IDUwKVxuICAgICksXG4gIH0sXG4gIHZpZGVvOiB7IHVybDogYCR7cGx1Z2luQmFzZX0vdmlkZW8uanNgLCB3aGVuOiAoKSA9PiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCd2aWRlbycpLCBpc0Jsb2NrRGVwZW5kZW50OiB0cnVlIH0sXG4gIHdlYmNvbXBvbmVudDoge1xuICAgIHVybDogYCR7cGx1Z2luQmFzZX0vd2ViY29tcG9uZW50LmpzYCxcbiAgICB3aGVuOiAoKSA9PiBbLi4uZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnKicpXS5zb21lKChlbCkgPT4gZWwudGFnTmFtZSAmJiBlbC50YWdOYW1lLmluY2x1ZGVzKCctJykpLFxuICAgIGlzQmxvY2tEZXBlbmRlbnQ6IHRydWUsXG4gIH0sXG4gIHNvZnRuYXY6IHsgdXJsOiBgJHtwbHVnaW5CYXNlfS9zb2Z0bmF2LmpzYCwgd2hlbjogKHsgZmZsYWdzOiBmIH0pID0+IGYuaGFzKCdzb2Z0bmF2JykgfSxcbiAgLy8gTWFydGVjaFxuICBtYXJ0ZWNoOiB7IHVybDogYCR7cGx1Z2luQmFzZX0vbWFydGVjaC5qc2AsIHdoZW46ICh7IHVybFBhcmFtZXRlcnMgfSkgPT4gdXJsUGFyYW1ldGVycy5zaXplID4gMCB9LFxuICBjb25zZW50OiB7XG4gICAgd2hlbjogKCkgPT4gZ2V0Q29uc2VudCgpLFxuICAgIGlzQmxvY2tEZXBlbmRlbnQ6IHRydWUsXG4gICAgbW9QYXJhbXM6IGJvZHlDaGlsZE1PLFxuICB9LFxuICAvLyB0ZXN0OiBicm9rZW4tcGx1Z2luXG59O1xuXG5jb25zdCBNQVhfRVYgPSAxMDIzO1xuXG5jb25zdCB2bURlZHVwZSA9IG5ldyBTZXQoKTtcblxuZnVuY3Rpb24gZ2V0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIoY2hlY2twb2ludCkge1xuICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gIGlmICghd2luZG93LkludGVyc2VjdGlvbk9ic2VydmVyKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qgb2JzID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKChlbnRyaWVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGVudHJpZXNcbiAgICAgICAgLmZpbHRlcigoZSkgPT4gZS5pc0ludGVyc2VjdGluZylcbiAgICAgICAgLmZvckVhY2goKGUpID0+IHtcbiAgICAgICAgICBvYnMudW5vYnNlcnZlKGUudGFyZ2V0KTsgLy8gb2JzZXJ2ZSBvbmx5IG9uY2VcbiAgICAgICAgICBjb25zdCB0YXJnZXQgPSB0YXJnZXRTZWxlY3RvcihlLnRhcmdldCk7XG4gICAgICAgICAgY29uc3Qgc291cmNlID0gc291cmNlU2VsZWN0b3IoZS50YXJnZXQpO1xuICAgICAgICAgIGlmIChjaGVja3BvaW50ID09PSAndmlld21lZGlhJykge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7c291cmNlfVxcMCR7dGFyZ2V0fWA7XG4gICAgICAgICAgICBpZiAodm1EZWR1cGUuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZtRGVkdXBlLnNpemUgPCBNQVhfRVYpIHtcbiAgICAgICAgICAgICAgdm1EZWR1cGUuYWRkKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHNhbXBsZVJVTShjaGVja3BvaW50LCB7IHRhcmdldCwgc291cmNlIH0pO1xuICAgICAgICB9KTtcbiAgICAgIC8qIGM4IGlnbm9yZSBuZXh0IDMgKi9cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb2JzO1xufVxuXG5jb25zdCBQTFVHSU5fUEFSQU1TID0ge1xuICBjb250ZXh0OiBkb2N1bWVudC5ib2R5LFxuICBmZmxhZ3MsXG4gIHNhbXBsZVJVTSxcbiAgc291cmNlU2VsZWN0b3IsXG4gIHRhcmdldFNlbGVjdG9yLFxuICB1bnRydXN0ZWRDbGlja1BheWxvYWQsXG4gIGdldEludGVyc2VjdGlvbk9ic2VydmVyLFxuICBjcmVhdGVNTyxcbn07XG5cbmNvbnN0IHBsdWdpbkNhY2hlID0gbmV3IE1hcCgpO1xuXG5mdW5jdGlvbiBsb2FkUGx1Z2luKGtleSwgcGFyYW1zKSB7XG4gIGNvbnN0IHBsdWdpbiA9IFBMVUdJTlNba2V5XTtcbiAgY29uc3QgdXNwID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgaWYgKCFwbHVnaW5DYWNoZS5oYXMoa2V5KSAmJiBwbHVnaW4ud2hlbiAmJiAhcGx1Z2luLndoZW4oeyAuLi5wYXJhbXMsIHVybFBhcmFtZXRlcnM6IHVzcCB9KSkge1xuICAgIGlmIChwbHVnaW4ubW9QYXJhbXMgJiYgIXBsdWdpbi5pc0JlaW5nT2JzZXJ2ZWQpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11c2UtYmVmb3JlLWRlZmluZVxuICAgICAgY3JlYXRlUGx1Z2luTU8oa2V5LCBwYXJhbXMsIHVzcCk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChrZXkgPT09ICdjb25zZW50Jykge1xuICAgIHBsdWdpbi51cmwgPSBgJHtwbHVnaW5CYXNlfS8ke2dldENvbnNlbnQoKS5uYW1lfS5qc2A7XG4gIH1cblxuICBpZiAoIXBsdWdpbkNhY2hlLmhhcyhrZXkpKSB7XG4gICAgcGx1Z2luQ2FjaGUuc2V0KGtleSwgaW1wb3J0KGAke3BsdWdpbi51cmwgfHwgcGx1Z2lufWApKTtcbiAgfVxuXG4gIHJldHVybiBwbHVnaW5DYWNoZS5nZXQoa2V5KVxuICAgIC50aGVuKChwKSA9PiAocC5kZWZhdWx0ICYmIHAuZGVmYXVsdChwYXJhbXMpKSB8fCAodHlwZW9mIHAgPT09ICdmdW5jdGlvbicgJiYgcChwYXJhbXMpKSlcbiAgICAuY2F0Y2goKCkgPT4geyAvKiBzaWxlbnQgcGx1Z2luIGVycm9yIGNhdGNoaW5nICovIH0pO1xufVxuXG5mdW5jdGlvbiBsb2FkUGx1Z2lucyhmaWx0ZXIgPSAoKSA9PiB0cnVlLCBwYXJhbXMgPSBQTFVHSU5fUEFSQU1TKSB7XG4gIE9iamVjdC5lbnRyaWVzKFBMVUdJTlMpXG4gICAgLmZpbHRlcigoWywgcGx1Z2luXSkgPT4gZmlsdGVyKHBsdWdpbikpXG4gICAgLm1hcCgoW2tleV0pID0+IGxvYWRQbHVnaW4oa2V5LCBwYXJhbXMpKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGx1Z2luTU8oa2V5LCBwYXJhbXMsIHVzcCkge1xuICBjb25zdCBwbHVnaW4gPSBQTFVHSU5TW2tleV07XG4gIGNvbnN0IG9icyA9IGNyZWF0ZU1PKCgpID0+IHtcbiAgICBpZiAocGx1Z2luLndoZW4oeyB1cmxQYXJhbWV0ZXJzOiB1c3AgfSkpIHtcbiAgICAgIHBsdWdpbi5pc0JlaW5nT2JzZXJ2ZWQgPSBmYWxzZTtcbiAgICAgIG9icy5kaXNjb25uZWN0KCk7XG4gICAgICBsb2FkUGx1Z2luKGtleSwgcGFyYW1zKTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChvYnMgaW5zdGFuY2VvZiBNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgcGx1Z2luLmlzQmVpbmdPYnNlcnZlZCA9IHRydWU7XG4gICAgb2JzLm9ic2VydmUoXG4gICAgICBwbHVnaW4ubW9QYXJhbXMudGFyZ2V0LFxuICAgICAgcGx1Z2luLm1vUGFyYW1zLm9wdGlvbnMsXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIE1heGltdW0gbnVtYmVyIG9mIGV2ZW50cy4gVGhlIGZpcnN0IGNhbGwgd2lsbCBiZSBtYWRlIGJ5IHJ1bS1qcyxcbiAqIGxlYXZpbmcgTUFYX0VWIGZvciB0aGUgZW5oYW5jZXIgdG8gdHJhY2tcbiAqL1xubGV0IG1heEV2ZW50cyA9IE1BWF9FVjtcblxuZnVuY3Rpb24gdHJhY2tDaGVja3BvaW50KGNoZWNrcG9pbnQsIGRhdGEsIHQpIHtcbiAgY29uc3QgeyB3ZWlnaHQsIGlkIH0gPSB3aW5kb3cuaGx4LnJ1bTtcbiAgaWYgKGlzU2VsZWN0ZWQgJiYgbWF4RXZlbnRzKSB7XG4gICAgbWF4RXZlbnRzIC09IDE7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG9iamVjdC1jdXJseS1uZXdsaW5lLCBtYXgtbGVuXG4gICAgY29uc3QgYm9keSA9IEpTT04uc3RyaW5naWZ5KHsgd2VpZ2h0LCBpZCwgcmVmZXJlcjogdXJsU2FuaXRpemVyc1t3aW5kb3cuaGx4LlJVTV9NQVNLX1VSTCB8fCAncGF0aCddKCksIGNoZWNrcG9pbnQsIHQsIC4uLmRhdGEgfSwgS05PV05fUFJPUEVSVElFUyk7XG4gICAgY29uc3QgdXJsUGFyYW1zID0gd2luZG93LlJVTV9QQVJBTVMgPyBgPyR7bmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cuUlVNX1BBUkFNUykudG9TdHJpbmcoKX1gIDogJyc7XG4gICAgY29uc3QgeyBocmVmOiB1cmwsIG9yaWdpbiB9ID0gbmV3IFVSTChgLnJ1bS8ke3dlaWdodH0ke3VybFBhcmFtcy5sZW5ndGggPiAxID8gdXJsUGFyYW1zIDogJyd9YCwgc2FtcGxlUlVNLmNvbGxlY3RCYXNlVVJMKTtcbiAgICBpZiAod2luZG93LmxvY2F0aW9uLm9yaWdpbiA9PT0gb3JpZ2luKSB7XG4gICAgICBjb25zdCBoZWFkZXJzID0geyB0eXBlOiAnYXBwbGljYXRpb24vanNvbicgfTtcbiAgICAgIG5hdmlnYXRvci5zZW5kQmVhY29uKHVybCwgbmV3IEJsb2IoW2JvZHldLCBoZWFkZXJzKSk7XG4gICAgICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gICAgfSBlbHNlIHtcbiAgICAgIG5hdmlnYXRvci5zZW5kQmVhY29uKHVybCwgYm9keSk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5kZWJ1ZyhgcGluZzoke2NoZWNrcG9pbnR9YCwgZGF0YSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1F1ZXVlKCkge1xuICB3aGlsZSAocXVldWUgJiYgcXVldWUubGVuZ3RoKSB7XG4gICAgY29uc3QgY2sgPSBxdWV1ZS5zaGlmdCgpO1xuICAgIHRyYWNrQ2hlY2twb2ludCguLi5jayk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkTmF2aWdhdGlvblRyYWNraW5nKCkge1xuICAvLyBlbnRlciBjaGVja3BvaW50IHdoZW4gcmVmZXJyZXIgaXMgbm90IHRoZSBjdXJyZW50IHBhZ2UgdXJsXG4gIGNvbnN0IG5hdmlnYXRlID0gKHNvdXJjZSwgdHlwZSwgcGVyZkVudHJ5KSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG9iamVjdC1jdXJseS1uZXdsaW5lLCBtYXgtbGVuXG4gICAgY29uc3QgcGF5bG9hZCA9IHsgc291cmNlOiBzb3VyY2UgJiYgdXJsU2FuaXRpemVycy5wYXRoKHNvdXJjZSksIHRhcmdldDogZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlIH07XG4gICAgLyogYzggaWdub3JlIG5leHQgMTMgKi9cbiAgICAvLyBwcmVyZW5kZXJpbmcgY2Fubm90IGJlIHRlc3RlZCB5ZXQgd2l0aCBoZWFkbGVzcyBicm93c2Vyc1xuICAgIGlmIChkb2N1bWVudC5wcmVyZW5kZXJpbmcpIHtcbiAgICAgIC8vIGxpc3RlbiBmb3IgXCJhY3RpdmF0aW9uXCIgb2YgdGhlIGN1cnJlbnQgcHJlLXJlbmRlcmVkIHBhZ2VcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3ByZXJlbmRlcmluZ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgLy8gcHJlLXJlbmRlcmVkIHBhZ2UgaXMgbm93IFwiYWN0aXZhdGVkXCJcbiAgICAgICAgcGF5bG9hZC50YXJnZXQgPSAncHJlcmVuZGVyZWQnO1xuICAgICAgICBzYW1wbGVSVU0oJ25hdmlnYXRlJywgcGF5bG9hZCk7IC8vIHByZXJlbmRlcmVkIG5hdmlnYXRpb25cbiAgICAgIH0sIHtcbiAgICAgICAgb25jZTogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgaWYgKHR5cGUgPT09ICduYXZpZ2F0ZScpIHtcbiAgICAgICAgc2FtcGxlUlVNKCdwcmVyZW5kZXInLCBwYXlsb2FkKTsgLy8gcHJlcmVuZGVyaW5nIHBhZ2VcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdyZWxvYWQnIHx8IHNvdXJjZSA9PT0gd2luZG93LmxvY2F0aW9uLmhyZWYpIHtcbiAgICAgIHNhbXBsZVJVTSgncmVsb2FkJywgcGF5bG9hZCk7XG4gICAgfSBlbHNlIGlmICh0eXBlICYmIHR5cGUgIT09ICduYXZpZ2F0ZScpIHtcbiAgICAgIHNhbXBsZVJVTSh0eXBlLCBwYXlsb2FkKTsgLy8gYmFjaywgZm9yd2FyZCwgcHJlcmVuZGVyLCBldGMuXG4gICAgfSBlbHNlIGlmIChzb3VyY2UgJiYgd2luZG93LmxvY2F0aW9uLm9yaWdpbiA9PT0gbmV3IFVSTChzb3VyY2UpLm9yaWdpbikge1xuICAgICAgc2FtcGxlUlVNKCduYXZpZ2F0ZScsIHBheWxvYWQpOyAvLyBpbnRlcm5hbCBuYXZpZ2F0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHNhbXBsZVJVTSgnZW50ZXInLCBwYXlsb2FkKTsgLy8gZW50ZXIgc2l0ZVxuICAgIH1cbiAgICBsb2FkUGx1Z2luKCdyZWRpcmVjdCcsIHsgLi4uUExVR0lOX1BBUkFNUywgcGVyZkVudHJ5IH0pO1xuICB9O1xuICBjb25zdCBwcm9jZXNzZWQgPSBuZXcgU2V0KCk7IC8vIGF2b2lkIHByb2Nlc3NpbmcgZHVwbGljYXRlIHR5cGVzXG4gIG5ldyBQZXJmb3JtYW5jZU9ic2VydmVyKChsaXN0KSA9PiBsaXN0XG4gICAgLmdldEVudHJpZXMoKVxuICAgIC5maWx0ZXIoKHsgdHlwZSB9KSA9PiAhcHJvY2Vzc2VkLmhhcyh0eXBlKSlcbiAgICAubWFwKChlKSA9PiBbZSwgcHJvY2Vzc2VkLmFkZChlLnR5cGUpXSlcbiAgICAubWFwKChbZV0pID0+IG5hdmlnYXRlKFxuICAgICAgd2luZG93LmhseC5yZWZlcnJlciB8fCBkb2N1bWVudC5yZWZlcnJlcixcbiAgICAgIGUudHlwZSxcbiAgICAgIGUsXG4gICAgKSkpLm9ic2VydmUoeyB0eXBlOiAnbmF2aWdhdGlvbicsIGJ1ZmZlcmVkOiB0cnVlIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRMb2FkUmVzb3VyY2VUcmFja2luZygpIHtcbiAgY29uc3Qgb2JzID0gbmV3IFBlcmZvcm1hbmNlT2JzZXJ2ZXIoKGxpc3QpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW50cmllcyA9IGxpc3QuZ2V0RW50cmllcygpO1xuICAgICAgZW50cmllc1xuICAgICAgICAuZmlsdGVyKChlKSA9PiAhZS5yZXNwb25zZVN0YXR1cyB8fCBlLnJlc3BvbnNlU3RhdHVzIDwgNDAwKVxuICAgICAgICAuZmlsdGVyKChlKSA9PiB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09IG5ldyBVUkwoZS5uYW1lKS5ob3N0bmFtZSB8fCBmZmxhZ3MuaGFzKCdhbGxyZXNvdXJjZXMnKSlcbiAgICAgICAgLmZpbHRlcigoZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHsgcGF0aG5hbWUsIGhvc3RuYW1lIH0gPSBuZXcgVVJMKGUubmFtZSk7XG4gICAgICAgICAgY29uc3QgZXh0TWF0Y2ggPSBwYXRobmFtZS5tYXRjaChcbiAgICAgICAgICAgIGhvc3RuYW1lICE9PSB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWVcbiAgICAgICAgICAgICAgPyAnLiooXFxcXC5odG1sJHxcXFxcLmpzb258XFxcXC5qc3xncmFwaHFsfGFwaSknXG4gICAgICAgICAgICAgIDogJy4qKFxcXFwucGxhaW5cXFxcLmh0bWwkfFxcXFwuanNvbnxncmFwaHFsfGFwaSknLFxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc3QgaXNEcm9wSW4gPSBmZmxhZ3MuaGFzKCdhbGxyZXNvdXJjZXMnKSAmJiAocGF0aG5hbWUuaW5jbHVkZXMoJ19fZHJvcGluc19fL3N0b3JlZnJvbnQtJykgfHwgcGF0aG5hbWUuaW5jbHVkZXMoJ3NjcmlwdHMvZHJvcGlucy9zdG9yZWZyb250LScpKTtcbiAgICAgICAgICBjb25zdCBpc0ltYWdlID0gZmZsYWdzLmhhcygnYWxscmVzb3VyY2VzJykgJiYgcGF0aG5hbWUubWF0Y2goL1xcLihwbmd8anBlP2d8c3ZnKSQvaSk7XG4gICAgICAgICAgcmV0dXJuIGV4dE1hdGNoIHx8IGlzRHJvcEluIHx8IGlzSW1hZ2U7XG4gICAgICAgIH0pXG4gICAgICAgIC5mb3JFYWNoKChlKSA9PiB7XG4gICAgICAgICAgc2FtcGxlUlVNKCdsb2FkcmVzb3VyY2UnLCB7IHNvdXJjZTogZS5uYW1lLCB0YXJnZXQ6IE1hdGgucm91bmQoZS5kdXJhdGlvbikgfSk7XG4gICAgICAgIH0pO1xuICAgICAgZW50cmllc1xuICAgICAgICAuZmlsdGVyKChlKSA9PiBlLnJlc3BvbnNlU3RhdHVzID49IDQwMClcbiAgICAgICAgLmZpbHRlcigoZSkgPT4gIShuZXcgVVJMKGUubmFtZSkucGF0aG5hbWUubWF0Y2goJy4qKC9cXFxcLnJ1bS8xWzAtOV17MCwzfSknKSkpXG4gICAgICAgIC5mb3JFYWNoKChlKSA9PiB7XG4gICAgICAgICAgc2FtcGxlUlVNKCdtaXNzaW5ncmVzb3VyY2UnLCB7IHNvdXJjZTogZS5uYW1lLCB0YXJnZXQ6IGUucmVzcG9uc2VTdGF0dXMgfSk7XG4gICAgICAgIH0pO1xuICAgICAgLyogYzggaWdub3JlIG5leHQgMyAqL1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgIH1cbiAgfSk7XG4gIG9icy5vYnNlcnZlKHsgdHlwZTogJ3Jlc291cmNlJywgYnVmZmVyZWQ6IHRydWUgfSk7XG59XG5cbi8vIGFjdGl2YXRlIGJsb2NrcyBtdXRhdGlvbiBvYnNlcnZlclxuZnVuY3Rpb24gYWN0aXZhdGVCbG9ja3NNTygpIHtcbiAgaWYgKCFibG9ja3NNTyB8fCBibG9ja3NNTy5hY3RpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgYmxvY2tzTU8uYWN0aXZlID0gdHJ1ZTtcbiAgYmxvY2tzTU8ub2JzZXJ2ZShcbiAgICBkb2N1bWVudC5ib2R5LFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBvYmplY3QtY3VybHktbmV3bGluZVxuICAgIHsgc3VidHJlZTogdHJ1ZSwgYXR0cmlidXRlczogdHJ1ZSwgYXR0cmlidXRlRmlsdGVyOiBbJ2RhdGEtYmxvY2stc3RhdHVzJ10gfSxcbiAgKTtcbn1cblxuLy8gYWN0aXZhdGUgbWVkaWEgbXV0YXRpb24gb2JzZXJ2ZXJcbmZ1bmN0aW9uIGFjdGl2YXRlTWVkaWFNTygpIHtcbiAgaWYgKCFtZWRpYU1PIHx8IG1lZGlhTU8uYWN0aXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIG1lZGlhTU8uYWN0aXZlID0gdHJ1ZTtcbiAgbWVkaWFNTy5vYnNlcnZlKFxuICAgIGRvY3VtZW50LmJvZHksXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG9iamVjdC1jdXJseS1uZXdsaW5lXG4gICAgeyBzdWJ0cmVlOiB0cnVlLCBhdHRyaWJ1dGVzOiBmYWxzZSwgY2hpbGRMaXN0OiB0cnVlIH0sXG4gICk7XG59XG5cbmZ1bmN0aW9uIGFkZFZpZXdCbG9ja1RyYWNraW5nKGVsKSB7XG4gIGNvbnN0IGJsb2NrT2JzID0gZ2V0SW50ZXJzZWN0aW9uT2JzZXJ2ZXIoJ3ZpZXdibG9jaycpO1xuICBpZiAoYmxvY2tPYnMpIHtcbiAgICBjb25zdCBibG9ja3MgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtYmxvY2stc3RhdHVzJykgPyBbZWxdIDogZWwucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RhdGEtYmxvY2stc3RhdHVzPVwibG9hZGVkXCJdJyk7XG4gICAgYmxvY2tzLmZvckVhY2goKGIpID0+IGJsb2NrT2JzLm9ic2VydmUoYikpO1xuICB9XG59XG5cbmNvbnN0IG9ic2VydmVkTWVkaWEgPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBhZGRWaWV3TWVkaWFUcmFja2luZyhwYXJlbnQpIHtcbiAgY29uc3QgbWVkaWFPYnMgPSBnZXRJbnRlcnNlY3Rpb25PYnNlcnZlcigndmlld21lZGlhJyk7XG4gIGlmIChtZWRpYU9icykge1xuICAgIHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbWcsIHZpZGVvLCBhdWRpbywgaWZyYW1lJykuZm9yRWFjaCgobSkgPT4ge1xuICAgICAgaWYgKCFvYnNlcnZlZE1lZGlhLmhhcyhtKSkge1xuICAgICAgICBvYnNlcnZlZE1lZGlhLmFkZChtKTtcbiAgICAgICAgbWVkaWFPYnMub2JzZXJ2ZShtKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRPYnNlcnZlcihjaywgZm4sIGJsb2NrKSB7XG4gIHJldHVybiBERUZBVUxUX1RSQUNLSU5HX0VWRU5UUy5pbmNsdWRlcyhjaykgJiYgZm4oYmxvY2spO1xufVxuXG4vLyBibG9ja3MgbXV0YXRpb24gb2JzZXJ2ZXIgY2FsbGJhY2tcbmZ1bmN0aW9uIGJsb2Nrc01DQihtdXRhdGlvbnMpIHtcbiAgLy8gYmxvY2sgc3BlY2lmaWMgbXV0YXRpb25zXG4gIG11dGF0aW9uc1xuICAgIC5maWx0ZXIoKG0pID0+IG0udHlwZSA9PT0gJ2F0dHJpYnV0ZXMnICYmIG0uYXR0cmlidXRlTmFtZSA9PT0gJ2RhdGEtYmxvY2stc3RhdHVzJylcbiAgICAuZmlsdGVyKChtKSA9PiBtLnRhcmdldC5kYXRhc2V0LmJsb2NrU3RhdHVzID09PSAnbG9hZGVkJylcbiAgICAuZm9yRWFjaCgobSkgPT4ge1xuICAgICAgYWRkT2JzZXJ2ZXIoJ2Zvcm0nLCAoZWwpID0+IGxvYWRQbHVnaW5zKChwKSA9PiBwLmlzQmxvY2tEZXBlbmRlbnQsIHsgLi4uUExVR0lOX1BBUkFNUywgY29udGV4dDogZWwgfSksIG0udGFyZ2V0KTtcbiAgICAgIGFkZE9ic2VydmVyKCd2aWV3YmxvY2snLCBhZGRWaWV3QmxvY2tUcmFja2luZywgbS50YXJnZXQpO1xuICAgIH0pO1xufVxuXG4vLyBtZWRpYSBtdXRhdGlvbiBvYnNlcnZlciBjYWxsYmFja1xuZnVuY3Rpb24gbWVkaWFNQ0IobXV0YXRpb25zKSB7XG4gIC8vIG1lZGlhIG11dGF0aW9uc1xuICBtdXRhdGlvbnNcbiAgICAuZm9yRWFjaCgobSkgPT4ge1xuICAgICAgYWRkT2JzZXJ2ZXIoJ3ZpZXdtZWRpYScsIGFkZFZpZXdNZWRpYVRyYWNraW5nLCBtLnRhcmdldCk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZFRyYWNraW5nRnJvbUNvbmZpZygpIHtcbiAgYWN0aXZhdGVCbG9ja3NNTygpO1xuICBhY3RpdmF0ZU1lZGlhTU8oKTtcblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5vcHRlbEhhbmRsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICBzYW1wbGVSVU0oJ2NsaWNrJywgeyB0YXJnZXQ6IHRhcmdldFNlbGVjdG9yKGV2ZW50LnRhcmdldCksIHNvdXJjZTogc291cmNlU2VsZWN0b3IoZXZlbnQudGFyZ2V0KSwgLi4udW50cnVzdGVkQ2xpY2tQYXlsb2FkKGV2ZW50KSB9KTtcbiAgfSk7XG5cbiAgLy8gQ29yZSB0cmFja2luZ1xuICBhZGROYXZpZ2F0aW9uVHJhY2tpbmcoKTtcbiAgYWRkTG9hZFJlc291cmNlVHJhY2tpbmcoKTtcbiAgYWRkVmlld0Jsb2NrVHJhY2tpbmcoZG9jdW1lbnQuYm9keSk7XG4gIGFkZFZpZXdNZWRpYVRyYWNraW5nKGRvY3VtZW50LmJvZHkpO1xuXG4gIC8vIFRyYWNraW5nIGV4dGVuc2lvbnNcbiAgbG9hZFBsdWdpbnMoKTtcblxuICBjb25zdCB0YXJnZXQgPSBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG4gIGNvbnN0IHNvdXJjZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5sYW5nO1xuICBzYW1wbGVSVU0oJ2xhbmd1YWdlJywgeyBzb3VyY2UsIHRhcmdldCB9KTtcbn1cblxuZnVuY3Rpb24gaW5pdEVuaGFuY2VyKCkge1xuICB0cnkge1xuICAgIGlmIChzYW1wbGVSVU0pIHtcbiAgICAgIGFkZFRyYWNraW5nRnJvbUNvbmZpZygpO1xuICAgICAgd2luZG93LmhseC5ydW0uY29sbGVjdG9yID0gdHJhY2tDaGVja3BvaW50O1xuICAgICAgcHJvY2Vzc1F1ZXVlKCk7XG4gICAgfVxuICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfVxufVxuXG5pbml0RW5oYW5jZXIoKTtcbiJdLCJuYW1lcyI6WyJoIiwicyIsImEiLCJyZWR1Y2UiLCJwIiwiYyIsImNoYXJDb2RlQXQiLCJmZmxhZ3MiLCJoYXMiLCJmIiwiaW5jbHVkZXMiLCJ3aW5kb3ciLCJvcmlnaW4iLCJ0ZXN0IiwiZW5hYmxlZCIsImRpc2FibGVkIiwiZWFnZXJjd3YiLCJleGFtcGxlIiwiYWxscmVzb3VyY2VzIiwiYTExeSIsInNvZnRuYXYiLCJLTk9XTl9QUk9QRVJUSUVTIiwiREVGQVVMVF9UUkFDS0lOR19FVkVOVFMiLCJwdXNoIiwiaHJlZiIsImxvY2F0aW9uIiwidXJsU2FuaXRpemVycyIsImZ1bGwiLCJ1cmwiLCJVUkwiLCJ0b1N0cmluZyIsInBhdGgiLCJ1IiwicGF0aG5hbWUiLCJnZXRUYXJnZXRWYWx1ZSIsImVsIiwiZ2V0QXR0cmlidXRlIiwiY3VycmVudFNyYyIsImRhdGFzZXQiLCJhY3Rpb24iLCJ0YXJnZXRTZWxlY3RvciIsInVuZGVmaW5lZCIsInYiLCJ0YWdOYW1lIiwiY2xvc2VzdCIsInN0YXJ0c1dpdGgiLCJlcnJvciIsInVudHJ1c3RlZENsaWNrUGF5bG9hZCIsImV2ZW50IiwiaXNUcnVzdGVkIiwidWEiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJ3YWxrIiwiY2hlY2siLCJkb2N1bWVudCIsImJvZHkiLCJkb2N1bWVudEVsZW1lbnQiLCJwYXJlbnRFbGVtZW50IiwicGFyZW50Tm9kZSIsImhvc3QiLCJpc0RpYWxvZyIsImNzIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImZpbmQiLCJyIiwicG9zaXRpb24iLCJ6SW5kZXgiLCJpc0J1dHRvbiIsIkFycmF5IiwiZnJvbSIsImNsYXNzTGlzdCIsInNvbWUiLCJjbHMiLCJtYXRjaCIsInNyY0NvbnRleHQiLCJmb3JtIiwiaWQiLCJDU1MiLCJlc2NhcGUiLCJsZW5ndGgiLCJibG9jayIsImUiLCJ0b0xvd2VyQ2FzZSIsInQiLCJzcmNFbGVtZW50IiwiZWxlbWVudHMiLCJzcmNJZCIsInNvdXJjZVNlbGVjdG9yIiwiY3R4IiwibmFtZSIsInRyaW0iLCJ0ZXh0Q29udGVudCIsInN1YnN0cmluZyIsImdldENvb2tpZSIsIm1hdGNoZXMiLCJjb29raWUiLCJzcGxpdCIsIm1hcCIsImZpbHRlciIsInNsaWNlIiwiZ2V0TG9jYWxTdG9yYWdlIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsInNhbXBsZVJVTSIsInF1ZXVlIiwiaXNTZWxlY3RlZCIsImhseCIsInJ1bSIsImNyZWF0ZU1PIiwiY2IiLCJNdXRhdGlvbk9ic2VydmVyIiwiYmxvY2tzTU8iLCJtZWRpYU1PIiwiYmxvY2tzTUNCIiwibWVkaWFNQ0IiLCJoYXNDb29raWUiLCJrZXkiLCJwbHVnaW5CYXNlIiwiY3VycmVudFNjcmlwdCIsInNyYyIsInJlcGxhY2UiLCJDT05TRU5UX1BST1ZJREVSUyIsImRldGVjdCIsInF1ZXJ5U2VsZWN0b3IiLCJnZXRDb25zZW50IiwiYm9keUNoaWxkTU8iLCJ0YXJnZXQiLCJvcHRpb25zIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsInN1YnRyZWUiLCJQTFVHSU5TIiwiY3d2Iiwid2hlbiIsImlzQmxvY2tEZXBlbmRlbnQiLCJtb1BhcmFtcyIsInJlZGlyZWN0IiwicGVyZkVudHJ5IiwicGUiLCJ1cmxQYXJhbWV0ZXJzIiwidXNwIiwiZ2V0IiwicmVkaXJlY3RDb3VudCIsImZldGNoU3RhcnQiLCJ2aWRlbyIsIndlYmNvbXBvbmVudCIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJtYXJ0ZWNoIiwic2l6ZSIsImNvbnNlbnQiLCJNQVhfRVYiLCJ2bURlZHVwZSIsIlNldCIsImdldEludGVyc2VjdGlvbk9ic2VydmVyIiwiY2hlY2twb2ludCIsIkludGVyc2VjdGlvbk9ic2VydmVyIiwib2JzIiwiZW50cmllcyIsImlzSW50ZXJzZWN0aW5nIiwiZm9yRWFjaCIsInVub2JzZXJ2ZSIsInNvdXJjZSIsImFkZCIsIlBMVUdJTl9QQVJBTVMiLCJjb250ZXh0IiwicGx1Z2luQ2FjaGUiLCJNYXAiLCJsb2FkUGx1Z2luIiwicGFyYW1zIiwicGx1Z2luIiwiVVJMU2VhcmNoUGFyYW1zIiwic2VhcmNoIiwiaXNCZWluZ09ic2VydmVkIiwiY3JlYXRlUGx1Z2luTU8iLCJzZXQiLCJ0aGVuIiwiZGVmYXVsdCIsImNhdGNoIiwibG9hZFBsdWdpbnMiLCJPYmplY3QiLCJkaXNjb25uZWN0Iiwib2JzZXJ2ZSIsIm1heEV2ZW50cyIsInRyYWNrQ2hlY2twb2ludCIsImRhdGEiLCJ3ZWlnaHQiLCJKU09OIiwic3RyaW5naWZ5IiwicmVmZXJlciIsIlJVTV9NQVNLX1VSTCIsInVybFBhcmFtcyIsIlJVTV9QQVJBTVMiLCJjb2xsZWN0QmFzZVVSTCIsImhlYWRlcnMiLCJ0eXBlIiwic2VuZEJlYWNvbiIsIkJsb2IiLCJjb25zb2xlIiwiZGVidWciLCJwcm9jZXNzUXVldWUiLCJjayIsInNoaWZ0IiwiYWRkTmF2aWdhdGlvblRyYWNraW5nIiwibmF2aWdhdGUiLCJwYXlsb2FkIiwidmlzaWJpbGl0eVN0YXRlIiwicHJlcmVuZGVyaW5nIiwiYWRkRXZlbnRMaXN0ZW5lciIsIm9uY2UiLCJwcm9jZXNzZWQiLCJQZXJmb3JtYW5jZU9ic2VydmVyIiwibGlzdCIsImdldEVudHJpZXMiLCJyZWZlcnJlciIsImJ1ZmZlcmVkIiwiYWRkTG9hZFJlc291cmNlVHJhY2tpbmciLCJyZXNwb25zZVN0YXR1cyIsImhvc3RuYW1lIiwiZXh0TWF0Y2giLCJpc0Ryb3BJbiIsImlzSW1hZ2UiLCJNYXRoIiwicm91bmQiLCJkdXJhdGlvbiIsImFjdGl2YXRlQmxvY2tzTU8iLCJhY3RpdmUiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJhY3RpdmF0ZU1lZGlhTU8iLCJhZGRWaWV3QmxvY2tUcmFja2luZyIsImJsb2NrT2JzIiwiYmxvY2tzIiwiYiIsIm9ic2VydmVkTWVkaWEiLCJhZGRWaWV3TWVkaWFUcmFja2luZyIsInBhcmVudCIsIm1lZGlhT2JzIiwibSIsImFkZE9ic2VydmVyIiwiZm4iLCJtdXRhdGlvbnMiLCJhdHRyaWJ1dGVOYW1lIiwiYmxvY2tTdGF0dXMiLCJhZGRUcmFja2luZ0Zyb21Db25maWciLCJvcHRlbEhhbmRsZWQiLCJsYW5ndWFnZSIsImxhbmciLCJpbml0RW5oYW5jZXIiLCJjb2xsZWN0b3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0VBV0EsTUFBTUEsQ0FBQyxHQUFHQSxDQUFDQyxDQUFDLEVBQUVDLENBQUMsS0FBSyxDQUFDLEdBQUdELENBQUMsQ0FBQyxDQUFDRSxNQUFNLENBQUMsQ0FBQ0MsQ0FBQyxFQUFFQyxDQUFDLEtBQUtELENBQUMsR0FBR0MsQ0FBQyxDQUFDQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUVKLENBQUMsQ0FBQyxHQUFHLElBQUk7RUFFbkUsTUFBTUssTUFBTSxHQUFHO0lBQ3BCQyxHQUFHLEVBQUdDLENBQUMsSUFBS0YsTUFBTSxDQUFDRSxDQUFDLENBQUMsQ0FBQ0MsUUFBUSxDQUFDVixDQUFDLENBQUNXLE1BQU0sQ0FBQ0MsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBVyxDQUFDQyxJQUFJLENBQUNGLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDO0VBQ3RGRSxFQUFBQSxPQUFPLEVBQUVBLENBQUNMLENBQUMsRUFBRUosQ0FBQyxLQUFLRSxNQUFNLENBQUNDLEdBQUcsQ0FBQ0MsQ0FBQyxDQUFDLElBQUlKLENBQUMsRUFBRTtFQUN2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
