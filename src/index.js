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
