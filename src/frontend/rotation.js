// Exercise rotation. Random, but avoids recently used moves and never repeats
// a muscle group back to back (or inside one circuit). Constraints relax only
// when the pool is too small to honour them.

export function pickExercises(all, recent, n, exclude = [], rand = Math.random) {
  if (!all.length) return [];
  const byId = (id) => all.find((e) => e.id === id);
  const picked = [];
  const memory = Math.min(8, Math.floor(all.length / 2));
  for (let i = 0; i < n; i++) {
    const avoid = new Set([...recent.slice(0, memory), ...exclude, ...picked.map((e) => e.id)]);
    const groups = new Set(picked.map((e) => e.group));
    const last = picked.length ? picked[picked.length - 1] : byId(recent[0]);
    if (last) groups.add(last.group);
    const tiers = [
      all.filter((e) => !avoid.has(e.id) && !groups.has(e.group)),
      all.filter((e) => !avoid.has(e.id)),
      all.filter((e) => !picked.includes(e) && !exclude.includes(e.id)),
      all,
    ];
    const tier = tiers.find((x) => x.length);
    picked.push(tier[Math.floor(rand() * tier.length)]);
  }
  return picked.map((e) => e.id);
}
