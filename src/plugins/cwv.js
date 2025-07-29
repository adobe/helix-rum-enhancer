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
(function (e) {

  let t = -1;
  const n = e => {
      addEventListener("pageshow", n => {
        n.persisted && (t = n.timeStamp, e(n));
      }, true);
    },
    i = (e, t, n, i) => {
      let o, s;
      return r => {
        t.value >= 0 && (r || i) && (s = t.value - (o ?? 0), (s || void 0 === o) && (o = t.value, t.delta = s, t.rating = ((e, t) => e > t[1] ? "poor" : e > t[0] ? "needs-improvement" : "good")(t.value, n), e(t)));
      };
    },
    o = e => {
      requestAnimationFrame(() => requestAnimationFrame(() => e()));
    },
    s = () => {
      const e = performance.getEntriesByType("navigation")[0];
      if (e && e.responseStart > 0 && e.responseStart < performance.now()) return e;
    },
    r = () => {
      const e = s();
      return e?.activationStart ?? 0;
    },
    c = (e, n = -1) => {
      const i = s();
      let o = "navigate";
      t >= 0 ? o = "back-forward-cache" : i && (document.prerendering || r() > 0 ? o = "prerender" : document.wasDiscarded ? o = "restore" : i.type && (o = i.type.replace(/_/g, "-")));
      return {
        name: e,
        value: n,
        rating: "good",
        delta: 0,
        entries: [],
        id: `v5-${Date.now()}-${Math.floor(8999999999999 * Math.random()) + 1e12}`,
        navigationType: o
      };
    },
    a = new WeakMap();
  function d(e, t) {
    return a.get(e) || a.set(e, new t()), a.get(e);
  }
  class h {
    t;
    i = 0;
    o = [];
    h(e) {
      if (e.hadRecentInput) return;
      const t = this.o[0],
        n = this.o.at(-1);
      this.i && t && n && e.startTime - n.startTime < 1e3 && e.startTime - t.startTime < 5e3 ? (this.i += e.value, this.o.push(e)) : (this.i = e.value, this.o = [e]), this.t?.(e);
    }
  }
  const f = (e, t, n = {}) => {
      try {
        if (PerformanceObserver.supportedEntryTypes.includes(e)) {
          const i = new PerformanceObserver(e => {
            Promise.resolve().then(() => {
              t(e.getEntries());
            });
          });
          return i.observe({
            type: e,
            buffered: !0,
            ...n
          }), i;
        }
      } catch {}
    },
    u = e => {
      let t = false;
      return () => {
        t || (e(), t = true);
      };
    };
  let l = -1;
  const m = () => "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0,
    g = e => {
      "hidden" === document.visibilityState && l > -1 && (l = "visibilitychange" === e.type ? e.timeStamp : 0, p());
    },
    v = () => {
      addEventListener("visibilitychange", g, true), addEventListener("prerenderingchange", g, true);
    },
    p = () => {
      removeEventListener("visibilitychange", g, true), removeEventListener("prerenderingchange", g, true);
    },
    y = () => {
      if (l < 0) {
        const e = r(),
          t = document.prerendering ? void 0 : globalThis.performance.getEntriesByType("visibility-state").filter(t => "hidden" === t.name && t.startTime > e)[0]?.startTime;
        l = t ?? m(), v(), n(() => {
          setTimeout(() => {
            l = m(), v();
          });
        });
      }
      return {
        get firstHiddenTime() {
          return l;
        }
      };
    },
    b = e => {
      document.prerendering ? addEventListener("prerenderingchange", () => e(), true) : e();
    },
    P = [1800, 3e3],
    T = (e, t = {}) => {
      b(() => {
        const s = y();
        let a,
          d = c("FCP");
        const h = f("paint", e => {
          for (const t of e) "first-contentful-paint" === t.name && (h.disconnect(), t.startTime < s.firstHiddenTime && (d.value = Math.max(t.startTime - r(), 0), d.entries.push(t), a(true)));
        });
        h && (a = i(e, d, P, t.reportAllChanges), n(n => {
          d = c("FCP"), a = i(e, d, P, t.reportAllChanges), o(() => {
            d.value = performance.now() - n.timeStamp, a(true);
          });
        }));
      });
    },
    E = [.1, .25];
  let _ = 0,
    L = 1 / 0,
    M = 0;
  const w = e => {
    for (const t of e) t.interactionId && (L = Math.min(L, t.interactionId), M = Math.max(M, t.interactionId), _ = M ? (M - L) / 7 + 1 : 0);
  };
  let C;
  const I = () => C ? _ : performance.interactionCount ?? 0,
    F = () => {
      "interactionCount" in performance || C || (C = f("event", w, {
        type: "event",
        buffered: true,
        durationThreshold: 0
      }));
    };
  let k = 0;
  class A {
    u = [];
    l = new Map();
    m;
    v;
    p() {
      k = I(), this.u.length = 0, this.l.clear();
    }
    P() {
      const e = Math.min(this.u.length - 1, Math.floor((I() - k) / 50));
      return this.u[e];
    }
    h(e) {
      if (this.m?.(e), !e.interactionId && "first-input" !== e.entryType) return;
      const t = this.u.at(-1);
      let n = this.l.get(e.interactionId);
      if (n || this.u.length < 10 || e.duration > t.T) {
        if (n ? e.duration > n.T ? (n.entries = [e], n.T = e.duration) : e.duration === n.T && e.startTime === n.entries[0].startTime && n.entries.push(e) : (n = {
          id: e.interactionId,
          entries: [e],
          T: e.duration
        }, this.l.set(n.id, n), this.u.push(n)), this.u.sort((e, t) => t.T - e.T), this.u.length > 10) {
          const e = this.u.splice(10);
          for (const t of e) this.l.delete(t.id);
        }
        this.v?.(n);
      }
    }
  }
  const B = e => {
      const t = globalThis.requestIdleCallback || setTimeout;
      "hidden" === document.visibilityState ? e() : (e = u(e), document.addEventListener("visibilitychange", e, {
        once: true
      }), t(() => {
        e(), document.removeEventListener("visibilitychange", e);
      }));
    },
    N = [200, 500];
  class S {
    m;
    h(e) {
      this.m?.(e);
    }
  }
  const q = [2500, 4e3],
    O = [800, 1800],
    V = e => {
      document.prerendering ? b(() => V(e)) : "complete" !== document.readyState ? addEventListener("load", () => V(e), true) : setTimeout(e);
    };
  return e.CLSThresholds = E, e.FCPThresholds = P, e.INPThresholds = N, e.LCPThresholds = q, e.TTFBThresholds = O, e.onCLS = (e, t = {}) => {
    T(u(() => {
      let s,
        r = c("CLS", 0);
      const a = d(t, h),
        u = e => {
          for (const t of e) a.h(t);
          a.i > r.value && (r.value = a.i, r.entries = a.o, s());
        },
        l = f("layout-shift", u);
      l && (s = i(e, r, E, t.reportAllChanges), document.addEventListener("visibilitychange", () => {
        "hidden" === document.visibilityState && (u(l.takeRecords()), s(true));
      }), n(() => {
        a.i = 0, r = c("CLS", 0), s = i(e, r, E, t.reportAllChanges), o(() => s());
      }), setTimeout(s));
    }));
  }, e.onFCP = T, e.onINP = (e, t = {}) => {
    globalThis.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype && b(() => {
      F();
      let o,
        s = c("INP");
      const r = d(t, A),
        a = e => {
          B(() => {
            for (const t of e) r.h(t);
            const t = r.P();
            t && t.T !== s.value && (s.value = t.T, s.entries = t.entries, o());
          });
        },
        h = f("event", a, {
          durationThreshold: t.durationThreshold ?? 40
        });
      o = i(e, s, N, t.reportAllChanges), h && (h.observe({
        type: "first-input",
        buffered: true
      }), document.addEventListener("visibilitychange", () => {
        "hidden" === document.visibilityState && (a(h.takeRecords()), o(true));
      }), n(() => {
        r.p(), s = c("INP"), o = i(e, s, N, t.reportAllChanges);
      }));
    });
  }, e.onLCP = (e, t = {}) => {
    b(() => {
      const s = y();
      let a,
        h = c("LCP");
      const l = d(t, S),
        m = e => {
          t.reportAllChanges || (e = e.slice(-1));
          for (const t of e) l.h(t), t.startTime < s.firstHiddenTime && (h.value = Math.max(t.startTime - r(), 0), h.entries = [t], a());
        },
        g = f("largest-contentful-paint", m);
      if (g) {
        a = i(e, h, q, t.reportAllChanges);
        const s = u(() => {
          m(g.takeRecords()), g.disconnect(), a(true);
        });
        for (const e of ["keydown", "click", "visibilitychange"]) addEventListener(e, () => B(s), {
          capture: true,
          once: true
        });
        n(n => {
          h = c("LCP"), a = i(e, h, q, t.reportAllChanges), o(() => {
            h.value = performance.now() - n.timeStamp, a(true);
          });
        });
      }
    });
  }, e.onTTFB = (e, t = {}) => {
    let o = c("TTFB"),
      a = i(e, o, O, t.reportAllChanges);
    V(() => {
      const d = s();
      d && (o.value = Math.max(d.responseStart - r(), 0), o.entries = [d], a(true), n(() => {
        o = c("TTFB", 0), a = i(e, o, O, t.reportAllChanges), a(true);
      }));
    });
  }, e;
})({});

function addCWVTracking({
  sampleRUM,
  sourceSelector,
  targetSelector,
  fflags
}) {
  setTimeout(() => {
    try {
      const cwvScript = new URL('.rum/web-vitals/dist/web-vitals.iife.js', sampleRUM.baseURL).href;
      if (document.querySelector(`script[src="${cwvScript}"]`)) {
        return;
      }
      const script = document.createElement('script');
      script.src = cwvScript;
      script.onload = () => {
        const storeCWV = measurement => {
          const data = {
            cwv: {}
          };
          data.cwv[measurement.name] = measurement.value;
          if (measurement.name === 'LCP' && measurement.entries.length > 0) {
            const {
              element
            } = measurement.entries.pop();
            data.target = targetSelector(element);
            data.source = sourceSelector(element) || element && element.outerHTML.slice(0, 30);
          }
          sampleRUM('cwv', data);
        };
        const isEager = metric => ['CLS', 'LCP'].includes(metric);
        ['INP', 'TTFB', 'CLS', 'LCP'].forEach(metric => {
          const metricFn = window.webVitals[`on${metric}`];
          if (typeof metricFn === 'function') {
            let opts = {};
            fflags.enabled('eagercwv', () => {
              opts = {
                reportAllChanges: isEager(metric)
              };
            });
            metricFn(storeCWV, opts);
          }
        });
      };
      document.head.appendChild(script);
    } catch (error) {}
  }, 2000);
}

export { addCWVTracking as default };
