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
let t = -1;
const n = () => t,
  e = n => {
    addEventListener("pageshow", e => {
      e.persisted && (t = e.timeStamp, n(e));
    }, true);
  },
  i = (t, n, e, i) => {
    let o, s;
    return a => {
      n.value >= 0 && (a || i) && (s = n.value - (o ?? 0), (s || void 0 === o) && (o = n.value, n.delta = s, n.rating = ((t, n) => t > n[1] ? "poor" : t > n[0] ? "needs-improvement" : "good")(n.value, e), t(n)));
    };
  },
  o = t => {
    requestAnimationFrame(() => requestAnimationFrame(() => t()));
  },
  s = () => {
    const t = performance.getEntriesByType("navigation")[0];
    if (t && t.responseStart > 0 && t.responseStart < performance.now()) return t;
  },
  a = () => s()?.activationStart ?? 0;
let r = -1;
const c = new Set(),
  f = () => "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0,
  h = t => {
    if ("hidden" === document.visibilityState) {
      if ("visibilitychange" === t.type) for (const t of c) t();
      isFinite(r) || (r = "visibilitychange" === t.type ? t.timeStamp : 0, removeEventListener("prerenderingchange", h, true));
    }
  },
  d = (t = false) => {
    if (t && (r = 1 / 0), r < 0) {
      const t = a(),
        n = document.prerendering ? void 0 : globalThis.performance.getEntriesByType("visibility-state").find(n => "hidden" === n.name && n.startTime >= t)?.startTime;
      r = n ?? f(), addEventListener("visibilitychange", h, true), addEventListener("prerenderingchange", h, true), e(() => {
        setTimeout(() => {
          r = f();
        });
      });
    }
    return {
      get firstHiddenTime() {
        return r;
      },
      onHidden(t) {
        c.add(t);
      }
    };
  },
  l = (t, e = -1, i, o = 0, r, c, f) => {
    const h = s(),
      d = h?.navigationId || 0;
    let l = "navigate";
    i ? l = i : n() >= 0 ? l = "back-forward-cache" : h && (document.prerendering || a() > 0 ? l = "prerender" : document.wasDiscarded ? l = "restore" : h.type && (l = h.type.replace(/_/g, "-")));
    return {
      name: t,
      value: e,
      rating: "good",
      delta: 0,
      entries: [],
      id: `v6-${Date.now()}-${Math.floor(8999999999999 * Math.random()) + 1e12}`,
      navigationType: l,
      navigationId: o || d,
      navigationInteractionId: r,
      navigationURL: c || h?.name,
      navigationStartTime: f || 0
    };
  },
  g = new WeakMap();
function u(t, n) {
  let e = g.get(n);
  return e || (e = new WeakMap(), g.set(n, e)), e.get(t) || e.set(t, new n()), e.get(t);
}
class v {
  t;
  i = 0;
  o = [];
  h(t) {
    if (t.hadRecentInput) return;
    const n = this.o[0],
      e = this.o.at(-1);
    this.i && n && e && t.startTime - e.startTime < 1e3 && t.startTime - n.startTime < 5e3 ? (this.i += t.value, this.o.push(t)) : (this.i = t.value, this.o = [t]), this.t?.(t);
  }
}
const m = (t, n, e = {}) => {
    try {
      const i = t.filter(t => PerformanceObserver.supportedEntryTypes.includes(t));
      if (i.length > 0) {
        const t = new PerformanceObserver(t => {
          queueMicrotask(() => {
            const e = t.getEntries();
            i.length > 1 && e.sort((t, n) => t.startTime + t.duration - (n.startTime + n.duration)), n(e);
          });
        });
        for (const n of i) t.observe({
          type: n,
          buffered: !0,
          ...e
        });
        return t;
      }
    } catch {}
  },
  p = t => globalThis.PerformanceObserver?.supportedEntryTypes?.includes("soft-navigation") && "function" == typeof globalThis.PerformanceSoftNavigation?.prototype?.getLargestInteractionContentfulPaint && t && t.reportSoftNavs,
  b = (t, n) => {
    if (t.set(n.navigationId, n), t.size > 2) {
      const n = t.keys().next().value;
      void 0 !== n && t.delete(n);
    }
  },
  T = t => {
    let n = false;
    return () => {
      n || (t(), n = true);
    };
  };
class y {
  l;
}
const _ = t => {
    document.prerendering ? addEventListener("prerenderingchange", t, true) : t();
  },
  E = [1800, 3e3],
  M = (t, s = {}) => {
    const r = p(s);
    _(() => {
      const c = u(s, y),
        f = d();
      let h,
        g = l("FCP");
      const v = m(["paint"], t => {
        for (const n of t) "first-contentful-paint" === n.name && (v.disconnect(), n.startTime < f.firstHiddenTime && (g.value = Math.max(n.startTime - a(), 0), g.entries.push(n), g.navigationId = n.navigationId || g.navigationId, h(true)));
      });
      if (v && (h = i(t, g, E, s.reportAllChanges), e(e => {
        g = l("FCP", -1, "back-forward-cache", g.navigationId, g.navigationInteractionId, g.navigationURL, n()), h = i(t, g, E, s.reportAllChanges), o(() => {
          g.value = performance.now() - e.timeStamp, h(true);
        });
      })), r) {
        m(["soft-navigation"], n => {
          n.forEach(n => {
            c.l && n.navigationId && b(c.l, n);
            const e = Math.max((n.presentationTime || n.paintTime || 0) - n.startTime, 0);
            g = l("FCP", e, "soft-navigation", n.navigationId, n.interactionId, n.name, n.startTime), h = i(t, g, E, s.reportAllChanges), h(true);
          });
        }, s);
      }
    });
  },
  L = [.1, .25],
  P = (t, s = {}) => {
    const a = d();
    M(T(() => {
      let r,
        c = l("CLS", 0);
      const f = u(s, v),
        h = (n, e, o, a, h) => {
          c = l("CLS", 0, n, e, o, a, h), f.i = 0, r = i(t, c, L, s.reportAllChanges);
        },
        d = (t = false) => {
          f.i > c.value && (c.value = f.i, c.entries = f.o), r(t);
        },
        g = t => {
          d(true), h("soft-navigation", t.navigationId, t.interactionId, t.name, t.startTime);
        },
        b = t => {
          for (const n of t) "soft-navigation" !== n.entryType ? f.h(n) : g(n);
          d();
        },
        T = ["layout-shift"];
      p(s) && T.push("soft-navigation");
      const y = m(T, b);
      y && (r = i(t, c, L, s.reportAllChanges), a.onHidden(() => {
        b(y.takeRecords()), r(true);
      }), e(() => {
        h("back-forward-cache", c.navigationId, c.navigationInteractionId, c.navigationURL, n()), o(r);
      }), setTimeout(r));
    }));
  };
let w = 0,
  I = 1 / 0,
  k = 0;
const C = t => {
  for (const n of t) n.interactionId && (I = Math.min(I, n.interactionId), k = Math.max(k, n.interactionId), w = k ? (k - I) / 7 + 1 : 0);
};
let F;
const N = () => F ? w : performance.interactionCount ?? 0,
  B = () => {
    "interactionCount" in performance || F || (F = m(["event"], C, {
      durationThreshold: 0
    }));
  };
class S {
  u = 0;
  v = [];
  m = new Map();
  p;
  T;
  _() {
    return N() - this.u;
  }
  M() {
    this.u = N(), this.v.length = 0, this.m.clear();
  }
  L(t) {
    const n = this._(),
      e = Math.min(this.v.length - 1, Math.floor(n / 50));
    return !n || -1 !== e || "soft-navigation" !== t && "back-forward-cache" !== t ? this.v[e] : {
      P: 8,
      id: -1,
      entries: []
    };
  }
  h(t) {
    if (this.p?.(t), !t.interactionId) return;
    const n = this.v.at(-1);
    let e = this.m.get(t.interactionId);
    if (e || this.v.length < 10 || t.duration > n.P) {
      if (e ? t.duration > e.P ? (e.entries = [t], e.P = t.duration) : t.duration === e.P && t.startTime === e.entries[0].startTime && e.entries.push(t) : (e = {
        id: t.interactionId,
        entries: [t],
        P: t.duration
      }, this.m.set(e.id, e), this.v.push(e)), this.v.sort((t, n) => n.P - t.P), this.v.length > 10) {
        const t = this.v.splice(10);
        for (const n of t) this.m.delete(n.id);
      }
      this.T?.(e);
    }
  }
}
const q = t => {
    const n = "requestIdleCallback" in globalThis ? 1e3 : 0,
      e = globalThis.requestIdleCallback || setTimeout,
      i = globalThis.cancelIdleCallback || clearTimeout;
    if ("hidden" === document.visibilityState) t();else {
      const o = T(t);
      let s = -1;
      const a = () => {
        i(s), o();
      };
      addEventListener("visibilitychange", a, {
        once: true,
        capture: true
      }), s = e(() => {
        removeEventListener("visibilitychange", a, {
          capture: true
        }), o();
      }, {
        timeout: n
      });
    }
  },
  A = [200, 500],
  x = (t, o = {}) => {
    if (!globalThis.PerformanceEventTiming || !("interactionId" in PerformanceEventTiming.prototype)) return;
    const s = d();
    _(() => {
      B();
      let a,
        r = l("INP");
      const c = u(o, S),
        f = (n, e, s, f, h) => {
          c.M(), r = l("INP", -1, n, e, s, f, h), a = i(t, r, A, o.reportAllChanges);
        },
        h = () => {
          const t = c.L(r.navigationType);
          t && t.P !== r.value && (r.value = t.P, r.entries = t.entries, a());
        },
        d = t => {
          h(), a(true), f("soft-navigation", t.navigationId, t.interactionId, t.name, t.startTime);
        },
        g = (t, n = false) => {
          q(() => {
            for (const n of t) "soft-navigation" !== n.entryType ? c.h(n) : d(n);
            h(), n && a(true);
          });
        },
        v = ["event", "first-input"];
      p(o) && v.push("soft-navigation");
      const b = m(v, g, {
        ...o,
        durationThreshold: o.durationThreshold ?? 40
      });
      a = i(t, r, A, o.reportAllChanges), b && (s.onHidden(() => {
        g(b.takeRecords(), true);
      }), e(() => {
        f("back-forward-cache", r.navigationId, r.navigationInteractionId, r.navigationURL, n());
      }));
    });
  };
class H {
  p;
  l;
  h(t) {
    this.p?.(t);
  }
}
const O = [2500, 4e3],
  U = (t, s = {}) => {
    let r = false;
    const c = p(s);
    _(() => {
      let f,
        h = d(),
        g = l("LCP");
      const v = u(s, H),
        p = (n, e, o, a, c) => {
          g = l("LCP", -1, n, e, o, a, c), f = i(t, g, O, s.reportAllChanges), r = false, "soft-navigation" === n && (h = d(true));
        },
        T = t => {
          v.l && t.navigationId && b(v.l, t), r || f(true), p("soft-navigation", t.navigationId, t.interactionId, t.name, t.startTime);
          const n = t.getLargestInteractionContentfulPaint?.();
          n && y([n]);
        },
        y = t => {
          s.reportAllChanges || c || (t = t.slice(-1));
          for (const n of t) {
            if (!n) continue;
            if ("soft-navigation" === n.entryType) {
              T(n);
              continue;
            }
            let t = 0,
              e = [],
              i = n.startTime;
            if ("largest-contentful-paint" === n.entryType) t = Math.max(n.startTime - a(), 0), v.h(n), e = [n];else if ("interaction-contentful-paint" === n.entryType) {
              const o = n;
              if (!g.navigationId) continue;
              if ("interactionId" in o && o.interactionId != g.navigationInteractionId) continue;
              i = o.largestContentfulPaint?.renderTime || 0, t = Math.max(i - n.startTime, 0), o.largestContentfulPaint && (v.h(o.largestContentfulPaint), e = [o.largestContentfulPaint]);
            }
            i < h.firstHiddenTime && (g.value = t, g.entries = e, f());
          }
        },
        _ = ["largest-contentful-paint"];
      c && _.push("interaction-contentful-paint", "soft-navigation");
      const E = m(_, y);
      if (E) {
        f = i(t, g, O, s.reportAllChanges);
        const a = ["keydown", "click", "visibilitychange"],
          h = t => {
            if (t.isTrusted && !r) {
              const t = g.id;
              q(() => {
                if (!r) {
                  if (!c) {
                    E.disconnect();
                    for (const t of a) removeEventListener(t, h, {
                      capture: true
                    });
                  }
                  t === g.id && (r = true, f(true));
                }
              });
            }
          };
        for (const t of a) addEventListener(t, h, {
          capture: true
        });
        e(e => {
          p("back-forward-cache", g.navigationId, g.navigationInteractionId, g.navigationURL, n()), f = i(t, g, O, s.reportAllChanges), o(() => {
            g.value = performance.now() - e.timeStamp, r = true, f(true);
          });
        });
      }
    });
  },
  W = [800, 1800],
  $ = t => {
    document.prerendering ? _(() => $(t)) : "complete" !== document.readyState ? addEventListener("load", () => $(t), true) : setTimeout(t);
  },
  D = (t, o = {}) => {
    const r = p(o);
    let c = l("TTFB"),
      f = i(t, c, W, o.reportAllChanges);
    $(() => {
      const h = s();
      if (h) {
        const s = h.responseStart;
        if (c.value = Math.max(s - a(), 0), c.entries = [h], f(true), e(() => {
          c = l("TTFB", 0, "back-forward-cache", c.navigationId, c.navigationInteractionId, c.navigationURL, n()), f = i(t, c, W, o.reportAllChanges), f(true);
        }), r) {
          m(["soft-navigation"], n => {
            n.forEach(n => {
              n.navigationId && (c = l("TTFB", 0, "soft-navigation", n.navigationId, n.interactionId, n.name, n.startTime), c.entries = [n], f = i(t, c, W, o.reportAllChanges), f(true));
            });
          }, o);
        }
      }
    });
  };

const METRICS = {
  CLS: P,
  INP: x,
  LCP: U,
  TTFB: D
};
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
        if (measurement.name === 'CLS' && measurement.entries.length > 0) {
          const largest = measurement.entries.reduce((a, b) => b.value > (a ? a.value : 0) ? b : a, undefined);
          const node = largest && largest.sources && largest.sources.map(s => s.node).find(n => n && n.nodeType === 1);
          if (node) {
            data.source = sourceSelector(node) || node.outerHTML.slice(0, 30);
          }
        }
        sampleRUM('cwv', data);
      };
      const isEager = metric => ['CLS', 'LCP'].includes(metric);
      ['INP', 'TTFB', 'CLS', 'LCP'].forEach(metric => {
        let opts = {};
        fflags.enabled('eagercwv', () => {
          opts = {
            reportAllChanges: isEager(metric)
          };
        });
        METRICS[metric](storeCWV, opts);
      });
    } catch (error) {}
  }, 2000);
}

export { addCWVTracking as default };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3d2Lm1hcC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3dlYi12aXRhbHMvZGlzdC93ZWItdml0YWxzLmpzIiwiLi4vLi4vcGx1Z2lucy9jd3YuanMiXSwic291cmNlc0NvbnRlbnQiOlsibGV0IHQ9LTE7Y29uc3Qgbj0oKT0+dCxlPW49PnthZGRFdmVudExpc3RlbmVyKFwicGFnZXNob3dcIixlPT57ZS5wZXJzaXN0ZWQmJih0PWUudGltZVN0YW1wLG4oZSkpfSwhMCl9LGk9KHQsbixlLGkpPT57bGV0IG8scztyZXR1cm4gYT0+e24udmFsdWU+PTAmJihhfHxpKSYmKHM9bi52YWx1ZS0obz8/MCksKHN8fHZvaWQgMD09PW8pJiYobz1uLnZhbHVlLG4uZGVsdGE9cyxuLnJhdGluZz0oKHQsbik9PnQ+blsxXT9cInBvb3JcIjp0Pm5bMF0/XCJuZWVkcy1pbXByb3ZlbWVudFwiOlwiZ29vZFwiKShuLnZhbHVlLGUpLHQobikpKX19LG89dD0+e3JlcXVlc3RBbmltYXRpb25GcmFtZSgoKT0+cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT50KCkpKX0scz0oKT0+e2NvbnN0IHQ9cGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5VHlwZShcIm5hdmlnYXRpb25cIilbMF07aWYodCYmdC5yZXNwb25zZVN0YXJ0PjAmJnQucmVzcG9uc2VTdGFydDxwZXJmb3JtYW5jZS5ub3coKSlyZXR1cm4gdH0sYT0oKT0+cygpPy5hY3RpdmF0aW9uU3RhcnQ/PzA7bGV0IHI9LTE7Y29uc3QgYz1uZXcgU2V0LGY9KCk9PlwiaGlkZGVuXCIhPT1kb2N1bWVudC52aXNpYmlsaXR5U3RhdGV8fGRvY3VtZW50LnByZXJlbmRlcmluZz8xLzA6MCxoPXQ9PntpZihcImhpZGRlblwiPT09ZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlKXtpZihcInZpc2liaWxpdHljaGFuZ2VcIj09PXQudHlwZSlmb3IoY29uc3QgdCBvZiBjKXQoKTtpc0Zpbml0ZShyKXx8KHI9XCJ2aXNpYmlsaXR5Y2hhbmdlXCI9PT10LnR5cGU/dC50aW1lU3RhbXA6MCxyZW1vdmVFdmVudExpc3RlbmVyKFwicHJlcmVuZGVyaW5nY2hhbmdlXCIsaCwhMCkpfX0sZD0odD0hMSk9PntpZih0JiYocj0xLzApLHI8MCl7Y29uc3QgdD1hKCksbj1kb2N1bWVudC5wcmVyZW5kZXJpbmc/dm9pZCAwOmdsb2JhbFRoaXMucGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5VHlwZShcInZpc2liaWxpdHktc3RhdGVcIikuZmluZChuPT5cImhpZGRlblwiPT09bi5uYW1lJiZuLnN0YXJ0VGltZT49dCk/LnN0YXJ0VGltZTtyPW4/P2YoKSxhZGRFdmVudExpc3RlbmVyKFwidmlzaWJpbGl0eWNoYW5nZVwiLGgsITApLGFkZEV2ZW50TGlzdGVuZXIoXCJwcmVyZW5kZXJpbmdjaGFuZ2VcIixoLCEwKSxlKCgpPT57c2V0VGltZW91dCgoKT0+e3I9ZigpfSl9KX1yZXR1cm57Z2V0IGZpcnN0SGlkZGVuVGltZSgpe3JldHVybiByfSxvbkhpZGRlbih0KXtjLmFkZCh0KX19fSxsPSh0LGU9LTEsaSxvPTAscixjLGYpPT57Y29uc3QgaD1zKCksZD1oPy5uYXZpZ2F0aW9uSWR8fDA7bGV0IGw9XCJuYXZpZ2F0ZVwiO2k/bD1pOm4oKT49MD9sPVwiYmFjay1mb3J3YXJkLWNhY2hlXCI6aCYmKGRvY3VtZW50LnByZXJlbmRlcmluZ3x8YSgpPjA/bD1cInByZXJlbmRlclwiOmRvY3VtZW50Lndhc0Rpc2NhcmRlZD9sPVwicmVzdG9yZVwiOmgudHlwZSYmKGw9aC50eXBlLnJlcGxhY2UoL18vZyxcIi1cIikpKTtyZXR1cm57bmFtZTp0LHZhbHVlOmUscmF0aW5nOlwiZ29vZFwiLGRlbHRhOjAsZW50cmllczpbXSxpZDpgdjYtJHtEYXRlLm5vdygpfS0ke01hdGguZmxvb3IoODk5OTk5OTk5OTk5OSpNYXRoLnJhbmRvbSgpKSsxZTEyfWAsbmF2aWdhdGlvblR5cGU6bCxuYXZpZ2F0aW9uSWQ6b3x8ZCxuYXZpZ2F0aW9uSW50ZXJhY3Rpb25JZDpyLG5hdmlnYXRpb25VUkw6Y3x8aD8ubmFtZSxuYXZpZ2F0aW9uU3RhcnRUaW1lOmZ8fDB9fSxnPW5ldyBXZWFrTWFwO2Z1bmN0aW9uIHUodCxuKXtsZXQgZT1nLmdldChuKTtyZXR1cm4gZXx8KGU9bmV3IFdlYWtNYXAsZy5zZXQobixlKSksZS5nZXQodCl8fGUuc2V0KHQsbmV3IG4pLGUuZ2V0KHQpfWNsYXNzIHZ7dDtpPTA7bz1bXTtoKHQpe2lmKHQuaGFkUmVjZW50SW5wdXQpcmV0dXJuO2NvbnN0IG49dGhpcy5vWzBdLGU9dGhpcy5vLmF0KC0xKTt0aGlzLmkmJm4mJmUmJnQuc3RhcnRUaW1lLWUuc3RhcnRUaW1lPDFlMyYmdC5zdGFydFRpbWUtbi5zdGFydFRpbWU8NWUzPyh0aGlzLmkrPXQudmFsdWUsdGhpcy5vLnB1c2godCkpOih0aGlzLmk9dC52YWx1ZSx0aGlzLm89W3RdKSx0aGlzLnQ/Lih0KX19Y29uc3QgbT0odCxuLGU9e30pPT57dHJ5e2NvbnN0IGk9dC5maWx0ZXIodD0+UGVyZm9ybWFuY2VPYnNlcnZlci5zdXBwb3J0ZWRFbnRyeVR5cGVzLmluY2x1ZGVzKHQpKTtpZihpLmxlbmd0aD4wKXtjb25zdCB0PW5ldyBQZXJmb3JtYW5jZU9ic2VydmVyKHQ9PntxdWV1ZU1pY3JvdGFzaygoKT0+e2NvbnN0IGU9dC5nZXRFbnRyaWVzKCk7aS5sZW5ndGg+MSYmZS5zb3J0KCh0LG4pPT50LnN0YXJ0VGltZSt0LmR1cmF0aW9uLShuLnN0YXJ0VGltZStuLmR1cmF0aW9uKSksbihlKX0pfSk7Zm9yKGNvbnN0IG4gb2YgaSl0Lm9ic2VydmUoe3R5cGU6bixidWZmZXJlZDohMCwuLi5lfSk7cmV0dXJuIHR9fWNhdGNoe319LHA9dD0+Z2xvYmFsVGhpcy5QZXJmb3JtYW5jZU9ic2VydmVyPy5zdXBwb3J0ZWRFbnRyeVR5cGVzPy5pbmNsdWRlcyhcInNvZnQtbmF2aWdhdGlvblwiKSYmXCJmdW5jdGlvblwiPT10eXBlb2YgZ2xvYmFsVGhpcy5QZXJmb3JtYW5jZVNvZnROYXZpZ2F0aW9uPy5wcm90b3R5cGU/LmdldExhcmdlc3RJbnRlcmFjdGlvbkNvbnRlbnRmdWxQYWludCYmdCYmdC5yZXBvcnRTb2Z0TmF2cyxiPSh0LG4pPT57aWYodC5zZXQobi5uYXZpZ2F0aW9uSWQsbiksdC5zaXplPjIpe2NvbnN0IG49dC5rZXlzKCkubmV4dCgpLnZhbHVlO3ZvaWQgMCE9PW4mJnQuZGVsZXRlKG4pfX0sVD10PT57bGV0IG49ITE7cmV0dXJuKCk9PntufHwodCgpLG49ITApfX07Y2xhc3MgeXtsfWNvbnN0IF89dD0+e2RvY3VtZW50LnByZXJlbmRlcmluZz9hZGRFdmVudExpc3RlbmVyKFwicHJlcmVuZGVyaW5nY2hhbmdlXCIsdCwhMCk6dCgpfSxFPVsxODAwLDNlM10sTT0odCxzPXt9KT0+e2NvbnN0IHI9cChzKTtfKCgpPT57Y29uc3QgYz11KHMseSksZj1kKCk7bGV0IGgsZz1sKFwiRkNQXCIpO2NvbnN0IHY9bShbXCJwYWludFwiXSx0PT57Zm9yKGNvbnN0IG4gb2YgdClcImZpcnN0LWNvbnRlbnRmdWwtcGFpbnRcIj09PW4ubmFtZSYmKHYuZGlzY29ubmVjdCgpLG4uc3RhcnRUaW1lPGYuZmlyc3RIaWRkZW5UaW1lJiYoZy52YWx1ZT1NYXRoLm1heChuLnN0YXJ0VGltZS1hKCksMCksZy5lbnRyaWVzLnB1c2gobiksZy5uYXZpZ2F0aW9uSWQ9bi5uYXZpZ2F0aW9uSWR8fGcubmF2aWdhdGlvbklkLGgoITApKSl9KTtpZih2JiYoaD1pKHQsZyxFLHMucmVwb3J0QWxsQ2hhbmdlcyksZShlPT57Zz1sKFwiRkNQXCIsLTEsXCJiYWNrLWZvcndhcmQtY2FjaGVcIixnLm5hdmlnYXRpb25JZCxnLm5hdmlnYXRpb25JbnRlcmFjdGlvbklkLGcubmF2aWdhdGlvblVSTCxuKCkpLGg9aSh0LGcsRSxzLnJlcG9ydEFsbENoYW5nZXMpLG8oKCk9PntnLnZhbHVlPXBlcmZvcm1hbmNlLm5vdygpLWUudGltZVN0YW1wLGgoITApfSl9KSkscil7bShbXCJzb2Z0LW5hdmlnYXRpb25cIl0sbj0+e24uZm9yRWFjaChuPT57Yy5sJiZuLm5hdmlnYXRpb25JZCYmYihjLmwsbik7Y29uc3QgZT1NYXRoLm1heCgobi5wcmVzZW50YXRpb25UaW1lfHxuLnBhaW50VGltZXx8MCktbi5zdGFydFRpbWUsMCk7Zz1sKFwiRkNQXCIsZSxcInNvZnQtbmF2aWdhdGlvblwiLG4ubmF2aWdhdGlvbklkLG4uaW50ZXJhY3Rpb25JZCxuLm5hbWUsbi5zdGFydFRpbWUpLGg9aSh0LGcsRSxzLnJlcG9ydEFsbENoYW5nZXMpLGgoITApfSl9LHMpfX0pfSxMPVsuMSwuMjVdLFA9KHQscz17fSk9Pntjb25zdCBhPWQoKTtNKFQoKCk9PntsZXQgcixjPWwoXCJDTFNcIiwwKTtjb25zdCBmPXUocyx2KSxoPShuLGUsbyxhLGgpPT57Yz1sKFwiQ0xTXCIsMCxuLGUsbyxhLGgpLGYuaT0wLHI9aSh0LGMsTCxzLnJlcG9ydEFsbENoYW5nZXMpfSxkPSh0PSExKT0+e2YuaT5jLnZhbHVlJiYoYy52YWx1ZT1mLmksYy5lbnRyaWVzPWYubykscih0KX0sZz10PT57ZCghMCksaChcInNvZnQtbmF2aWdhdGlvblwiLHQubmF2aWdhdGlvbklkLHQuaW50ZXJhY3Rpb25JZCx0Lm5hbWUsdC5zdGFydFRpbWUpfSxiPXQ9Pntmb3IoY29uc3QgbiBvZiB0KVwic29mdC1uYXZpZ2F0aW9uXCIhPT1uLmVudHJ5VHlwZT9mLmgobik6ZyhuKTtkKCl9LFQ9W1wibGF5b3V0LXNoaWZ0XCJdO3AocykmJlQucHVzaChcInNvZnQtbmF2aWdhdGlvblwiKTtjb25zdCB5PW0oVCxiKTt5JiYocj1pKHQsYyxMLHMucmVwb3J0QWxsQ2hhbmdlcyksYS5vbkhpZGRlbigoKT0+e2IoeS50YWtlUmVjb3JkcygpKSxyKCEwKX0pLGUoKCk9PntoKFwiYmFjay1mb3J3YXJkLWNhY2hlXCIsYy5uYXZpZ2F0aW9uSWQsYy5uYXZpZ2F0aW9uSW50ZXJhY3Rpb25JZCxjLm5hdmlnYXRpb25VUkwsbigpKSxvKHIpfSksc2V0VGltZW91dChyKSl9KSl9O2xldCB3PTAsST0xLzAsaz0wO2NvbnN0IEM9dD0+e2Zvcihjb25zdCBuIG9mIHQpbi5pbnRlcmFjdGlvbklkJiYoST1NYXRoLm1pbihJLG4uaW50ZXJhY3Rpb25JZCksaz1NYXRoLm1heChrLG4uaW50ZXJhY3Rpb25JZCksdz1rPyhrLUkpLzcrMTowKX07bGV0IEY7Y29uc3QgTj0oKT0+Rj93OnBlcmZvcm1hbmNlLmludGVyYWN0aW9uQ291bnQ/PzAsQj0oKT0+e1wiaW50ZXJhY3Rpb25Db3VudFwiaW4gcGVyZm9ybWFuY2V8fEZ8fChGPW0oW1wiZXZlbnRcIl0sQyx7ZHVyYXRpb25UaHJlc2hvbGQ6MH0pKX07Y2xhc3MgU3t1PTA7dj1bXTttPW5ldyBNYXA7cDtUO18oKXtyZXR1cm4gTigpLXRoaXMudX1NKCl7dGhpcy51PU4oKSx0aGlzLnYubGVuZ3RoPTAsdGhpcy5tLmNsZWFyKCl9TCh0KXtjb25zdCBuPXRoaXMuXygpLGU9TWF0aC5taW4odGhpcy52Lmxlbmd0aC0xLE1hdGguZmxvb3Iobi81MCkpO3JldHVybiFufHwtMSE9PWV8fFwic29mdC1uYXZpZ2F0aW9uXCIhPT10JiZcImJhY2stZm9yd2FyZC1jYWNoZVwiIT09dD90aGlzLnZbZV06e1A6OCxpZDotMSxlbnRyaWVzOltdfX1oKHQpe2lmKHRoaXMucD8uKHQpLCF0LmludGVyYWN0aW9uSWQpcmV0dXJuO2NvbnN0IG49dGhpcy52LmF0KC0xKTtsZXQgZT10aGlzLm0uZ2V0KHQuaW50ZXJhY3Rpb25JZCk7aWYoZXx8dGhpcy52Lmxlbmd0aDwxMHx8dC5kdXJhdGlvbj5uLlApe2lmKGU/dC5kdXJhdGlvbj5lLlA/KGUuZW50cmllcz1bdF0sZS5QPXQuZHVyYXRpb24pOnQuZHVyYXRpb249PT1lLlAmJnQuc3RhcnRUaW1lPT09ZS5lbnRyaWVzWzBdLnN0YXJ0VGltZSYmZS5lbnRyaWVzLnB1c2godCk6KGU9e2lkOnQuaW50ZXJhY3Rpb25JZCxlbnRyaWVzOlt0XSxQOnQuZHVyYXRpb259LHRoaXMubS5zZXQoZS5pZCxlKSx0aGlzLnYucHVzaChlKSksdGhpcy52LnNvcnQoKHQsbik9Pm4uUC10LlApLHRoaXMudi5sZW5ndGg+MTApe2NvbnN0IHQ9dGhpcy52LnNwbGljZSgxMCk7Zm9yKGNvbnN0IG4gb2YgdCl0aGlzLm0uZGVsZXRlKG4uaWQpfXRoaXMuVD8uKGUpfX19Y29uc3QgcT10PT57Y29uc3Qgbj1cInJlcXVlc3RJZGxlQ2FsbGJhY2tcImluIGdsb2JhbFRoaXM/MWUzOjAsZT1nbG9iYWxUaGlzLnJlcXVlc3RJZGxlQ2FsbGJhY2t8fHNldFRpbWVvdXQsaT1nbG9iYWxUaGlzLmNhbmNlbElkbGVDYWxsYmFja3x8Y2xlYXJUaW1lb3V0O2lmKFwiaGlkZGVuXCI9PT1kb2N1bWVudC52aXNpYmlsaXR5U3RhdGUpdCgpO2Vsc2V7Y29uc3Qgbz1UKHQpO2xldCBzPS0xO2NvbnN0IGE9KCk9PntpKHMpLG8oKX07YWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIixhLHtvbmNlOiEwLGNhcHR1cmU6ITB9KSxzPWUoKCk9PntyZW1vdmVFdmVudExpc3RlbmVyKFwidmlzaWJpbGl0eWNoYW5nZVwiLGEse2NhcHR1cmU6ITB9KSxvKCl9LHt0aW1lb3V0Om59KX19LEE9WzIwMCw1MDBdLHg9KHQsbz17fSk9PntpZighZ2xvYmFsVGhpcy5QZXJmb3JtYW5jZUV2ZW50VGltaW5nfHwhKFwiaW50ZXJhY3Rpb25JZFwiaW4gUGVyZm9ybWFuY2VFdmVudFRpbWluZy5wcm90b3R5cGUpKXJldHVybjtjb25zdCBzPWQoKTtfKCgpPT57QigpO2xldCBhLHI9bChcIklOUFwiKTtjb25zdCBjPXUobyxTKSxmPShuLGUscyxmLGgpPT57Yy5NKCkscj1sKFwiSU5QXCIsLTEsbixlLHMsZixoKSxhPWkodCxyLEEsby5yZXBvcnRBbGxDaGFuZ2VzKX0saD0oKT0+e2NvbnN0IHQ9Yy5MKHIubmF2aWdhdGlvblR5cGUpO3QmJnQuUCE9PXIudmFsdWUmJihyLnZhbHVlPXQuUCxyLmVudHJpZXM9dC5lbnRyaWVzLGEoKSl9LGQ9dD0+e2goKSxhKCEwKSxmKFwic29mdC1uYXZpZ2F0aW9uXCIsdC5uYXZpZ2F0aW9uSWQsdC5pbnRlcmFjdGlvbklkLHQubmFtZSx0LnN0YXJ0VGltZSl9LGc9KHQsbj0hMSk9PntxKCgpPT57Zm9yKGNvbnN0IG4gb2YgdClcInNvZnQtbmF2aWdhdGlvblwiIT09bi5lbnRyeVR5cGU/Yy5oKG4pOmQobik7aCgpLG4mJmEoITApfSl9LHY9W1wiZXZlbnRcIixcImZpcnN0LWlucHV0XCJdO3AobykmJnYucHVzaChcInNvZnQtbmF2aWdhdGlvblwiKTtjb25zdCBiPW0odixnLHsuLi5vLGR1cmF0aW9uVGhyZXNob2xkOm8uZHVyYXRpb25UaHJlc2hvbGQ/PzQwfSk7YT1pKHQscixBLG8ucmVwb3J0QWxsQ2hhbmdlcyksYiYmKHMub25IaWRkZW4oKCk9PntnKGIudGFrZVJlY29yZHMoKSwhMCl9KSxlKCgpPT57ZihcImJhY2stZm9yd2FyZC1jYWNoZVwiLHIubmF2aWdhdGlvbklkLHIubmF2aWdhdGlvbkludGVyYWN0aW9uSWQsci5uYXZpZ2F0aW9uVVJMLG4oKSl9KSl9KX07Y2xhc3MgSHtwO2w7aCh0KXt0aGlzLnA/Lih0KX19Y29uc3QgTz1bMjUwMCw0ZTNdLFU9KHQscz17fSk9PntsZXQgcj0hMTtjb25zdCBjPXAocyk7XygoKT0+e2xldCBmLGg9ZCgpLGc9bChcIkxDUFwiKTtjb25zdCB2PXUocyxIKSxwPShuLGUsbyxhLGMpPT57Zz1sKFwiTENQXCIsLTEsbixlLG8sYSxjKSxmPWkodCxnLE8scy5yZXBvcnRBbGxDaGFuZ2VzKSxyPSExLFwic29mdC1uYXZpZ2F0aW9uXCI9PT1uJiYoaD1kKCEwKSl9LFQ9dD0+e3YubCYmdC5uYXZpZ2F0aW9uSWQmJmIodi5sLHQpLHJ8fGYoITApLHAoXCJzb2Z0LW5hdmlnYXRpb25cIix0Lm5hdmlnYXRpb25JZCx0LmludGVyYWN0aW9uSWQsdC5uYW1lLHQuc3RhcnRUaW1lKTtjb25zdCBuPXQuZ2V0TGFyZ2VzdEludGVyYWN0aW9uQ29udGVudGZ1bFBhaW50Py4oKTtuJiZ5KFtuXSl9LHk9dD0+e3MucmVwb3J0QWxsQ2hhbmdlc3x8Y3x8KHQ9dC5zbGljZSgtMSkpO2Zvcihjb25zdCBuIG9mIHQpe2lmKCFuKWNvbnRpbnVlO2lmKFwic29mdC1uYXZpZ2F0aW9uXCI9PT1uLmVudHJ5VHlwZSl7VChuKTtjb250aW51ZX1sZXQgdD0wLGU9W10saT1uLnN0YXJ0VGltZTtpZihcImxhcmdlc3QtY29udGVudGZ1bC1wYWludFwiPT09bi5lbnRyeVR5cGUpdD1NYXRoLm1heChuLnN0YXJ0VGltZS1hKCksMCksdi5oKG4pLGU9W25dO2Vsc2UgaWYoXCJpbnRlcmFjdGlvbi1jb250ZW50ZnVsLXBhaW50XCI9PT1uLmVudHJ5VHlwZSl7Y29uc3Qgbz1uO2lmKCFnLm5hdmlnYXRpb25JZCljb250aW51ZTtpZihcImludGVyYWN0aW9uSWRcImluIG8mJm8uaW50ZXJhY3Rpb25JZCE9Zy5uYXZpZ2F0aW9uSW50ZXJhY3Rpb25JZCljb250aW51ZTtpPW8ubGFyZ2VzdENvbnRlbnRmdWxQYWludD8ucmVuZGVyVGltZXx8MCx0PU1hdGgubWF4KGktbi5zdGFydFRpbWUsMCksby5sYXJnZXN0Q29udGVudGZ1bFBhaW50JiYodi5oKG8ubGFyZ2VzdENvbnRlbnRmdWxQYWludCksZT1bby5sYXJnZXN0Q29udGVudGZ1bFBhaW50XSl9aTxoLmZpcnN0SGlkZGVuVGltZSYmKGcudmFsdWU9dCxnLmVudHJpZXM9ZSxmKCkpfX0sXz1bXCJsYXJnZXN0LWNvbnRlbnRmdWwtcGFpbnRcIl07YyYmXy5wdXNoKFwiaW50ZXJhY3Rpb24tY29udGVudGZ1bC1wYWludFwiLFwic29mdC1uYXZpZ2F0aW9uXCIpO2NvbnN0IEU9bShfLHkpO2lmKEUpe2Y9aSh0LGcsTyxzLnJlcG9ydEFsbENoYW5nZXMpO2NvbnN0IGE9W1wia2V5ZG93blwiLFwiY2xpY2tcIixcInZpc2liaWxpdHljaGFuZ2VcIl0saD10PT57aWYodC5pc1RydXN0ZWQmJiFyKXtjb25zdCB0PWcuaWQ7cSgoKT0+e2lmKCFyKXtpZighYyl7RS5kaXNjb25uZWN0KCk7Zm9yKGNvbnN0IHQgb2YgYSlyZW1vdmVFdmVudExpc3RlbmVyKHQsaCx7Y2FwdHVyZTohMH0pfXQ9PT1nLmlkJiYocj0hMCxmKCEwKSl9fSl9fTtmb3IoY29uc3QgdCBvZiBhKWFkZEV2ZW50TGlzdGVuZXIodCxoLHtjYXB0dXJlOiEwfSk7ZShlPT57cChcImJhY2stZm9yd2FyZC1jYWNoZVwiLGcubmF2aWdhdGlvbklkLGcubmF2aWdhdGlvbkludGVyYWN0aW9uSWQsZy5uYXZpZ2F0aW9uVVJMLG4oKSksZj1pKHQsZyxPLHMucmVwb3J0QWxsQ2hhbmdlcyksbygoKT0+e2cudmFsdWU9cGVyZm9ybWFuY2Uubm93KCktZS50aW1lU3RhbXAscj0hMCxmKCEwKX0pfSl9fSl9LFc9WzgwMCwxODAwXSwkPXQ9Pntkb2N1bWVudC5wcmVyZW5kZXJpbmc/XygoKT0+JCh0KSk6XCJjb21wbGV0ZVwiIT09ZG9jdW1lbnQucmVhZHlTdGF0ZT9hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCgpPT4kKHQpLCEwKTpzZXRUaW1lb3V0KHQpfSxEPSh0LG89e30pPT57Y29uc3Qgcj1wKG8pO2xldCBjPWwoXCJUVEZCXCIpLGY9aSh0LGMsVyxvLnJlcG9ydEFsbENoYW5nZXMpOyQoKCk9Pntjb25zdCBoPXMoKTtpZihoKXtjb25zdCBzPWgucmVzcG9uc2VTdGFydDtpZihjLnZhbHVlPU1hdGgubWF4KHMtYSgpLDApLGMuZW50cmllcz1baF0sZighMCksZSgoKT0+e2M9bChcIlRURkJcIiwwLFwiYmFjay1mb3J3YXJkLWNhY2hlXCIsYy5uYXZpZ2F0aW9uSWQsYy5uYXZpZ2F0aW9uSW50ZXJhY3Rpb25JZCxjLm5hdmlnYXRpb25VUkwsbigpKSxmPWkodCxjLFcsby5yZXBvcnRBbGxDaGFuZ2VzKSxmKCEwKX0pLHIpe20oW1wic29mdC1uYXZpZ2F0aW9uXCJdLG49PntuLmZvckVhY2gobj0+e24ubmF2aWdhdGlvbklkJiYoYz1sKFwiVFRGQlwiLDAsXCJzb2Z0LW5hdmlnYXRpb25cIixuLm5hdmlnYXRpb25JZCxuLmludGVyYWN0aW9uSWQsbi5uYW1lLG4uc3RhcnRUaW1lKSxjLmVudHJpZXM9W25dLGY9aSh0LGMsVyxvLnJlcG9ydEFsbENoYW5nZXMpLGYoITApKX0pfSxvKX19fSl9O2V4cG9ydHtMIGFzIENMU1RocmVzaG9sZHMsRSBhcyBGQ1BUaHJlc2hvbGRzLEEgYXMgSU5QVGhyZXNob2xkcyxPIGFzIExDUFRocmVzaG9sZHMsVyBhcyBUVEZCVGhyZXNob2xkcyxQIGFzIG9uQ0xTLE0gYXMgb25GQ1AseCBhcyBvbklOUCxVIGFzIG9uTENQLEQgYXMgb25UVEZCfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXdlYi12aXRhbHMuanMubWFwXG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMjQgQWRvYmUuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGZpbGUgaXMgbGljZW5zZWQgdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weVxuICogb2YgdGhlIExpY2Vuc2UgYXQgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlclxuICogdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgUkVQUkVTRU5UQVRJT05TXG4gKiBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2VcbiAqIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8vIHdlYi12aXRhbHMgaXMgYnVuZGxlZCBpbnRvIHRoaXMgcGx1Z2luIGZyb20gdGhlIGxvY2tmaWxlLXBpbm5lZCBwYWNrYWdlLiBUaGVyZSBpcyBub1xuLy8gcnVudGltZSBzY3JpcHQgbG9hZCwgc28gbm90aGluZyBvdXRzaWRlIHRoaXMgcmVsZWFzZSdzIG1hbmlmZXN0IGlzIGV4ZWN1dGVkLlxuLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzLCBpbXBvcnQvbm8tcmVsYXRpdmUtcGFja2FnZXMgKi9cbmltcG9ydCB7XG4gIG9uQ0xTLCBvbklOUCwgb25MQ1AsIG9uVFRGQixcbn0gZnJvbSAnLi4vbm9kZV9tb2R1bGVzL3dlYi12aXRhbHMvZGlzdC93ZWItdml0YWxzLmpzJztcbi8qIGVzbGludC1lbmFibGUgaW1wb3J0L25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzLCBpbXBvcnQvbm8tcmVsYXRpdmUtcGFja2FnZXMgKi9cblxuY29uc3QgTUVUUklDUyA9IHtcbiAgQ0xTOiBvbkNMUywgSU5QOiBvbklOUCwgTENQOiBvbkxDUCwgVFRGQjogb25UVEZCLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYWRkQ1dWVHJhY2tpbmcoe1xuICBzYW1wbGVSVU0sIHNvdXJjZVNlbGVjdG9yLCB0YXJnZXRTZWxlY3RvciwgZmZsYWdzLFxufSkge1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICB0cnkge1xuICAgICAgLy8gT2xkZXIgZW5oYW5jZXJzIGxvYWRlZCB3ZWItdml0YWxzIGZyb20gdGhpcyBVUkwuIElmIHRoZSBwYWdlIGluY2x1ZGVzIGl0IGl0c2VsZixcbiAgICAgIC8vIGtlZXAgdGhlIHByZXZpb3VzIGJlaGF2aW9yIGFuZCBkb24ndCByZWdpc3RlciBhIHNlY29uZCBzZXQgb2Ygb2JzZXJ2ZXJzLlxuICAgICAgY29uc3QgY3d2U2NyaXB0ID0gbmV3IFVSTCgnLnJ1bS93ZWItdml0YWxzL2Rpc3Qvd2ViLXZpdGFscy5paWZlLmpzJywgc2FtcGxlUlVNLmJhc2VVUkwpLmhyZWY7XG4gICAgICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gICAgICBpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihgc2NyaXB0W3NyYz1cIiR7Y3d2U2NyaXB0fVwiXWApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHN0b3JlQ1dWID0gKG1lYXN1cmVtZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7IGN3djoge30gfTtcbiAgICAgICAgZGF0YS5jd3ZbbWVhc3VyZW1lbnQubmFtZV0gPSBtZWFzdXJlbWVudC52YWx1ZTtcbiAgICAgICAgaWYgKG1lYXN1cmVtZW50Lm5hbWUgPT09ICdMQ1AnICYmIG1lYXN1cmVtZW50LmVudHJpZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHsgZWxlbWVudCB9ID0gbWVhc3VyZW1lbnQuZW50cmllcy5wb3AoKTtcbiAgICAgICAgICBkYXRhLnRhcmdldCA9IHRhcmdldFNlbGVjdG9yKGVsZW1lbnQpO1xuICAgICAgICAgIGRhdGEuc291cmNlID0gc291cmNlU2VsZWN0b3IoZWxlbWVudCkgfHwgKGVsZW1lbnQgJiYgZWxlbWVudC5vdXRlckhUTUwuc2xpY2UoMCwgMzApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWVhc3VyZW1lbnQubmFtZSA9PT0gJ0NMUycgJiYgbWVhc3VyZW1lbnQuZW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLy8gQXR0cmlidXRlIENMUyB0byB0aGUgZWxlbWVudCBvZiB0aGUgc2luZ2xlIGxhcmdlc3QgbGF5b3V0IHNoaWZ0XG4gICAgICAgICAgLy8gKG1pcnJvcnMgd2ViLXZpdGFscycgYGxhcmdlc3RTaGlmdFRhcmdldGAsIGRlcml2ZWQgZnJvbSB0aGUgc3RhbmRhcmQgZW50cmllcykuXG4gICAgICAgICAgY29uc3QgbGFyZ2VzdCA9IG1lYXN1cmVtZW50LmVudHJpZXNcbiAgICAgICAgICAgIC5yZWR1Y2UoKGEsIGIpID0+IChiLnZhbHVlID4gKGEgPyBhLnZhbHVlIDogMCkgPyBiIDogYSksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgY29uc3Qgbm9kZSA9IGxhcmdlc3QgJiYgbGFyZ2VzdC5zb3VyY2VzXG4gICAgICAgICAgICAmJiBsYXJnZXN0LnNvdXJjZXMubWFwKChzKSA9PiBzLm5vZGUpLmZpbmQoKG4pID0+IG4gJiYgbi5ub2RlVHlwZSA9PT0gMSk7XG4gICAgICAgICAgaWYgKG5vZGUpIHtcbiAgICAgICAgICAgIGRhdGEuc291cmNlID0gc291cmNlU2VsZWN0b3Iobm9kZSkgfHwgbm9kZS5vdXRlckhUTUwuc2xpY2UoMCwgMzApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzYW1wbGVSVU0oJ2N3dicsIGRhdGEpO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgaXNFYWdlciA9IChtZXRyaWMpID0+IFsnQ0xTJywgJ0xDUCddLmluY2x1ZGVzKG1ldHJpYyk7XG5cbiAgICAgIFsnSU5QJywgJ1RURkInLCAnQ0xTJywgJ0xDUCddLmZvckVhY2goKG1ldHJpYykgPT4ge1xuICAgICAgICBsZXQgb3B0cyA9IHt9O1xuICAgICAgICBmZmxhZ3MuZW5hYmxlZCgnZWFnZXJjd3YnLCAoKSA9PiB7XG4gICAgICAgICAgb3B0cyA9IHsgcmVwb3J0QWxsQ2hhbmdlczogaXNFYWdlcihtZXRyaWMpIH07XG4gICAgICAgIH0pO1xuICAgICAgICBNRVRSSUNTW21ldHJpY10oc3RvcmVDV1YsIG9wdHMpO1xuICAgICAgfSk7XG4gICAgICAvKiBjOCBpZ25vcmUgbmV4dCAzICovXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgfVxuICB9LCAyMDAwKTsgLy8gd2FpdCBmb3IgZGVsYXllZFxufVxuIl0sIm5hbWVzIjpbInQiLCJuIiwiZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJwZXJzaXN0ZWQiLCJ0aW1lU3RhbXAiLCJNRVRSSUNTIiwiQ0xTIiwib25DTFMiLCJJTlAiLCJvbklOUCIsIkxDUCIsIm9uTENQIiwiVFRGQiIsIm9uVFRGQiIsImFkZENXVlRyYWNraW5nIiwic2FtcGxlUlVNIiwic291cmNlU2VsZWN0b3IiLCJ0YXJnZXRTZWxlY3RvciIsImZmbGFncyIsInNldFRpbWVvdXQiLCJjd3ZTY3JpcHQiLCJVUkwiLCJiYXNlVVJMIiwiaHJlZiIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsInN0b3JlQ1dWIiwibWVhc3VyZW1lbnQiLCJkYXRhIiwiY3d2IiwibmFtZSIsInZhbHVlIiwiZW50cmllcyIsImxlbmd0aCIsImVsZW1lbnQiLCJwb3AiLCJ0YXJnZXQiLCJzb3VyY2UiLCJvdXRlckhUTUwiLCJzbGljZSIsImxhcmdlc3QiLCJyZWR1Y2UiLCJhIiwiYiIsInVuZGVmaW5lZCIsIm5vZGUiLCJzb3VyY2VzIiwibWFwIiwicyIsImZpbmQiLCJub2RlVHlwZSIsImlzRWFnZXIiLCJtZXRyaWMiLCJpbmNsdWRlcyIsImZvckVhY2giLCJvcHRzIiwiZW5hYmxlZCIsInJlcG9ydEFsbENoYW5nZXMiLCJlcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFvQkEsSUFBSUEsQ0FBQSxHQUFBLEVBQXFCO0FBRWxCLE1BQU1DLENBQUEsR0FBd0JBLE1BQU1ELENBQUE7QUFFOUJFLEVBQUFBLENBQUEsR0FBb0JELENBQUEsSUFBQTtJQUMvQkUsZ0JBQUEsQ0FDRSxZQUNDRCxDQUFBLElBQUE7TUFDS0EsQ0FBQSxDQUFNRSxTQUFBLEtBQ1JKLENBQUEsR0FBcUJFLENBQUEsQ0FBTUcsU0FBQSxFQUMzQkosQ0FBQSxDQUFHQyxDQUFBLENBQUEsQ0FBQTtJQUFBLENBQUEsRUFBQSxJQUdQLENBQUE7QUFBQSxFQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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
