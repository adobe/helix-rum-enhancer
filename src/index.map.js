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

  const fflags = {
    has: (flag) => fflags[flag].indexOf(Array.from(window.origin)
      .map((a) => a.charCodeAt(0))
      .reduce((a, b) => a + b, 1) % 1371) !== -1
      || !!window.origin.match(/localhost/),
    enabled: (flag, callback) => fflags.has(flag) && callback(),
    disabled: (flag, callback) => !fflags.has(flag) && callback(),
    eagercwv: [683],
    redirect: [620, 1139],
    example: [543, 770, 1136],
    language: [543, 959, 1139, 620],
  };

  const KNOWN_PROPERTIES = ['weight', 'id', 'referer', 'checkpoint', 't', 'source', 'target', 'cwv', 'CLS', 'FID', 'LCP', 'INP', 'TTFB'];
  const DEFAULT_TRACKING_EVENTS = ['click', 'cwv', 'form', 'viewblock', 'viewmedia', 'loadresource', 'utm', 'paid', 'email', 'consent'];
  fflags.enabled('example', () => DEFAULT_TRACKING_EVENTS.push('example'));

  const urlSanitizers = {
    full: (url = window.location.href) => new URL(url).toString(),
    origin: (url = window.location.href) => new URL(url).origin,
    path: (url = window.location.href) => {
      const u = new URL(url);
      return `${u.origin}${u.pathname}`;
    },
  };

  const getTargetValue = (element) => element.getAttribute('data-rum-target') || element.getAttribute('href')
      || element.currentSrc || element.getAttribute('src') || element.dataset.action || element.action;
  const targetSelector = (element) => {
    try {
      if (!element) return undefined;
      let value = getTargetValue(element);
      if (!value && element.tagName !== 'A' && element.closest('a')) {
        value = getTargetValue(element.closest('a'));
      }
      if (value && !value.startsWith('https://')) {
        value = new URL(value, window.location).href;
      }
      return value;
    } catch (error) {
      return null;
    }
  };
  function walk(element, checkFn) {
    if (!element || element === document.body || element === document.documentElement) {
      return undefined;
    }
    const checkValue = checkFn(element);
    return checkValue || walk(element.parentElement, checkFn);
  }
  function isDialog(element) {
    if (element.tagName === 'DIALOG') return true;
    if (element.getAttribute('role') === 'dialog') return true;
    if (element.getAttribute('role') === 'alertdialog') return true;
    if (element.getAttribute('aria-modal') === 'true') return true;
    const computedStyle = window.getComputedStyle(element);
    return (computedStyle && computedStyle.position === 'fixed' && computedStyle.zIndex > 100);
  }
  function isButton(element) {
    if (element.tagName === 'BUTTON') return true;
    if (element.tagName === 'INPUT' && element.getAttribute('type') === 'button') return true;
    if (element.tagName === 'A') {
      const classes = Array.from(element.classList);
      return classes.some((className) => className.match(/button|cta/));
    }
    return element.getAttribute('role') === 'button';
  }
  function getSourceContext(element) {
    if (element.closest('form')) return 'form';
    const block = element.closest('.block[data-block-name]');
    if (block) return `.${block.getAttribute('data-block-name')}`;
    if (walk(element, isDialog)) return 'dialog';
    if (element.closest('nav')) return 'nav';
    if (element.closest('header')) return 'header';
    if (element.closest('footer')) return 'footer';
    if (element.closest('aside')) return 'aside';
    return (walk(element, (e) => e.id && `#${e.id}`));
  }
  function getSourceElement(element) {
    if (element.closest('form') && Array.from(element.closest('form').elements).includes(element)) return element.tagName.toLowerCase() + (element.tagName === 'INPUT' ? `[type='${element.getAttribute('type') || ''}']` : '');
    if (walk(element, isButton)) return 'button';
    return element.tagName.toLowerCase().match(/^(a|img|video)$/) && element.tagName.toLowerCase();
  }
  function getSourceIdentifier(element) {
    if (element.id) return `#${element.id}`;
    if (element.getAttribute('data-block-name')) return `.${element.getAttribute('data-block-name')}`;
    return (element.classList.length > 0 && `.${element.classList[0]}`);
  }
  const sourceSelector = (element) => {
    try {
      if (!element || element === document.body || element === document.documentElement) {
        return undefined;
      }
      if (element.getAttribute('data-rum-source')) {
        return element.getAttribute('data-rum-source');
      }
      const context = getSourceContext(element.parentElement) || '';
      const elementName = getSourceElement(element) || '';
      const identifier = getSourceIdentifier(element) || '';
      return `${context} ${elementName}${identifier}`.trim() || `"${element.textContent.substring(0, 10)}"`;
    } catch (error) {
      return null;
    }
  };

  function addCookieConsentTracking(sampleRUM) {
    const cmpCookie = document.cookie.split(';')
      .map((c) => c.trim())
      .find((cookie) => cookie.startsWith('OptanonAlertBoxClosed='));
    if (cmpCookie) {
      sampleRUM('consent', { source: 'onetrust', target: 'hidden' });
      return;
    }
    let consentMutationObserver;
    const trackShowConsent = () => {
      const otsdk = document.querySelector('body > div#onetrust-consent-sdk');
      if (otsdk) {
        if (otsdk.checkVisibility && !otsdk.checkVisibility()) {
          sampleRUM('consent', { source: 'onetrust', target: 'suppressed' });
        } else {
          sampleRUM('consent', { source: 'onetrust', target: 'show' });
        }
        if (consentMutationObserver) {
          consentMutationObserver.disconnect();
        }
        return true;
      }
      return false;
    };
    if (!trackShowConsent()) {
      consentMutationObserver = window.MutationObserver
        ? new MutationObserver(trackShowConsent)
        :  null;
      if (consentMutationObserver) {
        consentMutationObserver.observe(
          document.body,
          { attributes: false, childList: true, subtree: false },
        );
      }
    }
  }
  function addUTMParametersTracking(sampleRUM) {
    const usp = new URLSearchParams(window.location.search);
    [...usp.entries()]
      .filter(([key]) => key.startsWith('utm_'))
      .filter(([key]) => key !== 'utm_id')
      .filter(([key]) => key !== 'utm_term')
      .forEach(([source, target]) => sampleRUM('utm', { source, target }));
  }
  function addAdsParametersTracking(sampleRUM) {
    const networks = {
      google: /gclid|gclsrc|wbraid|gbraid/,
      doubleclick: /dclid/,
      microsoft: /msclkid/,
      facebook: /fb(cl|ad_|pxl_)id/,
      twitter: /tw(clid|src|term)/,
      linkedin: /li_fat_id/,
      pinterest: /epik/,
      tiktok: /ttclid/,
    };
    const params = Array.from(new URLSearchParams(window.location.search).keys());
    Object.entries(networks).forEach(([network, regex]) => {
      params.filter((param) => regex.test(param)).forEach((param) => sampleRUM('paid', { source: network, target: param }));
    });
  }
  function addEmailParameterTracking(sampleRUM) {
    const networks = {
      mailchimp: /mc_(c|e)id/,
      marketo: /mkt_tok/,
    };
    const params = Array.from(new URLSearchParams(window.location.search).keys());
    Object.entries(networks).forEach(([network, regex]) => {
      params.filter((param) => regex.test(param)).forEach((param) => sampleRUM('email', { source: network, target: param }));
    });
  }

  const { sampleRUM, queue, isSelected } = (window.hlx && window.hlx.rum) ? window.hlx.rum
     : {};
  const formSubmitListener = (e) => sampleRUM('formsubmit', { target: targetSelector(e.target), source: sourceSelector(e.target) });
  const blocksMutationObserver = window.MutationObserver ? new MutationObserver(blocksMutationsCallback)
     : {};
  const mediaMutationObserver = window.MutationObserver ? new MutationObserver(mediaMutationsCallback)
     : {};
  function trackCheckpoint(checkpoint, data, t) {
    const { weight, id } = window.hlx.rum;
    if (isSelected) {
      const sendPing = (pdata = data) => {
        const body = JSON.stringify({ weight, id, referer: urlSanitizers[window.hlx.RUM_MASK_URL || 'path'](), checkpoint, t, ...data }, KNOWN_PROPERTIES);
        const urlParams = window.RUM_PARAMS ? `?${new URLSearchParams(window.RUM_PARAMS).toString()}` : '';
        const { href: url, origin } = new URL(`.rum/${weight}${urlParams}`, sampleRUM.collectBaseURL);
        if (window.location.origin === origin) {
          const headers = { type: 'application/json' };
          navigator.sendBeacon(url, new Blob([body], headers));
        } else {
          navigator.sendBeacon(url, body);
        }
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
            sampleRUM('cwv', data);
          };
          const isEager = (metric) => ['CLS', 'LCP'].includes(metric);
          ['FID', 'INP', 'TTFB', 'CLS', 'LCP'].forEach((metric) => {
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
      } catch (error) {
      }
    }, 2000);
  }
  function addNavigationTracking() {
    const navigate = (source, type, redirectCount) => {
      const payload = { source, target: document.visibilityState };
      if (type === 'reload' || source === window.location.href) {
        sampleRUM('reload', payload);
      } else if (type && type !== 'navigate') {
        sampleRUM(type, payload);
      } else if (source && window.location.origin === new URL(source).origin) {
        sampleRUM('navigate', payload);
      } else {
        sampleRUM('enter', payload);
      }
      fflags.enabled('redirect', () => {
        const from = new URLSearchParams(window.location.search).get('redirect-from');
        if (redirectCount || from) {
          sampleRUM('redirect', { source: from, target: redirectCount || 1 });
        }
      });
    };
    new PerformanceObserver((list) => list
      .getEntries().map((entry) => navigate(
        window.hlx.referrer || document.referrer,
        entry.type,
        entry.redirectCount,
      )))
      .observe({ type: 'navigation', buffered: true });
  }
  function addLoadResourceTracking() {
    const observer = new PerformanceObserver((list) => {
      try {
        list.getEntries()
          .filter((entry) => !entry.responseStatus || entry.responseStatus < 400)
          .filter((entry) => window.location.hostname === new URL(entry.name).hostname)
          .filter((entry) => new URL(entry.name).pathname.match('.*(\\.plain\\.html$|\\.json|graphql|api)'))
          .forEach((entry) => {
            sampleRUM('loadresource', { source: entry.name, target: Math.round(entry.duration) });
          });
        list.getEntries()
          .filter((entry) => entry.responseStatus === 404)
          .forEach((entry) => {
            sampleRUM('missingresource', { source: entry.name, target: entry.hostname });
          });
      } catch (error) {
      }
    });
    observer.observe({ type: 'resource', buffered: true });
  }
  function activateBlocksMutationObserver() {
    if (!blocksMutationObserver || blocksMutationObserver.active) {
      return;
    }
    blocksMutationObserver.active = true;
    blocksMutationObserver.observe(
      document.body,
      { subtree: true, attributes: true, attributeFilter: ['data-block-status'] },
    );
  }
  function activateMediaMutationObserver() {
    if (!mediaMutationObserver || mediaMutationObserver.active) {
      return;
    }
    mediaMutationObserver.active = true;
    mediaMutationObserver.observe(
      document.body,
      { subtree: true, attributes: false, childList: true },
    );
  }
  function getIntersectionObsever(checkpoint) {
    if (!window.IntersectionObserver) {
      return null;
    }
    activateBlocksMutationObserver();
    activateMediaMutationObserver();
    const observer = new IntersectionObserver((entries) => {
      try {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            observer.unobserve(entry.target);
            const target = targetSelector(entry.target);
            const source = sourceSelector(entry.target);
            sampleRUM(checkpoint, { target, source });
          });
      } catch (error) {
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
    activateBlocksMutationObserver();
    activateMediaMutationObserver();
    parent.querySelectorAll('form').forEach((form) => {
      form.removeEventListener('submit', formSubmitListener);
      form.addEventListener('submit', formSubmitListener);
    });
  }
  function addObserver(ck, fn, block) {
    return DEFAULT_TRACKING_EVENTS.includes(ck) && fn(block);
  }
  function blocksMutationsCallback(mutations) {
    mutations
      .filter((m) => m.type === 'attributes' && m.attributeName === 'data-block-status')
      .filter((m) => m.target.dataset.blockStatus === 'loaded')
      .forEach((m) => {
        addObserver('form', addFormTracking, m.target);
        addObserver('viewblock', addViewBlockTracking, m.target);
      });
  }
  function mediaMutationsCallback(mutations) {
    mutations
      .forEach((m) => {
        addObserver('viewmedia', addViewMediaTracking, m.target);
      });
  }
  function addTrackingFromConfig() {
    document.addEventListener('click', (event) => {
      sampleRUM('click', { target: targetSelector(event.target), source: sourceSelector(event.target) });
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
    } catch (error) {
    }
  }
  initEnhancer();

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWFwLmpzIiwic291cmNlcyI6WyIuLi9tb2R1bGVzL2ZmbGFncy5qcyIsIi4uL21vZHVsZXMvZGVmYXVsdHMuanMiLCIuLi9tb2R1bGVzL3V0aWxzLmpzIiwiLi4vbW9kdWxlcy9kb20uanMiLCIuLi9tb2R1bGVzL21hcnRlY2guanMiLCIuLi9tb2R1bGVzL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAyNCBBZG9iZS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgZmlsZSBpcyBsaWNlbnNlZCB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5XG4gKiBvZiB0aGUgTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyXG4gKiB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBSRVBSRVNFTlRBVElPTlNcbiAqIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZVxuICogZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGZmbGFncyA9IHtcbiAgaGFzOiAoZmxhZykgPT4gZmZsYWdzW2ZsYWddLmluZGV4T2YoQXJyYXkuZnJvbSh3aW5kb3cub3JpZ2luKVxuICAgIC5tYXAoKGEpID0+IGEuY2hhckNvZGVBdCgwKSlcbiAgICAucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMSkgJSAxMzcxKSAhPT0gLTFcbiAgICB8fCAhIXdpbmRvdy5vcmlnaW4ubWF0Y2goL2xvY2FsaG9zdC8pLFxuICBlbmFibGVkOiAoZmxhZywgY2FsbGJhY2spID0+IGZmbGFncy5oYXMoZmxhZykgJiYgY2FsbGJhY2soKSxcbiAgLyogYzggaWdub3JlIG5leHQgKi9cbiAgZGlzYWJsZWQ6IChmbGFnLCBjYWxsYmFjaykgPT4gIWZmbGFncy5oYXMoZmxhZykgJiYgY2FsbGJhY2soKSxcbiAgZWFnZXJjd3Y6IFs2ODNdLFxuICByZWRpcmVjdDogWzYyMCwgMTEzOV0sXG4gIGV4YW1wbGU6IFs1NDMsIDc3MCwgMTEzNl0sXG4gIGxhbmd1YWdlOiBbNTQzLCA5NTksIDExMzksIDYyMF0sXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDI0IEFkb2JlLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBmaWxlIGlzIGxpY2Vuc2VkIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHlcbiAqIG9mIHRoZSBMaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXJcbiAqIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIFJFUFJFU0VOVEFUSU9OU1xuICogT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlXG4gKiBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5pbXBvcnQgeyBmZmxhZ3MgfSBmcm9tICcuL2ZmbGFncy5qcyc7XG5cbmV4cG9ydCBjb25zdCBLTk9XTl9QUk9QRVJUSUVTID0gWyd3ZWlnaHQnLCAnaWQnLCAncmVmZXJlcicsICdjaGVja3BvaW50JywgJ3QnLCAnc291cmNlJywgJ3RhcmdldCcsICdjd3YnLCAnQ0xTJywgJ0ZJRCcsICdMQ1AnLCAnSU5QJywgJ1RURkInXTtcbmV4cG9ydCBjb25zdCBERUZBVUxUX1RSQUNLSU5HX0VWRU5UUyA9IFsnY2xpY2snLCAnY3d2JywgJ2Zvcm0nLCAndmlld2Jsb2NrJywgJ3ZpZXdtZWRpYScsICdsb2FkcmVzb3VyY2UnLCAndXRtJywgJ3BhaWQnLCAnZW1haWwnLCAnY29uc2VudCddO1xuZmZsYWdzLmVuYWJsZWQoJ2V4YW1wbGUnLCAoKSA9PiBERUZBVUxUX1RSQUNLSU5HX0VWRU5UUy5wdXNoKCdleGFtcGxlJykpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDI0IEFkb2JlLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBmaWxlIGlzIGxpY2Vuc2VkIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHlcbiAqIG9mIHRoZSBMaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXJcbiAqIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIFJFUFJFU0VOVEFUSU9OU1xuICogT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlXG4gKiBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmV4cG9ydCBjb25zdCB1cmxTYW5pdGl6ZXJzID0ge1xuICAvKipcbiAgICogUmV0dXJucyB0aGUgZnVsbCB1cmwuXG4gICAqIElmIG5vIHVybCBpcyBwcm92aWRlZCwgaXQgZGVmYXVsdHMgdG8gd2luZG93LmxvY2F0aW9uLmhyZWYuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgKGRlZmF1bHQ6IHdpbmRvdy5sb2NhdGlvbi5ocmVmKSBUaGUgdXJsIHRvIHNhbml0aXplXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBzYW5pdGl6ZWQgdXJsXG4gICAqL1xuICBmdWxsOiAodXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYpID0+IG5ldyBVUkwodXJsKS50b1N0cmluZygpLFxuICAvKipcbiAgICogUmV0dXJucyB0aGUgb3JpZ2luIG9mIHRoZSBwcm92aWRlZCB1cmwuXG4gICAqIElmIG5vIHVybCBpcyBwcm92aWRlZCwgaXQgZGVmYXVsdHMgdG8gd2luZG93LmxvY2F0aW9uLmhyZWYuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgKGRlZmF1bHQ6IHdpbmRvdy5sb2NhdGlvbi5ocmVmKSBUaGUgdXJsIHRvIHNhbml0aXplXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBzYW5pdGl6ZWQgdXJsXG4gICAqL1xuICBvcmlnaW46ICh1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZikgPT4gbmV3IFVSTCh1cmwpLm9yaWdpbixcbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHNhbml0aXplZCB1cmw6IHRoZSBvcmlnaW4gYW5kIHRoZSBwYXRoIChubyBxdWVyeSBwYXJhbXMgb3IgaGFzaClcbiAgICogSWYgbm8gdXJsIGlzIHByb3ZpZGVkLCBpdCBkZWZhdWx0cyB0byB3aW5kb3cubG9jYXRpb24uaHJlZi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCAoZGVmYXVsdDogd2luZG93LmxvY2F0aW9uLmhyZWYpIFRoZSB1cmwgdG8gc2FuaXRpemVcbiAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHNhbml0aXplZCB1cmxcbiAgICovXG4gIHBhdGg6ICh1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZikgPT4ge1xuICAgIGNvbnN0IHUgPSBuZXcgVVJMKHVybCk7XG4gICAgcmV0dXJuIGAke3Uub3JpZ2lufSR7dS5wYXRobmFtZX1gO1xuICB9LFxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAyNCBBZG9iZS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgZmlsZSBpcyBsaWNlbnNlZCB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5XG4gKiBvZiB0aGUgTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyXG4gKiB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBSRVBSRVNFTlRBVElPTlNcbiAqIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZVxuICogZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGdldFRhcmdldFZhbHVlID0gKGVsZW1lbnQpID0+IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLXJ1bS10YXJnZXQnKSB8fCBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpXG4gICAgfHwgZWxlbWVudC5jdXJyZW50U3JjIHx8IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdzcmMnKSB8fCBlbGVtZW50LmRhdGFzZXQuYWN0aW9uIHx8IGVsZW1lbnQuYWN0aW9uO1xuXG5leHBvcnQgY29uc3QgdGFyZ2V0U2VsZWN0b3IgPSAoZWxlbWVudCkgPT4ge1xuICB0cnkge1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBsZXQgdmFsdWUgPSBnZXRUYXJnZXRWYWx1ZShlbGVtZW50KTtcbiAgICBpZiAoIXZhbHVlICYmIGVsZW1lbnQudGFnTmFtZSAhPT0gJ0EnICYmIGVsZW1lbnQuY2xvc2VzdCgnYScpKSB7XG4gICAgICB2YWx1ZSA9IGdldFRhcmdldFZhbHVlKGVsZW1lbnQuY2xvc2VzdCgnYScpKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICYmICF2YWx1ZS5zdGFydHNXaXRoKCdodHRwczovLycpKSB7XG4gICAgLy8gcmVzb2x2ZSByZWxhdGl2ZSBsaW5rc1xuICAgICAgdmFsdWUgPSBuZXcgVVJMKHZhbHVlLCB3aW5kb3cubG9jYXRpb24pLmhyZWY7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHdhbGsoZWxlbWVudCwgY2hlY2tGbikge1xuICBpZiAoIWVsZW1lbnQgfHwgZWxlbWVudCA9PT0gZG9jdW1lbnQuYm9keSB8fCBlbGVtZW50ID09PSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNoZWNrVmFsdWUgPSBjaGVja0ZuKGVsZW1lbnQpO1xuICByZXR1cm4gY2hlY2tWYWx1ZSB8fCB3YWxrKGVsZW1lbnQucGFyZW50RWxlbWVudCwgY2hlY2tGbik7XG59XG5cbmZ1bmN0aW9uIGlzRGlhbG9nKGVsZW1lbnQpIHtcbiAgLy8gZG9pbmcgaXQgd2VsbFxuICBpZiAoZWxlbWVudC50YWdOYW1lID09PSAnRElBTE9HJykgcmV0dXJuIHRydWU7XG4gIC8vIG1ha2luZyB0aGUgYmVzdCBvZiBpdFxuICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ2RpYWxvZycpIHJldHVybiB0cnVlO1xuICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ2FsZXJ0ZGlhbG9nJykgcmV0dXJuIHRydWU7XG4gIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZSgnYXJpYS1tb2RhbCcpID09PSAndHJ1ZScpIHJldHVybiB0cnVlO1xuICAvLyBkb2luZyBpdCB3cm9uZ1xuICBjb25zdCBjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gIHJldHVybiAoY29tcHV0ZWRTdHlsZSAmJiBjb21wdXRlZFN0eWxlLnBvc2l0aW9uID09PSAnZml4ZWQnICYmIGNvbXB1dGVkU3R5bGUuekluZGV4ID4gMTAwKTtcbn1cblxuZnVuY3Rpb24gaXNCdXR0b24oZWxlbWVudCkge1xuICBpZiAoZWxlbWVudC50YWdOYW1lID09PSAnQlVUVE9OJykgcmV0dXJuIHRydWU7XG4gIGlmIChlbGVtZW50LnRhZ05hbWUgPT09ICdJTlBVVCcgJiYgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ2J1dHRvbicpIHJldHVybiB0cnVlO1xuICBpZiAoZWxlbWVudC50YWdOYW1lID09PSAnQScpIHtcbiAgICBjb25zdCBjbGFzc2VzID0gQXJyYXkuZnJvbShlbGVtZW50LmNsYXNzTGlzdCk7XG4gICAgcmV0dXJuIGNsYXNzZXMuc29tZSgoY2xhc3NOYW1lKSA9PiBjbGFzc05hbWUubWF0Y2goL2J1dHRvbnxjdGEvKSk7XG4gIH1cbiAgcmV0dXJuIGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdyb2xlJykgPT09ICdidXR0b24nO1xufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VDb250ZXh0KGVsZW1lbnQpIHtcbiAgaWYgKGVsZW1lbnQuY2xvc2VzdCgnZm9ybScpKSByZXR1cm4gJ2Zvcm0nO1xuICBjb25zdCBibG9jayA9IGVsZW1lbnQuY2xvc2VzdCgnLmJsb2NrW2RhdGEtYmxvY2stbmFtZV0nKTtcbiAgaWYgKGJsb2NrKSByZXR1cm4gYC4ke2Jsb2NrLmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1uYW1lJyl9YDtcbiAgaWYgKHdhbGsoZWxlbWVudCwgaXNEaWFsb2cpKSByZXR1cm4gJ2RpYWxvZyc7XG4gIGlmIChlbGVtZW50LmNsb3Nlc3QoJ25hdicpKSByZXR1cm4gJ25hdic7XG4gIGlmIChlbGVtZW50LmNsb3Nlc3QoJ2hlYWRlcicpKSByZXR1cm4gJ2hlYWRlcic7XG4gIGlmIChlbGVtZW50LmNsb3Nlc3QoJ2Zvb3RlcicpKSByZXR1cm4gJ2Zvb3Rlcic7XG4gIGlmIChlbGVtZW50LmNsb3Nlc3QoJ2FzaWRlJykpIHJldHVybiAnYXNpZGUnO1xuICByZXR1cm4gKHdhbGsoZWxlbWVudCwgKGUpID0+IGUuaWQgJiYgYCMke2UuaWR9YCkpO1xufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VFbGVtZW50KGVsZW1lbnQpIHtcbiAgaWYgKGVsZW1lbnQuY2xvc2VzdCgnZm9ybScpICYmIEFycmF5LmZyb20oZWxlbWVudC5jbG9zZXN0KCdmb3JtJykuZWxlbWVudHMpLmluY2x1ZGVzKGVsZW1lbnQpKSByZXR1cm4gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyAoZWxlbWVudC50YWdOYW1lID09PSAnSU5QVVQnID8gYFt0eXBlPScke2VsZW1lbnQuZ2V0QXR0cmlidXRlKCd0eXBlJykgfHwgJyd9J11gIDogJycpO1xuICBpZiAod2FsayhlbGVtZW50LCBpc0J1dHRvbikpIHJldHVybiAnYnV0dG9uJztcbiAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpLm1hdGNoKC9eKGF8aW1nfHZpZGVvKSQvKSAmJiBlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlSWRlbnRpZmllcihlbGVtZW50KSB7XG4gIGlmIChlbGVtZW50LmlkKSByZXR1cm4gYCMke2VsZW1lbnQuaWR9YDtcbiAgaWYgKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWJsb2NrLW5hbWUnKSkgcmV0dXJuIGAuJHtlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1uYW1lJyl9YDtcbiAgcmV0dXJuIChlbGVtZW50LmNsYXNzTGlzdC5sZW5ndGggPiAwICYmIGAuJHtlbGVtZW50LmNsYXNzTGlzdFswXX1gKTtcbn1cbmV4cG9ydCBjb25zdCBzb3VyY2VTZWxlY3RvciA9IChlbGVtZW50KSA9PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFlbGVtZW50IHx8IGVsZW1lbnQgPT09IGRvY3VtZW50LmJvZHkgfHwgZWxlbWVudCA9PT0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcnVtLXNvdXJjZScpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcnVtLXNvdXJjZScpO1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlQ29udGV4dChlbGVtZW50LnBhcmVudEVsZW1lbnQpIHx8ICcnO1xuICAgIGNvbnN0IGVsZW1lbnROYW1lID0gZ2V0U291cmNlRWxlbWVudChlbGVtZW50KSB8fCAnJztcbiAgICBjb25zdCBpZGVudGlmaWVyID0gZ2V0U291cmNlSWRlbnRpZmllcihlbGVtZW50KSB8fCAnJztcbiAgICByZXR1cm4gYCR7Y29udGV4dH0gJHtlbGVtZW50TmFtZX0ke2lkZW50aWZpZXJ9YC50cmltKCkgfHwgYFwiJHtlbGVtZW50LnRleHRDb250ZW50LnN1YnN0cmluZygwLCAxMCl9XCJgO1xuICAgIC8qIGM4IGlnbm9yZSBuZXh0IDMgKi9cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAyNCBBZG9iZS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgZmlsZSBpcyBsaWNlbnNlZCB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5XG4gKiBvZiB0aGUgTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyXG4gKiB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBSRVBSRVNFTlRBVElPTlNcbiAqIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZVxuICogZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZENvb2tpZUNvbnNlbnRUcmFja2luZyhzYW1wbGVSVU0pIHtcbiAgY29uc3QgY21wQ29va2llID0gZG9jdW1lbnQuY29va2llLnNwbGl0KCc7JylcbiAgICAubWFwKChjKSA9PiBjLnRyaW0oKSlcbiAgICAuZmluZCgoY29va2llKSA9PiBjb29raWUuc3RhcnRzV2l0aCgnT3B0YW5vbkFsZXJ0Qm94Q2xvc2VkPScpKTtcblxuICBpZiAoY21wQ29va2llKSB7XG4gICAgc2FtcGxlUlVNKCdjb25zZW50JywgeyBzb3VyY2U6ICdvbmV0cnVzdCcsIHRhcmdldDogJ2hpZGRlbicgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IGNvbnNlbnRNdXRhdGlvbk9ic2VydmVyO1xuICBjb25zdCB0cmFja1Nob3dDb25zZW50ID0gKCkgPT4ge1xuICAgIGNvbnN0IG90c2RrID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keSA+IGRpdiNvbmV0cnVzdC1jb25zZW50LXNkaycpO1xuICAgIGlmIChvdHNkaykge1xuICAgICAgaWYgKG90c2RrLmNoZWNrVmlzaWJpbGl0eSAmJiAhb3RzZGsuY2hlY2tWaXNpYmlsaXR5KCkpIHtcbiAgICAgICAgc2FtcGxlUlVNKCdjb25zZW50JywgeyBzb3VyY2U6ICdvbmV0cnVzdCcsIHRhcmdldDogJ3N1cHByZXNzZWQnIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2FtcGxlUlVNKCdjb25zZW50JywgeyBzb3VyY2U6ICdvbmV0cnVzdCcsIHRhcmdldDogJ3Nob3cnIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGNvbnNlbnRNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIGNvbnNlbnRNdXRhdGlvbk9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgaWYgKCF0cmFja1Nob3dDb25zZW50KCkpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIGNvbnNlbnRNdXRhdGlvbk9ic2VydmVyID0gd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXJcbiAgICAgID8gbmV3IE11dGF0aW9uT2JzZXJ2ZXIodHJhY2tTaG93Q29uc2VudClcbiAgICAgIDogLyogYzggaWdub3JlIG5leHQgKi8gbnVsbDtcbiAgICBpZiAoY29uc2VudE11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgIGNvbnNlbnRNdXRhdGlvbk9ic2VydmVyLm9ic2VydmUoXG4gICAgICAgIGRvY3VtZW50LmJvZHksXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBvYmplY3QtY3VybHktbmV3bGluZVxuICAgICAgICB7IGF0dHJpYnV0ZXM6IGZhbHNlLCBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IGZhbHNlIH0sXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkVVRNUGFyYW1ldGVyc1RyYWNraW5nKHNhbXBsZVJVTSkge1xuICBjb25zdCB1c3AgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICBbLi4udXNwLmVudHJpZXMoKV1cbiAgICAuZmlsdGVyKChba2V5XSkgPT4ga2V5LnN0YXJ0c1dpdGgoJ3V0bV8nKSlcbiAgICAvLyBleGNsdWRlIGtleXMgdGhhdCBtYXkgbGVhayBQSUlcbiAgICAuZmlsdGVyKChba2V5XSkgPT4ga2V5ICE9PSAndXRtX2lkJylcbiAgICAuZmlsdGVyKChba2V5XSkgPT4ga2V5ICE9PSAndXRtX3Rlcm0nKVxuICAgIC5mb3JFYWNoKChbc291cmNlLCB0YXJnZXRdKSA9PiBzYW1wbGVSVU0oJ3V0bScsIHsgc291cmNlLCB0YXJnZXQgfSkpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGFkZEFkc1BhcmFtZXRlcnNUcmFja2luZyhzYW1wbGVSVU0pIHtcbiAgY29uc3QgbmV0d29ya3MgPSB7XG4gICAgZ29vZ2xlOiAvZ2NsaWR8Z2Nsc3JjfHdicmFpZHxnYnJhaWQvLFxuICAgIGRvdWJsZWNsaWNrOiAvZGNsaWQvLFxuICAgIG1pY3Jvc29mdDogL21zY2xraWQvLFxuICAgIGZhY2Vib29rOiAvZmIoY2x8YWRffHB4bF8paWQvLFxuICAgIHR3aXR0ZXI6IC90dyhjbGlkfHNyY3x0ZXJtKS8sXG4gICAgbGlua2VkaW46IC9saV9mYXRfaWQvLFxuICAgIHBpbnRlcmVzdDogL2VwaWsvLFxuICAgIHRpa3RvazogL3R0Y2xpZC8sXG4gIH07XG4gIGNvbnN0IHBhcmFtcyA9IEFycmF5LmZyb20obmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKS5rZXlzKCkpO1xuICBPYmplY3QuZW50cmllcyhuZXR3b3JrcykuZm9yRWFjaCgoW25ldHdvcmssIHJlZ2V4XSkgPT4ge1xuICAgIHBhcmFtcy5maWx0ZXIoKHBhcmFtKSA9PiByZWdleC50ZXN0KHBhcmFtKSkuZm9yRWFjaCgocGFyYW0pID0+IHNhbXBsZVJVTSgncGFpZCcsIHsgc291cmNlOiBuZXR3b3JrLCB0YXJnZXQ6IHBhcmFtIH0pKTtcbiAgfSk7XG59XG5leHBvcnQgZnVuY3Rpb24gYWRkRW1haWxQYXJhbWV0ZXJUcmFja2luZyhzYW1wbGVSVU0pIHtcbiAgY29uc3QgbmV0d29ya3MgPSB7XG4gICAgbWFpbGNoaW1wOiAvbWNfKGN8ZSlpZC8sXG4gICAgbWFya2V0bzogL21rdF90b2svLFxuICB9O1xuICBjb25zdCBwYXJhbXMgPSBBcnJheS5mcm9tKG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCkua2V5cygpKTtcbiAgT2JqZWN0LmVudHJpZXMobmV0d29ya3MpLmZvckVhY2goKFtuZXR3b3JrLCByZWdleF0pID0+IHtcbiAgICBwYXJhbXMuZmlsdGVyKChwYXJhbSkgPT4gcmVnZXgudGVzdChwYXJhbSkpLmZvckVhY2goKHBhcmFtKSA9PiBzYW1wbGVSVU0oJ2VtYWlsJywgeyBzb3VyY2U6IG5ldHdvcmssIHRhcmdldDogcGFyYW0gfSkpO1xuICB9KTtcbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAyNCBBZG9iZS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgZmlsZSBpcyBsaWNlbnNlZCB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5XG4gKiBvZiB0aGUgTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyXG4gKiB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBSRVBSRVNFTlRBVElPTlNcbiAqIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZVxuICogZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyogZXNsaW50LWVudiBicm93c2VyICovXG5cbmltcG9ydCB7IEtOT1dOX1BST1BFUlRJRVMsIERFRkFVTFRfVFJBQ0tJTkdfRVZFTlRTIH0gZnJvbSAnLi9kZWZhdWx0cy5qcyc7XG5pbXBvcnQgeyB1cmxTYW5pdGl6ZXJzIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgeyB0YXJnZXRTZWxlY3Rvciwgc291cmNlU2VsZWN0b3IgfSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQge1xuICBhZGRBZHNQYXJhbWV0ZXJzVHJhY2tpbmcsXG4gIGFkZENvb2tpZUNvbnNlbnRUcmFja2luZyxcbiAgYWRkRW1haWxQYXJhbWV0ZXJUcmFja2luZyxcbiAgYWRkVVRNUGFyYW1ldGVyc1RyYWNraW5nLFxufSBmcm9tICcuL21hcnRlY2guanMnO1xuaW1wb3J0IHsgZmZsYWdzIH0gZnJvbSAnLi9mZmxhZ3MuanMnO1xuXG5jb25zdCB7IHNhbXBsZVJVTSwgcXVldWUsIGlzU2VsZWN0ZWQgfSA9ICh3aW5kb3cuaGx4ICYmIHdpbmRvdy5obHgucnVtKSA/IHdpbmRvdy5obHgucnVtXG4gIC8qIGM4IGlnbm9yZSBuZXh0ICovIDoge307XG5cbmNvbnN0IGZvcm1TdWJtaXRMaXN0ZW5lciA9IChlKSA9PiBzYW1wbGVSVU0oJ2Zvcm1zdWJtaXQnLCB7IHRhcmdldDogdGFyZ2V0U2VsZWN0b3IoZS50YXJnZXQpLCBzb3VyY2U6IHNvdXJjZVNlbGVjdG9yKGUudGFyZ2V0KSB9KTtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lLCBtYXgtbGVuXG5jb25zdCBibG9ja3NNdXRhdGlvbk9ic2VydmVyID0gd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIgPyBuZXcgTXV0YXRpb25PYnNlcnZlcihibG9ja3NNdXRhdGlvbnNDYWxsYmFjaylcbiAgLyogYzggaWdub3JlIG5leHQgKi8gOiB7fTtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lLCBtYXgtbGVuXG5jb25zdCBtZWRpYU11dGF0aW9uT2JzZXJ2ZXIgPSB3aW5kb3cuTXV0YXRpb25PYnNlcnZlciA/IG5ldyBNdXRhdGlvbk9ic2VydmVyKG1lZGlhTXV0YXRpb25zQ2FsbGJhY2spXG4gIC8qIGM4IGlnbm9yZSBuZXh0ICovIDoge307XG5cbmZ1bmN0aW9uIHRyYWNrQ2hlY2twb2ludChjaGVja3BvaW50LCBkYXRhLCB0KSB7XG4gIGNvbnN0IHsgd2VpZ2h0LCBpZCB9ID0gd2luZG93LmhseC5ydW07XG4gIGlmIChpc1NlbGVjdGVkKSB7XG4gICAgY29uc3Qgc2VuZFBpbmcgPSAocGRhdGEgPSBkYXRhKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgb2JqZWN0LWN1cmx5LW5ld2xpbmUsIG1heC1sZW5cbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnN0cmluZ2lmeSh7IHdlaWdodCwgaWQsIHJlZmVyZXI6IHVybFNhbml0aXplcnNbd2luZG93LmhseC5SVU1fTUFTS19VUkwgfHwgJ3BhdGgnXSgpLCBjaGVja3BvaW50LCB0LCAuLi5kYXRhIH0sIEtOT1dOX1BST1BFUlRJRVMpO1xuICAgICAgY29uc3QgdXJsUGFyYW1zID0gd2luZG93LlJVTV9QQVJBTVMgPyBgPyR7bmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cuUlVNX1BBUkFNUykudG9TdHJpbmcoKX1gIDogJyc7XG4gICAgICBjb25zdCB7IGhyZWY6IHVybCwgb3JpZ2luIH0gPSBuZXcgVVJMKGAucnVtLyR7d2VpZ2h0fSR7dXJsUGFyYW1zfWAsIHNhbXBsZVJVTS5jb2xsZWN0QmFzZVVSTCk7XG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLm9yaWdpbiA9PT0gb3JpZ2luKSB7XG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9O1xuICAgICAgICBuYXZpZ2F0b3Iuc2VuZEJlYWNvbih1cmwsIG5ldyBCbG9iKFtib2R5XSwgaGVhZGVycykpO1xuICAgICAgICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuYXZpZ2F0b3Iuc2VuZEJlYWNvbih1cmwsIGJvZHkpO1xuICAgICAgfVxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZGVidWcoYHBpbmc6JHtjaGVja3BvaW50fWAsIHBkYXRhKTtcbiAgICB9O1xuICAgIHNlbmRQaW5nKGRhdGEpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NRdWV1ZSgpIHtcbiAgd2hpbGUgKHF1ZXVlICYmIHF1ZXVlLmxlbmd0aCkge1xuICAgIGNvbnN0IGNrID0gcXVldWUuc2hpZnQoKTtcbiAgICB0cmFja0NoZWNrcG9pbnQoLi4uY2spO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZENXVlRyYWNraW5nKCkge1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY3d2U2NyaXB0ID0gbmV3IFVSTCgnLnJ1bS93ZWItdml0YWxzL2Rpc3Qvd2ViLXZpdGFscy5paWZlLmpzJywgc2FtcGxlUlVNLmJhc2VVUkwpLmhyZWY7XG4gICAgICBpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihgc2NyaXB0W3NyYz1cIiR7Y3d2U2NyaXB0fVwiXWApKSB7XG4gICAgICAgIC8vIHdlYiB2aXRhbHMgc2NyaXB0IGhhcyBiZWVuIGxvYWRlZCBhbHJlYWR5XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgc2NyaXB0LnNyYyA9IGN3dlNjcmlwdDtcbiAgICAgIHNjcmlwdC5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHN0b3JlQ1dWID0gKG1lYXN1cmVtZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IHsgY3d2OiB7fSB9O1xuICAgICAgICAgIGRhdGEuY3d2W21lYXN1cmVtZW50Lm5hbWVdID0gbWVhc3VyZW1lbnQudmFsdWU7XG4gICAgICAgICAgaWYgKG1lYXN1cmVtZW50Lm5hbWUgPT09ICdMQ1AnICYmIG1lYXN1cmVtZW50LmVudHJpZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgeyBlbGVtZW50IH0gPSBtZWFzdXJlbWVudC5lbnRyaWVzLnBvcCgpO1xuICAgICAgICAgICAgZGF0YS50YXJnZXQgPSB0YXJnZXRTZWxlY3RvcihlbGVtZW50KTtcbiAgICAgICAgICAgIGRhdGEuc291cmNlID0gc291cmNlU2VsZWN0b3IoZWxlbWVudCkgfHwgKGVsZW1lbnQgJiYgZWxlbWVudC5vdXRlckhUTUwuc2xpY2UoMCwgMzApKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2FtcGxlUlVNKCdjd3YnLCBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpc0VhZ2VyID0gKG1ldHJpYykgPT4gWydDTFMnLCAnTENQJ10uaW5jbHVkZXMobWV0cmljKTtcblxuICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYHdlYi12aXRhbHNgIHVzaW5nIGEgY2xhc3NpYyBzY3JpcHQsIGFsbCB0aGUgcHVibGljXG4gICAgICAgIC8vIG1ldGhvZHMgY2FuIGJlIGZvdW5kIG9uIHRoZSBgd2ViVml0YWxzYCBnbG9iYWwgbmFtZXNwYWNlLlxuICAgICAgICBbJ0ZJRCcsICdJTlAnLCAnVFRGQicsICdDTFMnLCAnTENQJ10uZm9yRWFjaCgobWV0cmljKSA9PiB7XG4gICAgICAgICAgY29uc3QgbWV0cmljRm4gPSB3aW5kb3cud2ViVml0YWxzW2BvbiR7bWV0cmljfWBdO1xuICAgICAgICAgIGlmICh0eXBlb2YgbWV0cmljRm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGxldCBvcHRzID0ge307XG4gICAgICAgICAgICBmZmxhZ3MuZW5hYmxlZCgnZWFnZXJjd3YnLCAoKSA9PiB7XG4gICAgICAgICAgICAgIG9wdHMgPSB7IHJlcG9ydEFsbENoYW5nZXM6IGlzRWFnZXIobWV0cmljKSB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBtZXRyaWNGbihzdG9yZUNXViwgb3B0cyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgfVxuICB9LCAyMDAwKTsgLy8gd2FpdCBmb3IgZGVsYXllZFxufVxuXG5mdW5jdGlvbiBhZGROYXZpZ2F0aW9uVHJhY2tpbmcoKSB7XG4gIC8vIGVudGVyIGNoZWNrcG9pbnQgd2hlbiByZWZlcnJlciBpcyBub3QgdGhlIGN1cnJlbnQgcGFnZSB1cmxcbiAgY29uc3QgbmF2aWdhdGUgPSAoc291cmNlLCB0eXBlLCByZWRpcmVjdENvdW50KSA9PiB7XG4gICAgY29uc3QgcGF5bG9hZCA9IHsgc291cmNlLCB0YXJnZXQ6IGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSB9O1xuICAgIC8vIHJlbG9hZDogc2FtZSBwYWdlLCBuYXZpZ2F0ZTogc2FtZSBvcmlnaW4sIGVudGVyOiBldmVyeXRoaW5nIGVsc2VcbiAgICBpZiAodHlwZSA9PT0gJ3JlbG9hZCcgfHwgc291cmNlID09PSB3aW5kb3cubG9jYXRpb24uaHJlZikge1xuICAgICAgc2FtcGxlUlVNKCdyZWxvYWQnLCBwYXlsb2FkKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgJiYgdHlwZSAhPT0gJ25hdmlnYXRlJykge1xuICAgICAgc2FtcGxlUlVNKHR5cGUsIHBheWxvYWQpOyAvLyBiYWNrLCBmb3J3YXJkLCBwcmVyZW5kZXIsIGV0Yy5cbiAgICB9IGVsc2UgaWYgKHNvdXJjZSAmJiB3aW5kb3cubG9jYXRpb24ub3JpZ2luID09PSBuZXcgVVJMKHNvdXJjZSkub3JpZ2luKSB7XG4gICAgICBzYW1wbGVSVU0oJ25hdmlnYXRlJywgcGF5bG9hZCk7IC8vIGludGVybmFsIG5hdmlnYXRpb25cbiAgICB9IGVsc2Uge1xuICAgICAgc2FtcGxlUlVNKCdlbnRlcicsIHBheWxvYWQpOyAvLyBlbnRlciBzaXRlXG4gICAgfVxuICAgIGZmbGFncy5lbmFibGVkKCdyZWRpcmVjdCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGZyb20gPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpLmdldCgncmVkaXJlY3QtZnJvbScpO1xuICAgICAgaWYgKHJlZGlyZWN0Q291bnQgfHwgZnJvbSkge1xuICAgICAgICBzYW1wbGVSVU0oJ3JlZGlyZWN0JywgeyBzb3VyY2U6IGZyb20sIHRhcmdldDogcmVkaXJlY3RDb3VudCB8fCAxIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIG5ldyBQZXJmb3JtYW5jZU9ic2VydmVyKChsaXN0KSA9PiBsaXN0XG4gICAgLmdldEVudHJpZXMoKS5tYXAoKGVudHJ5KSA9PiBuYXZpZ2F0ZShcbiAgICAgIHdpbmRvdy5obHgucmVmZXJyZXIgfHwgZG9jdW1lbnQucmVmZXJyZXIsXG4gICAgICBlbnRyeS50eXBlLFxuICAgICAgZW50cnkucmVkaXJlY3RDb3VudCxcbiAgICApKSlcbiAgICAub2JzZXJ2ZSh7IHR5cGU6ICduYXZpZ2F0aW9uJywgYnVmZmVyZWQ6IHRydWUgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZExvYWRSZXNvdXJjZVRyYWNraW5nKCkge1xuICBjb25zdCBvYnNlcnZlciA9IG5ldyBQZXJmb3JtYW5jZU9ic2VydmVyKChsaXN0KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGxpc3QuZ2V0RW50cmllcygpXG4gICAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiAhZW50cnkucmVzcG9uc2VTdGF0dXMgfHwgZW50cnkucmVzcG9uc2VTdGF0dXMgPCA0MDApXG4gICAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09IG5ldyBVUkwoZW50cnkubmFtZSkuaG9zdG5hbWUpXG4gICAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBuZXcgVVJMKGVudHJ5Lm5hbWUpLnBhdGhuYW1lLm1hdGNoKCcuKihcXFxcLnBsYWluXFxcXC5odG1sJHxcXFxcLmpzb258Z3JhcGhxbHxhcGkpJykpXG4gICAgICAgIC5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgIHNhbXBsZVJVTSgnbG9hZHJlc291cmNlJywgeyBzb3VyY2U6IGVudHJ5Lm5hbWUsIHRhcmdldDogTWF0aC5yb3VuZChlbnRyeS5kdXJhdGlvbikgfSk7XG4gICAgICAgIH0pO1xuICAgICAgbGlzdC5nZXRFbnRyaWVzKClcbiAgICAgICAgLmZpbHRlcigoZW50cnkpID0+IGVudHJ5LnJlc3BvbnNlU3RhdHVzID09PSA0MDQpXG4gICAgICAgIC5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgIHNhbXBsZVJVTSgnbWlzc2luZ3Jlc291cmNlJywgeyBzb3VyY2U6IGVudHJ5Lm5hbWUsIHRhcmdldDogZW50cnkuaG9zdG5hbWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgLyogYzggaWdub3JlIG5leHQgMyAqL1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgIH1cbiAgfSk7XG4gIG9ic2VydmVyLm9ic2VydmUoeyB0eXBlOiAncmVzb3VyY2UnLCBidWZmZXJlZDogdHJ1ZSB9KTtcbn1cblxuZnVuY3Rpb24gYWN0aXZhdGVCbG9ja3NNdXRhdGlvbk9ic2VydmVyKCkge1xuICBpZiAoIWJsb2Nrc011dGF0aW9uT2JzZXJ2ZXIgfHwgYmxvY2tzTXV0YXRpb25PYnNlcnZlci5hY3RpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgYmxvY2tzTXV0YXRpb25PYnNlcnZlci5hY3RpdmUgPSB0cnVlO1xuICBibG9ja3NNdXRhdGlvbk9ic2VydmVyLm9ic2VydmUoXG4gICAgZG9jdW1lbnQuYm9keSxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgb2JqZWN0LWN1cmx5LW5ld2xpbmVcbiAgICB7IHN1YnRyZWU6IHRydWUsIGF0dHJpYnV0ZXM6IHRydWUsIGF0dHJpYnV0ZUZpbHRlcjogWydkYXRhLWJsb2NrLXN0YXR1cyddIH0sXG4gICk7XG59XG5cbmZ1bmN0aW9uIGFjdGl2YXRlTWVkaWFNdXRhdGlvbk9ic2VydmVyKCkge1xuICBpZiAoIW1lZGlhTXV0YXRpb25PYnNlcnZlciB8fCBtZWRpYU11dGF0aW9uT2JzZXJ2ZXIuYWN0aXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIG1lZGlhTXV0YXRpb25PYnNlcnZlci5hY3RpdmUgPSB0cnVlO1xuICBtZWRpYU11dGF0aW9uT2JzZXJ2ZXIub2JzZXJ2ZShcbiAgICBkb2N1bWVudC5ib2R5LFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBvYmplY3QtY3VybHktbmV3bGluZVxuICAgIHsgc3VidHJlZTogdHJ1ZSwgYXR0cmlidXRlczogZmFsc2UsIGNoaWxkTGlzdDogdHJ1ZSB9LFxuICApO1xufVxuXG5mdW5jdGlvbiBnZXRJbnRlcnNlY3Rpb25PYnNldmVyKGNoZWNrcG9pbnQpIHtcbiAgLyogYzggaWdub3JlIG5leHQgMyAqL1xuICBpZiAoIXdpbmRvdy5JbnRlcnNlY3Rpb25PYnNlcnZlcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGFjdGl2YXRlQmxvY2tzTXV0YXRpb25PYnNlcnZlcigpO1xuICBhY3RpdmF0ZU1lZGlhTXV0YXRpb25PYnNlcnZlcigpO1xuICBjb25zdCBvYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBlbnRyaWVzXG4gICAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS5pc0ludGVyc2VjdGluZylcbiAgICAgICAgLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgb2JzZXJ2ZXIudW5vYnNlcnZlKGVudHJ5LnRhcmdldCk7IC8vIG9ic2VydmUgb25seSBvbmNlXG4gICAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGFyZ2V0U2VsZWN0b3IoZW50cnkudGFyZ2V0KTtcbiAgICAgICAgICBjb25zdCBzb3VyY2UgPSBzb3VyY2VTZWxlY3RvcihlbnRyeS50YXJnZXQpO1xuICAgICAgICAgIHNhbXBsZVJVTShjaGVja3BvaW50LCB7IHRhcmdldCwgc291cmNlIH0pO1xuICAgICAgICB9KTtcbiAgICAgIC8qIGM4IGlnbm9yZSBuZXh0IDMgKi9cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb2JzZXJ2ZXI7XG59XG5mdW5jdGlvbiBhZGRWaWV3QmxvY2tUcmFja2luZyhlbGVtZW50KSB7XG4gIGNvbnN0IGJsb2Nrb2JzZXJ2ZXIgPSBnZXRJbnRlcnNlY3Rpb25PYnNldmVyKCd2aWV3YmxvY2snKTtcbiAgaWYgKGJsb2Nrb2JzZXJ2ZXIpIHtcbiAgICBjb25zdCBibG9ja3MgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1zdGF0dXMnKSA/IFtlbGVtZW50XSA6IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RhdGEtYmxvY2stc3RhdHVzPVwibG9hZGVkXCJdJyk7XG4gICAgYmxvY2tzLmZvckVhY2goKGIpID0+IGJsb2Nrb2JzZXJ2ZXIub2JzZXJ2ZShiKSk7XG4gIH1cbn1cblxuY29uc3Qgb2JzZXJ2ZWRNZWRpYSA9IG5ldyBTZXQoKTtcbmZ1bmN0aW9uIGFkZFZpZXdNZWRpYVRyYWNraW5nKHBhcmVudCkge1xuICBjb25zdCBtZWRpYW9ic2VydmVyID0gZ2V0SW50ZXJzZWN0aW9uT2JzZXZlcigndmlld21lZGlhJyk7XG4gIGlmIChtZWRpYW9ic2VydmVyKSB7XG4gICAgcGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2ltZywgdmlkZW8sIGF1ZGlvLCBpZnJhbWUnKS5mb3JFYWNoKChtKSA9PiB7XG4gICAgICBpZiAoIW9ic2VydmVkTWVkaWEuaGFzKG0pKSB7XG4gICAgICAgIG9ic2VydmVkTWVkaWEuYWRkKG0pO1xuICAgICAgICBtZWRpYW9ic2VydmVyLm9ic2VydmUobSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkRm9ybVRyYWNraW5nKHBhcmVudCkge1xuICBhY3RpdmF0ZUJsb2Nrc011dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgYWN0aXZhdGVNZWRpYU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgcGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2Zvcm0nKS5mb3JFYWNoKChmb3JtKSA9PiB7XG4gICAgZm9ybS5yZW1vdmVFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmb3JtU3VibWl0TGlzdGVuZXIpOyAvLyBsaXN0ZW4gb25seSBvbmNlXG4gICAgZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmb3JtU3VibWl0TGlzdGVuZXIpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkT2JzZXJ2ZXIoY2ssIGZuLCBibG9jaykge1xuICByZXR1cm4gREVGQVVMVF9UUkFDS0lOR19FVkVOVFMuaW5jbHVkZXMoY2spICYmIGZuKGJsb2NrKTtcbn1cblxuZnVuY3Rpb24gYmxvY2tzTXV0YXRpb25zQ2FsbGJhY2sobXV0YXRpb25zKSB7XG4gIC8vIGJsb2NrIHNwZWNpZmljIG11dGF0aW9uc1xuICBtdXRhdGlvbnNcbiAgICAuZmlsdGVyKChtKSA9PiBtLnR5cGUgPT09ICdhdHRyaWJ1dGVzJyAmJiBtLmF0dHJpYnV0ZU5hbWUgPT09ICdkYXRhLWJsb2NrLXN0YXR1cycpXG4gICAgLmZpbHRlcigobSkgPT4gbS50YXJnZXQuZGF0YXNldC5ibG9ja1N0YXR1cyA9PT0gJ2xvYWRlZCcpXG4gICAgLmZvckVhY2goKG0pID0+IHtcbiAgICAgIGFkZE9ic2VydmVyKCdmb3JtJywgYWRkRm9ybVRyYWNraW5nLCBtLnRhcmdldCk7XG4gICAgICBhZGRPYnNlcnZlcigndmlld2Jsb2NrJywgYWRkVmlld0Jsb2NrVHJhY2tpbmcsIG0udGFyZ2V0KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbWVkaWFNdXRhdGlvbnNDYWxsYmFjayhtdXRhdGlvbnMpIHtcbiAgLy8gbWVkaWEgbXV0YXRpb25zXG4gIG11dGF0aW9uc1xuICAgIC5mb3JFYWNoKChtKSA9PiB7XG4gICAgICBhZGRPYnNlcnZlcigndmlld21lZGlhJywgYWRkVmlld01lZGlhVHJhY2tpbmcsIG0udGFyZ2V0KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkVHJhY2tpbmdGcm9tQ29uZmlnKCkge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgIHNhbXBsZVJVTSgnY2xpY2snLCB7IHRhcmdldDogdGFyZ2V0U2VsZWN0b3IoZXZlbnQudGFyZ2V0KSwgc291cmNlOiBzb3VyY2VTZWxlY3RvcihldmVudC50YXJnZXQpIH0pO1xuICB9KTtcbiAgYWRkQ1dWVHJhY2tpbmcoKTtcbiAgYWRkRm9ybVRyYWNraW5nKHdpbmRvdy5kb2N1bWVudC5ib2R5KTtcbiAgYWRkTmF2aWdhdGlvblRyYWNraW5nKCk7XG4gIGFkZExvYWRSZXNvdXJjZVRyYWNraW5nKCk7XG4gIGFkZFVUTVBhcmFtZXRlcnNUcmFja2luZyhzYW1wbGVSVU0pO1xuICBhZGRWaWV3QmxvY2tUcmFja2luZyh3aW5kb3cuZG9jdW1lbnQuYm9keSk7XG4gIGFkZFZpZXdNZWRpYVRyYWNraW5nKHdpbmRvdy5kb2N1bWVudC5ib2R5KTtcbiAgYWRkQ29va2llQ29uc2VudFRyYWNraW5nKHNhbXBsZVJVTSk7XG4gIGFkZEFkc1BhcmFtZXRlcnNUcmFja2luZyhzYW1wbGVSVU0pO1xuICBhZGRFbWFpbFBhcmFtZXRlclRyYWNraW5nKHNhbXBsZVJVTSk7XG4gIGZmbGFncy5lbmFibGVkKCdsYW5ndWFnZScsICgpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBuYXZpZ2F0b3IubGFuZ3VhZ2U7XG4gICAgY29uc3Qgc291cmNlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lmxhbmc7XG4gICAgc2FtcGxlUlVNKCdsYW5ndWFnZScsIHsgc291cmNlLCB0YXJnZXQgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpbml0RW5oYW5jZXIoKSB7XG4gIHRyeSB7XG4gICAgaWYgKHNhbXBsZVJVTSkge1xuICAgICAgYWRkVHJhY2tpbmdGcm9tQ29uZmlnKCk7XG4gICAgICB3aW5kb3cuaGx4LnJ1bS5jb2xsZWN0b3IgPSB0cmFja0NoZWNrcG9pbnQ7XG4gICAgICBwcm9jZXNzUXVldWUoKTtcbiAgICB9XG4gIC8qIGM4IGlnbm9yZSBuZXh0IDMgKi9cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9XG59XG5cbmluaXRFbmhhbmNlcigpO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0VBV08sTUFBTSxNQUFNLEdBQUc7RUFDdEIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDL0QsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNoQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDOUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO0VBQ3pDLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsS0FBSyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsRUFBRTtFQUU3RCxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsRUFBRTtFQUMvRCxFQUFFLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQztFQUNqQixFQUFFLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7RUFDdkIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElB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
