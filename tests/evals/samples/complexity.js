"use strict";

// Known-bad sample: Overly complex function with deep nesting, poor naming
// Target agent: Brooks (architect / quality attributes)
// Expected finding: [DEFECT] cyclomatic complexity >10, naming doesn't communicate intent

/**
 * Process incoming data records. Called from the ingestion pipeline.
 */
function proc(d, m, f) {
  const r = [];
  for (let i = 0; i < d.length; i++) {
    if (d[i].t === 1) {
      if (d[i].s !== null) {
        if (d[i].s > 0) {
          if (m) {
            if (d[i].v) {
              if (d[i].v.length > 0) {
                for (let j = 0; j < d[i].v.length; j++) {
                  if (d[i].v[j].a) {
                    if (f && f(d[i].v[j])) {
                      r.push({ x: d[i].v[j].a, y: d[i].s, z: d[i].t });
                    } else if (!f) {
                      r.push({ x: d[i].v[j].a, y: d[i].s, z: d[i].t });
                    }
                  }
                }
              }
            }
          } else {
            r.push({ x: null, y: d[i].s, z: d[i].t });
          }
        } else if (d[i].s === 0) {
          if (d[i].t === 1 && d[i].q) {
            r.push({ x: d[i].q, y: 0, z: 1 });
          }
        }
      }
    } else if (d[i].t === 2) {
      if (d[i].s && d[i].s > 10) {
        r.push({ x: d[i].n, y: d[i].s, z: 2 });
      } else if (d[i].s && d[i].s > 0) {
        if (d[i].w) {
          r.push({ x: d[i].w, y: d[i].s, z: 2 });
        }
      }
    } else if (d[i].t === 3) {
      if (m && d[i].p) {
        for (let k = 0; k < d[i].p.length; k++) {
          if (d[i].p[k].e) {
            r.push({ x: d[i].p[k].e, y: d[i].s || 0, z: 3 });
          }
        }
      }
    }
  }
  return r;
}

module.exports = { proc };
