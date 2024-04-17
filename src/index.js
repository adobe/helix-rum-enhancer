/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const { sampleRUM } = window.hlx.rum;

sampleRUM.baseURL = sampleRUM.baseURL || new URL('https://rum.hlx.page');

sampleRUM.blockobserver = (window.IntersectionObserver) ? new IntersectionObserver((entries) => {
  entries
    .filter((entry) => entry.isIntersecting)
    .forEach((entry) => {
      sampleRUM.blockobserver.unobserve(entry.target); // observe only once
      const target = sampleRUM.targetselector(entry.target);
      const source = sampleRUM.sourceselector(entry.target);
      sampleRUM('viewblock', { target, source });
    });
}, { threshold: 0.25 }) : { observe: () => { } };

sampleRUM.mediaobserver = (window.IntersectionObserver) ? new IntersectionObserver((entries) => {
  entries
    .filter((entry) => entry.isIntersecting)
    .forEach((entry) => {
      sampleRUM.mediaobserver.unobserve(entry.target); // observe only once
      const target = sampleRUM.targetselector(entry.target);
      const source = sampleRUM.sourceselector(entry.target);
      sampleRUM('viewmedia', { target, source });
    });
}, { threshold: 0.25 }) : { observe: () => { } };

sampleRUM.drain('observe', ((elements) => {
  elements.forEach((element) => {
    if (element.tagName.toLowerCase() === 'img'
      || element.tagName.toLowerCase() === 'video'
      || element.tagName.toLowerCase() === 'audio'
      || element.tagName.toLowerCase() === 'iframe') {
      sampleRUM.mediaobserver.observe(element);
    } else {
      sampleRUM.blockobserver.observe(element);
    }
  });
}));

const navigate = (source, type) => {
  const payload = { source, target: document.visibilityState };
  // reload: same page, navigate: same origin, enter: everything else
  if (type === 'reload' || source === window.location.href) {
    sampleRUM('reload', payload);
  } else if (type !== 'navigate') {
    sampleRUM(type, payload); // back, forward, prerender, etc.
  } else if (source && window.location.origin === new URL(source).origin) {
    sampleRUM('navigate', payload); // internal navigation
  } else {
    sampleRUM('enter', payload); // enter site
  }
};

new PerformanceObserver((list) => list
  .getEntries().map((entry) => navigate(document.referrer, entry.type)))
  .observe({ type: 'navigation', buffered: true });

sampleRUM.targetselector = (element) => {
  let value = element.getAttribute('data-rum-target') || element.getAttribute('href') || element.currentSrc || element.getAttribute('src')
                || element.dataset.action || element.action;
  if (value && !value.startsWith('https://')) {
    // resolve relative links
    value = new URL(value, window.location).href;
  }
  return value;
};

sampleRUM.drain('cwv', (() => {
  const cwvScript = new URL('.rum/web-vitals/dist/web-vitals.iife.js', sampleRUM.baseURL).href;
  if (document.querySelector(`script[src="${cwvScript}"]`)) {
    // web vitals script has been loaded already
    return;
  }
  // use classic script to avoid CORS issues
  const script = document.createElement('script');
  script.src = cwvScript;
  script.onload = () => {
    const storeCWV = (measurement) => {
      const data = { cwv: {} };
      data.cwv[measurement.name] = measurement.value;

      if (measurement.name === 'LCP' && measurement.entries.length > 0) {
        const { element } = measurement.entries.pop();
        data.target = sampleRUM.targetselector(element);
        data.source = sampleRUM.sourceselector(element) || element.outerHTML.slice(0, 30);
      }

      sampleRUM('cwv', data);
    };

    const isEager = (metric) => ['CLS', 'LCP'].includes(metric);

    // When loading `web-vitals` using a classic script, all the public
    // methods can be found on the `webVitals` global namespace.
    ['FID', 'INP', 'TTFB', 'CLS', 'LCP'].forEach((metric) => {
      const metricFn = window.webVitals[`on${metric}`];
      if (typeof metricFn === 'function') {
        const opts = isEager(metric) ? { reportAllChanges: true } : undefined;
        metricFn(storeCWV, opts);
      }
    });
  };
  document.head.appendChild(script);
}));

sampleRUM.drain('leave', ((event = {}) => {
  if (sampleRUM.left || (event.type === 'visibilitychange' && document.visibilityState !== 'hidden')) {
    return;
  }
  sampleRUM.left = true;
  sampleRUM('leave');
}));

sampleRUM.sourceselector = (element) => {
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
  return sampleRUM.sourceselector(element.parentElement);
};

document.addEventListener('click', (event) => {
  sampleRUM('click', { target: sampleRUM.targetselector(event.target), source: sampleRUM.sourceselector(event.target) });
});

// Track form submissions
document.querySelectorAll('form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    sampleRUM('formsubmit', { target: sampleRUM.targetselector(event.target), source: sampleRUM.sourceselector(event.target) });
  });
});

window.addEventListener('visibilitychange', ((event) => sampleRUM.leave(event)));
window.addEventListener('pagehide', ((event) => sampleRUM.leave(event)));

new PerformanceObserver((list) => {
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
}).observe({ type: 'resource', buffered: true });

[...new URLSearchParams(window.location.search).entries()]
  .filter(([key]) => key.startsWith('utm_'))
  .filter(([key]) => key !== 'utm_id')
  .forEach(([key, value]) => {
    sampleRUM('utm', { source: key, target: value });
  });
