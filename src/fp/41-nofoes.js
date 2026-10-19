// ---------------- no night monsters ----------------
// Joe: the night's own enemies are gone. Whatever the main game would send out after dark (a wanderer, a pack, a raid, a
// stalker) doesn't come; the clan still has the day.
{ const one = exSpawn, pack = exPack, dark = () => !NIGHT_FOES && S.day && dayNight();
  exSpawn = function (type) { if (dark()) return; return one(type); };
  exPack = function (ring, n) { if (dark()) return; return pack(ring, n); }; }
