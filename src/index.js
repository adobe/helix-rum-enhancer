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
  sampleRUM.perfObservers = sampleRUM.perfObservers || {};
  sampleRUM.bfcacheRestoreTime = -1;
  sampleRUM.firstHiddenTime = -1;
  sampleRUM.interactionCountEstimate = 0;
  sampleRUM.minInteractionId = Infinity;
  sampleRUM.maxInteractionId = 0;
  sampleRUM.DEFAULT_INTERACTION_DURATION_THRESHOLD = 40;
  sampleRUM.MAX_INTERACTIONS_TO_CONSIDER = 10;

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

  const onBFCacheRestore = (cb) => {
    const listener = (event) => {
      if (event.persisted) {
        sampleRUM.bfcacheRestoreTime = event.timeStamp;
        cb(event);
      }
    };
    window.addEventListener('pageshow', listener, true);
  };

  const initHiddenTime = () => (document.visibilityState === 'hidden' && !document.prerendering ? 0 : Infinity);

  const onVisibilityUpdate = (event) => {
    if (document.visibilityState === 'hidden' && sampleRUM.firstHiddenTime > -1) {
      sampleRUM.firstHiddenTime = event.type === 'visibilitychange' ? event.timeStamp : 0;
      // eslint-disable-next-line no-use-before-define
      removeChangeListeners();
    }
  };
  const removeChangeListeners = () => {
    window.removeEventListener('visibilitychange', onVisibilityUpdate, true);
    window.removeEventListener('prerenderingchange', onVisibilityUpdate, true);
  };
  const addChangeListeners = () => {
    window.addEventListener('visibilitychange', onVisibilityUpdate, true);
    window.addEventListener('prerenderingchange', onVisibilityUpdate, true);
  };

  const getVisibilityWatcher = () => {
    if (sampleRUM.firstHiddenTime < 0) {
      sampleRUM.firstHiddenTime = initHiddenTime();
      addChangeListeners();
      onBFCacheRestore(() => {
        setTimeout(() => {
          sampleRUM.firstHiddenTime = initHiddenTime();
          addChangeListeners();
        }, 0);
      });
    }
    return {
      get firstHiddenTime() {
        return sampleRUM.firstHiddenTime;
      },
    };
  };

  const getNavigationEntry = () => {
    const [navigationEntry] = performance?.getEntriesByType?.('navigation') || [];
    return navigationEntry?.responseStart > 0 && navigationEntry.responseStart < performance.now()
      ? navigationEntry
      : null;
  };

  const registerPerformanceObserver = (type, cb, opts) => {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return null;
    if (sampleRUM.perfObservers[type]) return sampleRUM.perfObservers[type];
    sampleRUM.perfObservers[type] = new PerformanceObserver((list) => {
      Promise.resolve().then(() => cb(list.getEntries()));
    });
    sampleRUM.perfObservers[type].observe({ type, buffered: true, ...opts || {} });
    return sampleRUM.perfObservers[type];
  };

  const whenActivated = (cb) => {
    if (document.prerendering) {
      document.addEventListener('prerenderingchange', () => cb(), true);
    } else {
      cb();
    }
  };

  // Runs in the next task after the page is done loading and/or prerendering.
  const whenReady = (cb) => {
    if (document.prerendering) {
      // firefox and safari don't implement the Speculation API
      whenActivated(() => whenReady(cb));
    } else if (document.readyState !== 'complete') {
      // fallback for the browsers not implementing the Speculation API
      window.addEventListener('load', () => whenReady(cb), true);
    } else {
      // Queue a task so the callback runs after `loadEventEnd`.
      setTimeout(cb, 0);
    }
  };

  const onHidden = (cb) => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') cb();
    });
  };

  const getActivationStart = () => {
    const navEntry = getNavigationEntry();
    return (navEntry && navEntry.activationStart) || 0;
  };

  const doubleRAF = (cb) => {
    requestAnimationFrame(() => requestAnimationFrame(() => cb()));
  };

  const runOnce = (cb) => {
    let called = false;
    return () => {
      if (!called) {
        cb();
        called = true;
      }
    };
  };

  const initInteractionCountPolyfill = () => {
    if ('interactionCount' in performance || sampleRUM.perfObservers.event) return;
    registerPerformanceObserver('event', (entries) => {
      entries.forEach((e) => {
        if (e.interactionId) {
          sampleRUM.minInteractionId = Math.min(sampleRUM.minInteractionId, e.interactionId);
          sampleRUM.maxInteractionId = Math.max(sampleRUM.maxInteractionId, e.interactionId);

          sampleRUM.interactionCountEstimate = sampleRUM.maxInteractionId
            ? (sampleRUM.maxInteractionId - sampleRUM.minInteractionId) / 7 + 1
            : 0;
        }
      });
    }, { durationThreshold: 0 });
  };

  const getInteractionCount = () => ('interactionCount' in performance ? (performance.interactionCount || 0) : sampleRUM.interactionCountEstimate);

  sampleRUM.onTTFB = (cb) => {
    const name = 'TTFB';
    whenReady(() => {
      const navigationEntry = getNavigationEntry();
      registerPerformanceObserver('navigation', () => {
        if (navigationEntry) {
          const value = Math.max(navigationEntry.responseStart - getActivationStart(), 0);
          cb({ name, value });
        }
      });
    });
  };

  sampleRUM.onFCP = (cb) => {
    const name = 'FCP';
    whenActivated(() => {
      const visibilityWatcher = getVisibilityWatcher();
      const po = registerPerformanceObserver('paint', (entries) => {
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            po.disconnect();
            if (entry.startTime < visibilityWatcher.firstHiddenTime) {
              const value = Math.max(entry.startTime - getActivationStart(), 0);
              cb({ name, value, entries: [entry] });
            }
          }
        });
      });
      onBFCacheRestore((event) => {
        doubleRAF(() => {
          const value = performance.now() - event.timeStamp;
          cb({ name, value });
        });
      });
    });
  };

  sampleRUM.onLCP = (cb) => {
    const name = 'LCP';
    whenActivated(() => {
      const visibilityWatcher = getVisibilityWatcher();
      const po = registerPerformanceObserver('largest-contentful-paint', (entries) => {
        entries.forEach((entry) => {
          // Only report if the page wasn't hidden prior to LCP.
          if (entry.startTime < visibilityWatcher.firstHiddenTime) {
            const value = Math.max(entry.startTime - getActivationStart(), 0);
            cb({ name, value, entries: [entry] });
          }
        });
      });
      onHidden(() => {
        if (po) po.disconnect();
      });
      onBFCacheRestore((event) => {
        doubleRAF(() => {
          const value = performance.now() - event.timeStamp;
          cb({ name, value });
        });
      });
    });
  };

  sampleRUM.onCLS = (cb) => {
    const name = 'CLS';
    sampleRUM.onFCP(() => {
      let value = 0;
      let totalEntries = [];
      runOnce(() => {
        let sessionValue = 0;
        let sessionEntries = [];
        registerPerformanceObserver('layout-shift', (entries) => {
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
              if (
                sessionValue
                && entry.startTime - lastSessionEntry.startTime < 1000
                && entry.startTime - firstSessionEntry.startTime < 5000
              ) {
                sessionValue += entry.value;
                sessionEntries.push(entry);
              } else {
                sessionValue = entry.value;
                sessionEntries = [entry];
              }
            }
          });
          if (sessionValue > value) {
            value = sessionValue;
            totalEntries = sessionEntries;
            cb({ name, value, entries: totalEntries });
          }
        });
        onBFCacheRestore(() => {
          doubleRAF(() => {
            cb({ name, value });
          });
        });
        setTimeout(() => cb({ name, value }), 0);
      });
    });
  };

  sampleRUM.onINP = (cb) => {
    const name = 'INP';
    let value = 0;
    let inpEntries = [];
    const longestInteractionList = [];
    const longestInteractionMap = new Map();
    let prevInteractionCount = 0;

    const getInteractionCountForNavigation = () => getInteractionCount() - prevInteractionCount;

    const resetInteractions = () => {
      prevInteractionCount = 0;
      longestInteractionList.length = 0;
      longestInteractionMap.clear();
    };

    const estimateP98LongestInteraction = () => {
      const candidateInteractionIndex = Math.min(
        longestInteractionList.length - 1,
        Math.floor(getInteractionCountForNavigation() / 50),
      );

      return longestInteractionList[candidateInteractionIndex];
    };

    whenActivated(() => {
      initInteractionCountPolyfill();
      registerPerformanceObserver('event', (entries) => {
        entries.forEach((entry) => {
          if (!(entry.interactionId || entry.entryType === 'first-input')) return;
          const minLongestInteraction = longestInteractionList[longestInteractionList.length - 1];
          const existingInteraction = longestInteractionMap.get(entry.interactionId);
          if (
            existingInteraction
            || longestInteractionList.length < sampleRUM.MAX_INTERACTIONS_TO_CONSIDER
            || entry.duration > minLongestInteraction.latency
          ) {
            if (existingInteraction) {
              if (entry.duration > existingInteraction.latency) {
                existingInteraction.entries = [entry];
                existingInteraction.latency = entry.duration;
              } else if (
                entry.duration === existingInteraction.latency
                && entry.startTime === existingInteraction.entries[0].startTime
              ) {
                existingInteraction.entries.push(entry);
              }
            } else {
              const interaction = {
                id: entry.interactionId,
                latency: entry.duration,
                entries: [entry],
              };
              longestInteractionMap.set(interaction.id, interaction);
              longestInteractionList.push(interaction);
            }
            longestInteractionList.sort((a, b) => b.latency - a.latency);
            if (longestInteractionList.length > sampleRUM.MAX_INTERACTIONS_TO_CONSIDER) {
              longestInteractionList
                .splice(sampleRUM.MAX_INTERACTIONS_TO_CONSIDER)
                .forEach((i) => longestInteractionMap.delete(i.id));
            }
          }
        });

        const inp = estimateP98LongestInteraction();
        if (inp && inp.latency !== value) {
          value = inp.latency;
          inpEntries = inp.entries;
          cb({ name, value, entries: inpEntries });
        }
      });
      onBFCacheRestore(() => {
        resetInteractions();
      });
    });
  };

  ['TTFB', 'FCP', 'LCP', 'CLS', 'INP'].forEach((metric) => {
    const metricFn = sampleRUM[`on${metric}`];
    if (typeof metricFn === 'function') {
      metricFn(storeCWV);
    }
  });
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
