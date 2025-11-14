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
      let s, r;
      return o => {
        t.value >= 0 && (o || i) && (r = t.value - (s ?? 0), (r || void 0 === s) && (s = t.value, t.delta = r, t.rating = ((e, t) => e > t[1] ? "poor" : e > t[0] ? "needs-improvement" : "good")(t.value, n), e(t)));
      };
    },
    s = e => {
      requestAnimationFrame(() => requestAnimationFrame(() => e()));
    },
    r = () => {
      const e = performance.getEntriesByType("navigation")[0];
      if (e && e.responseStart > 0 && e.responseStart < performance.now()) return e;
    },
    o = () => {
      const e = r();
      return e?.activationStart ?? 0;
    },
    c = (e, n = -1) => {
      const i = r();
      let s = "navigate";
      t >= 0 ? s = "back-forward-cache" : i && (document.prerendering || o() > 0 ? s = "prerender" : document.wasDiscarded ? s = "restore" : i.type && (s = i.type.replace(/_/g, "-")));
      return {
        name: e,
        value: n,
        rating: "good",
        delta: 0,
        entries: [],
        id: `v5-${Date.now()}-${Math.floor(8999999999999 * Math.random()) + 1e12}`,
        navigationType: s
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
  const m = new Set(),
    v = () => "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0,
    p = e => {
      if ("hidden" === document.visibilityState) {
        if ("visibilitychange" === e.type) for (const e of m) e();
        isFinite(l) || (l = "visibilitychange" === e.type ? e.timeStamp : 0, removeEventListener("prerenderingchange", p, true));
      }
    },
    g = () => {
      if (l < 0) {
        const e = o(),
          t = document.prerendering ? void 0 : globalThis.performance.getEntriesByType("visibility-state").filter(t => "hidden" === t.name && t.startTime > e)[0]?.startTime;
        l = t ?? v(), addEventListener("visibilitychange", p, true), addEventListener("prerenderingchange", p, true), n(() => {
          setTimeout(() => {
            l = v();
          });
        });
      }
      return {
        get firstHiddenTime() {
          return l;
        },
        onHidden(e) {
          m.add(e);
        }
      };
    },
    y = e => {
      document.prerendering ? addEventListener("prerenderingchange", () => e(), true) : e();
    },
    b = [1800, 3e3],
    E = (e, t = {}) => {
      y(() => {
        const r = g();
        let a,
          d = c("FCP");
        const h = f("paint", e => {
          for (const t of e) "first-contentful-paint" === t.name && (h.disconnect(), t.startTime < r.firstHiddenTime && (d.value = Math.max(t.startTime - o(), 0), d.entries.push(t), a(true)));
        });
        h && (a = i(e, d, b, t.reportAllChanges), n(n => {
          d = c("FCP"), a = i(e, d, b, t.reportAllChanges), s(() => {
            d.value = performance.now() - n.timeStamp, a(true);
          });
        }));
      });
    },
    L = [.1, .25];
  let P = 0,
    T = 1 / 0,
    _ = 0;
  const M = e => {
    for (const t of e) t.interactionId && (T = Math.min(T, t.interactionId), _ = Math.max(_, t.interactionId), P = _ ? (_ - T) / 7 + 1 : 0);
  };
  let w;
  const C = () => w ? P : performance.interactionCount ?? 0,
    I = () => {
      "interactionCount" in performance || w || (w = f("event", M, {
        type: "event",
        buffered: true,
        durationThreshold: 0
      }));
    };
  let F = 0;
  class k {
    u = [];
    l = new Map();
    m;
    v;
    p() {
      F = C(), this.u.length = 0, this.l.clear();
    }
    L() {
      const e = Math.min(this.u.length - 1, Math.floor((C() - F) / 50));
      return this.u[e];
    }
    h(e) {
      if (this.m?.(e), !e.interactionId && "first-input" !== e.entryType) return;
      const t = this.u.at(-1);
      let n = this.l.get(e.interactionId);
      if (n || this.u.length < 10 || e.duration > t.P) {
        if (n ? e.duration > n.P ? (n.entries = [e], n.P = e.duration) : e.duration === n.P && e.startTime === n.entries[0].startTime && n.entries.push(e) : (n = {
          id: e.interactionId,
          entries: [e],
          P: e.duration
        }, this.l.set(n.id, n), this.u.push(n)), this.u.sort((e, t) => t.P - e.P), this.u.length > 10) {
          const e = this.u.splice(10);
          for (const t of e) this.l.delete(t.id);
        }
        this.v?.(n);
      }
    }
  }
  const A = e => {
      const t = globalThis.requestIdleCallback || setTimeout;
      "hidden" === document.visibilityState ? e() : (e = u(e), addEventListener("visibilitychange", e, {
        once: true,
        capture: true
      }), t(() => {
        e(), removeEventListener("visibilitychange", e, {
          capture: true
        });
      }));
    },
    B = [200, 500];
  class S {
    m;
    h(e) {
      this.m?.(e);
    }
  }
  const N = [2500, 4e3],
    q = [800, 1800],
    H = e => {
      document.prerendering ? y(() => H(e)) : "complete" !== document.readyState ? addEventListener("load", () => H(e), true) : setTimeout(e);
    };
  return e.CLSThresholds = L, e.FCPThresholds = b, e.INPThresholds = B, e.LCPThresholds = N, e.TTFBThresholds = q, e.onCLS = (e, t = {}) => {
    const r = g();
    E(u(() => {
      let o,
        a = c("CLS", 0);
      const u = d(t, h),
        l = e => {
          for (const t of e) u.h(t);
          u.i > a.value && (a.value = u.i, a.entries = u.o, o());
        },
        m = f("layout-shift", l);
      m && (o = i(e, a, L, t.reportAllChanges), r.onHidden(() => {
        l(m.takeRecords()), o(true);
      }), n(() => {
        u.i = 0, a = c("CLS", 0), o = i(e, a, L, t.reportAllChanges), s(() => o());
      }), setTimeout(o));
    }));
  }, e.onFCP = E, e.onINP = (e, t = {}) => {
    if (!globalThis.PerformanceEventTiming || !("interactionId" in PerformanceEventTiming.prototype)) return;
    const s = g();
    y(() => {
      I();
      let r,
        o = c("INP");
      const a = d(t, k),
        h = e => {
          A(() => {
            for (const t of e) a.h(t);
            const t = a.L();
            t && t.P !== o.value && (o.value = t.P, o.entries = t.entries, r());
          });
        },
        u = f("event", h, {
          durationThreshold: t.durationThreshold ?? 40
        });
      r = i(e, o, B, t.reportAllChanges), u && (u.observe({
        type: "first-input",
        buffered: true
      }), s.onHidden(() => {
        h(u.takeRecords()), r(true);
      }), n(() => {
        a.p(), o = c("INP"), r = i(e, o, B, t.reportAllChanges);
      }));
    });
  }, e.onLCP = (e, t = {}) => {
    y(() => {
      const r = g();
      let a,
        h = c("LCP");
      const l = d(t, S),
        m = e => {
          t.reportAllChanges || (e = e.slice(-1));
          for (const t of e) l.h(t), t.startTime < r.firstHiddenTime && (h.value = Math.max(t.startTime - o(), 0), h.entries = [t], a());
        },
        v = f("largest-contentful-paint", m);
      if (v) {
        a = i(e, h, N, t.reportAllChanges);
        const r = u(() => {
            m(v.takeRecords()), v.disconnect(), a(true);
          }),
          o = e => {
            e.isTrusted && (A(r), removeEventListener(e.type, o, {
              capture: true
            }));
          };
        for (const e of ["keydown", "click", "visibilitychange"]) addEventListener(e, o, {
          capture: true
        });
        n(n => {
          h = c("LCP"), a = i(e, h, N, t.reportAllChanges), s(() => {
            h.value = performance.now() - n.timeStamp, a(true);
          });
        });
      }
    });
  }, e.onTTFB = (e, t = {}) => {
    let s = c("TTFB"),
      a = i(e, s, q, t.reportAllChanges);
    H(() => {
      const d = r();
      d && (s.value = Math.max(d.responseStart - o(), 0), s.entries = [d], a(true), n(() => {
        s = c("TTFB", 0), a = i(e, s, q, t.reportAllChanges), a(true);
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
