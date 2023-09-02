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

// enter checkpoint when referrer is not the current page url
if (!!document.referrer && (document.referrer !== window.location.href)) {
  sampleRUM('enter', { target: undefined, source: document.referrer });
}

sampleRUM.targetselector = (element) => {
  let value = element.getAttribute('href') || element.currentSrc || element.getAttribute('src')
                || element.dataset.action || element.action;
  if (value && value.startsWith('https://')) {
    // resolve relative links
    value = new URL(value, window.location).href;
  }
  return value;
};

sampleRUM.drain('cwv', (() => {
  if (document.querySelector('script[src="https://rum.hlx.page/.rum/web-vitals/dist/web-vitals.iife.js"]')) {
    // web vitals script has been loaded already
    return;
  }
  // use classic script to avoid CORS issues
  const script = document.createElement('script');
  script.src = 'https://rum.hlx.page/.rum/web-vitals/dist/web-vitals.iife.js';
  script.onload = () => {
    const storeCWV = (measurement) => {
      const data = { cwv: {} };
      data.cwv[measurement.name] = measurement.value;
      sampleRUM('cwv', data);
    };
    // When loading `web-vitals` using a classic script, all the public
    // methods can be found on the `webVitals` global namespace.
    ['CLS', 'FID', 'LCP', 'INP']
      .map((metric) => window.webVitals[`get${metric}`])
      .filter((metric) => typeof metric === 'function')
      .forEach((invokeMetric) => {
        invokeMetric(storeCWV);
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

  const form = element.closest('form');
  let formElementSelector = '';
  if (form && Array.from(form.elements).includes(element)) {
    formElementSelector = element.tagName === 'INPUT' ? `form input[type='${element.getAttribute('type')}']` : `form ${element.tagName.toLowerCase()}`;
  }

  if (element.id || formElementSelector) {
    const blockName = element.closest('.block') ? element.closest('.block').getAttribute('data-block-name') : '';
    const id = element.id ? `#${element.id}` : '';
    return blockName ? `.${blockName} ${formElementSelector}${id}` : `${formElementSelector}${id}`;
  }

  if (element.getAttribute('data-block-name')) {
    return `.${element.getAttribute('data-block-name')}`;
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
