// Local broad phase; membership changes already advance stGen throughout the building system.
const ST_INDEX = { map: null, gen: -1, size: -1, cells: new Map() }, ST_CELL = 128;
stNear = function (x, y, R) {
  const D = S.day, out = []; if (!D) return out;
  if (D.bld.size < 256) { for (const o of D.bld.values()) if (Math.abs(o.x - x) < R + GRID && Math.abs(o.y - y) < R + GRID) out.push(o); return out; }
  if (ST_INDEX.map !== D.bld || ST_INDEX.gen !== stGen || ST_INDEX.size !== D.bld.size) {
    ST_INDEX.map = D.bld; ST_INDEX.gen = stGen; ST_INDEX.size = D.bld.size; ST_INDEX.cells.clear();
    let order = 0;
    for (const o of D.bld.values()) {
      const key = Math.floor(o.x / ST_CELL) + ',' + Math.floor(o.y / ST_CELL);
      let c = ST_INDEX.cells.get(key); if (!c) ST_INDEX.cells.set(key, c = []);
      c.push({ o, order: order++ });
    }
  }
  const pad = R + GRID;
  for (let i = Math.floor((x - pad) / ST_CELL); i <= Math.floor((x + pad) / ST_CELL); i++)
    for (let j = Math.floor((y - pad) / ST_CELL); j <= Math.floor((y + pad) / ST_CELL); j++) {
      const c = ST_INDEX.cells.get(i + ',' + j); if (!c) continue;
      for (const e of c) if (Math.abs(e.o.x - x) < pad && Math.abs(e.o.y - y) < pad) out.push(e);
    }
  out.sort((a, b) => a.order - b.order); return out.map(e => e.o);
};
