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
      let s, o;
      return r => {
        t.value >= 0 && (r || i) && (o = t.value - (s ?? 0), (o || void 0 === s) && (s = t.value, t.delta = o, t.rating = ((e, t) => e > t[1] ? "poor" : e > t[0] ? "needs-improvement" : "good")(t.value, n), e(t)));
      };
    },
    s = e => {
      requestAnimationFrame(() => requestAnimationFrame(e));
    },
    o = () => {
      const e = performance.getEntriesByType("navigation")[0];
      if (e && e.responseStart > 0 && e.responseStart < performance.now()) return e;
    },
    r = () => o()?.activationStart ?? 0,
    c = (e, n = -1) => {
      const i = o();
      let s = "navigate";
      t >= 0 ? s = "back-forward-cache" : i && (document.prerendering || r() > 0 ? s = "prerender" : document.wasDiscarded ? s = "restore" : i.type && (s = i.type.replace(/_/g, "-")));
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
            queueMicrotask(() => {
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
    l = e => {
      let t = false;
      return () => {
        t || (e(), t = true);
      };
    };
  let u = -1;
  const m = new Set(),
    g = () => "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0,
    v = e => {
      if ("hidden" === document.visibilityState) {
        if ("visibilitychange" === e.type) for (const e of m) e();
        isFinite(u) || (u = "visibilitychange" === e.type ? e.timeStamp : 0, removeEventListener("prerenderingchange", v, true));
      }
    },
    p = () => {
      if (u < 0) {
        const e = r(),
          t = document.prerendering ? void 0 : globalThis.performance.getEntriesByType("visibility-state").find(t => "hidden" === t.name && t.startTime >= e)?.startTime;
        u = t ?? g(), addEventListener("visibilitychange", v, true), addEventListener("prerenderingchange", v, true), n(() => {
          setTimeout(() => {
            u = g();
          });
        });
      }
      return {
        get firstHiddenTime() {
          return u;
        },
        onHidden(e) {
          m.add(e);
        }
      };
    },
    y = e => {
      document.prerendering ? addEventListener("prerenderingchange", e, true) : e();
    },
    T = [1800, 3e3],
    b = (e, t = {}) => {
      y(() => {
        const o = p();
        let a,
          d = c("FCP");
        const h = f("paint", e => {
          for (const t of e) "first-contentful-paint" === t.name && (h.disconnect(), t.startTime < o.firstHiddenTime && (d.value = Math.max(t.startTime - r(), 0), d.entries.push(t), a(true)));
        });
        h && (a = i(e, d, T, t.reportAllChanges), n(n => {
          d = c("FCP"), a = i(e, d, T, t.reportAllChanges), s(() => {
            d.value = performance.now() - n.timeStamp, a(true);
          });
        }));
      });
    },
    E = [.1, .25];
  let L = 0,
    P = 1 / 0,
    _ = 0;
  const M = e => {
    for (const t of e) t.interactionId && (P = Math.min(P, t.interactionId), _ = Math.max(_, t.interactionId), L = _ ? (_ - P) / 7 + 1 : 0);
  };
  let w;
  const C = () => w ? L : performance.interactionCount ?? 0,
    I = () => {
      "interactionCount" in performance || w || (w = f("event", M, {
        durationThreshold: 0
      }));
    };
  let F = 0;
  class k {
    l = [];
    u = new Map();
    m;
    v;
    p() {
      F = C(), this.l.length = 0, this.u.clear();
    }
    T() {
      const e = Math.min(this.l.length - 1, Math.floor((C() - F) / 50));
      return this.l[e];
    }
    h(e) {
      if (this.m?.(e), !e.interactionId && "first-input" !== e.entryType) return;
      const t = this.l.at(-1);
      let n = this.u.get(e.interactionId);
      if (n || this.l.length < 10 || e.duration > t.L) {
        if (n ? e.duration > n.L ? (n.entries = [e], n.L = e.duration) : e.duration === n.L && e.startTime === n.entries[0].startTime && n.entries.push(e) : (n = {
          id: e.interactionId,
          entries: [e],
          L: e.duration
        }, this.u.set(n.id, n), this.l.push(n)), this.l.sort((e, t) => t.L - e.L), this.l.length > 10) {
          const e = this.l.splice(10);
          for (const t of e) this.u.delete(t.id);
        }
        this.v?.(n);
      }
    }
  }
  const A = e => {
      const t = globalThis.requestIdleCallback || setTimeout,
        n = globalThis.cancelIdleCallback || clearTimeout;
      if ("hidden" === document.visibilityState) e();else {
        const i = l(e);
        let s = -1;
        const o = () => {
          n(s), i();
        };
        addEventListener("visibilitychange", o, {
          once: true,
          capture: true
        }), s = t(() => {
          removeEventListener("visibilitychange", o, {
            capture: true
          }), i();
        });
      }
    },
    B = [200, 500];
  class S {
    m;
    h(e) {
      this.m?.(e);
    }
  }
  const q = [2500, 4e3],
    N = [800, 1800],
    H = e => {
      document.prerendering ? y(() => H(e)) : "complete" !== document.readyState ? addEventListener("load", () => H(e), true) : setTimeout(e);
    };
  return e.CLSThresholds = E, e.FCPThresholds = T, e.INPThresholds = B, e.LCPThresholds = q, e.TTFBThresholds = N, e.onCLS = (e, t = {}) => {
    const o = p();
    b(l(() => {
      let r,
        a = c("CLS", 0);
      const l = d(t, h),
        u = e => {
          for (const t of e) l.h(t);
          l.i > a.value && (a.value = l.i, a.entries = l.o, r());
        },
        m = f("layout-shift", u);
      m && (r = i(e, a, E, t.reportAllChanges), o.onHidden(() => {
        u(m.takeRecords()), r(true);
      }), n(() => {
        l.i = 0, a = c("CLS", 0), r = i(e, a, E, t.reportAllChanges), s(r);
      }), setTimeout(r));
    }));
  }, e.onFCP = b, e.onINP = (e, t = {}) => {
    if (!globalThis.PerformanceEventTiming || !("interactionId" in PerformanceEventTiming.prototype)) return;
    const s = p();
    y(() => {
      I();
      let o,
        r = c("INP");
      const a = d(t, k),
        h = e => {
          A(() => {
            for (const t of e) a.h(t);
            const t = a.T();
            t && t.L !== r.value && (r.value = t.L, r.entries = t.entries, o());
          });
        },
        l = f("event", h, {
          durationThreshold: t.durationThreshold ?? 40
        });
      o = i(e, r, B, t.reportAllChanges), l && (l.observe({
        type: "first-input",
        buffered: true
      }), s.onHidden(() => {
        h(l.takeRecords()), o(true);
      }), n(() => {
        a.p(), r = c("INP"), o = i(e, r, B, t.reportAllChanges);
      }));
    });
  }, e.onLCP = (e, t = {}) => {
    y(() => {
      const o = p();
      let a,
        h = c("LCP");
      const u = d(t, S),
        m = e => {
          t.reportAllChanges || (e = e.slice(-1));
          for (const t of e) u.h(t), t.startTime < o.firstHiddenTime && (h.value = Math.max(t.startTime - r(), 0), h.entries = [t], a());
        },
        g = f("largest-contentful-paint", m);
      if (g) {
        a = i(e, h, q, t.reportAllChanges);
        const o = l(() => {
            m(g.takeRecords()), g.disconnect(), a(true);
          }),
          r = e => {
            e.isTrusted && (A(o), removeEventListener(e.type, r, {
              capture: true
            }));
          };
        for (const e of ["keydown", "click", "visibilitychange"]) addEventListener(e, r, {
          capture: true
        });
        n(n => {
          h = c("LCP"), a = i(e, h, q, t.reportAllChanges), s(() => {
            h.value = performance.now() - n.timeStamp, a(true);
          });
        });
      }
    });
  }, e.onTTFB = (e, t = {}) => {
    let s = c("TTFB"),
      a = i(e, s, N, t.reportAllChanges);
    H(() => {
      const d = o();
      d && (s.value = Math.max(d.responseStart - r(), 0), s.entries = [d], a(true), n(() => {
        s = c("TTFB", 0), a = i(e, s, N, t.reportAllChanges), a(true);
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
