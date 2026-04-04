const DEFAULT_DEMO_SEED = String(process.env.TECHNEXUS_DEMO_SEED ?? "20260402");

function xmur3(input) {
  let hash = 1779033703 ^ input.length;

  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRandom(seed = DEFAULT_DEMO_SEED) {
  const seedFactory = xmur3(String(seed));
  return mulberry32(seedFactory());
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomFloat(rng, min, max) {
  return rng() * (max - min) + min;
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

function toMoneyString(value) {
  return roundCurrency(value).toFixed(2);
}

function pickOne(rng, items) {
  assert(items.length > 0, "Cannot pick from an empty collection.");
  return items[randomInt(rng, 0, items.length - 1)];
}

function shuffle(rng, items) {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, 0, index);
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

function weightedPick(rng, entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  assert(totalWeight > 0, "Weighted pick requires at least one positive weight.");

  let cursor = rng() * totalWeight;

  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.value;
    }
  }

  return entries[entries.length - 1].value;
}

function pickDistinctWeighted(rng, entries, count, getWeight) {
  const available = [...entries];
  const selected = [];

  while (available.length > 0 && selected.length < count) {
    const picked = weightedPick(
      rng,
      available.map((entry) => ({
        value: entry,
        weight: Math.max(1, getWeight(entry))
      }))
    );
    selected.push(picked);
    available.splice(available.indexOf(picked), 1);
  }

  return selected;
}

function randomDateBetween(rng, start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  assert(endMs >= startMs, "End date must be greater than or equal to start date.");

  return new Date(startMs + Math.floor(rng() * (endMs - startMs + 1)));
}

function randomDateWithinLastDays(rng, days, anchor = new Date()) {
  return randomDateBetween(
    rng,
    new Date(anchor.getTime() - days * 24 * 60 * 60 * 1000),
    anchor
  );
}

function createSessionId(prefix, index) {
  return `${prefix}-${index.toString(36).padStart(3, "0")}`;
}

module.exports = {
  DEFAULT_DEMO_SEED,
  assert,
  createSeededRandom,
  createSessionId,
  pickDistinctWeighted,
  pickOne,
  randomDateBetween,
  randomDateWithinLastDays,
  randomFloat,
  randomInt,
  roundCurrency,
  shuffle,
  toMoneyString,
  weightedPick
};
