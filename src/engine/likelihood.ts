import { ANSWERS } from './types.ts';
import type { CompiledKB, Ideology, Question, Strength, Tenet } from './types.ts';

/**
 * Spread of the answer distribution around an ideology's expected value.
 * `core` means adherents essentially never deviate, so disagreement eliminates the
 * candidate outright; `weak` means the position is only a tendency.
 */
const SIGMA: Record<Strength, number> = { core: 0.75, strong: 1.05, typical: 1.45, weak: 2.0 };

/**
 * Width, in option-index units, over which an ORDERED tenet's position is smeared onto
 * its neighbours. Categorical tenets never smear: that is what stops `abolish_now` from
 * collecting partial credit for `minimal`.
 */
const SMEAR: Record<Strength, number> = { core: 0.0, strong: 0.3, typical: 0.6, weak: 1.0 };

/** Weight given to abstention as evidence that an ideology is silent on a tenet. */
export const SKIP_TILT = 0.35;

/**
 * The Likert value this ideology's adherents are expected to give to this question,
 * or null when the ideology takes no position on the question's tenet.
 */
export function expectedValue(q: Question, ideology: Ideology, tenet: Tenet): number | null {
  const pos = ideology.positions[q.tenet];
  if (!pos) return null;

  if (tenet.kind === 'categorical') {
    return q.expected[pos.value] ?? 0;
  }

  const idx = tenet.options.indexOf(pos.value);
  if (idx < 0) return q.expected[pos.value] ?? 0;

  const s = SMEAR[pos.strength];
  if (s <= 0) return q.expected[tenet.options[idx]] ?? 0;

  let num = 0;
  let den = 0;
  for (let j = 0; j < tenet.options.length; j++) {
    const d = j - idx;
    const w = Math.exp(-(d * d) / (2 * s * s));
    num += w * (q.expected[tenet.options[j]] ?? 0);
    den += w;
  }
  return num / den;
}

/** P(answer | ideology) over the five Likert positions, normalised. */
export function answerDistribution(e: number | null, strength: Strength | null): number[] {
  if (e === null || strength === null) return ANSWERS.map(() => 1 / ANSWERS.length);
  const sigma = SIGMA[strength];
  const raw = ANSWERS.map((a) => Math.exp(-((a - e) * (a - e)) / (2 * sigma * sigma)));
  const total = raw.reduce((x, y) => x + y, 0);
  return raw.map((w) => w / total);
}

export interface Model {
  kb: CompiledKB;
  nI: number;
  nQ: number;
  /** nQ * nI * 5 probabilities. */
  lik: Float32Array;
  /** nQ * nI, 1 when the ideology takes a position on that question's tenet. */
  specified: Uint8Array;
  /** nQ * nI expected Likert values (0 where unspecified). Used by the confusability check. */
  expected: Float32Array;
  logPrior0: Float64Array;
  tenetOfQuestion: Int32Array;
}

export function buildModel(kb: CompiledKB): Model {
  const nI = kb.ideologies.length;
  const nQ = kb.questions.length;
  const lik = new Float32Array(nQ * nI * ANSWERS.length);
  const specified = new Uint8Array(nQ * nI);
  const expected = new Float32Array(nQ * nI);
  const tenetOfQuestion = new Int32Array(nQ);

  const tenetById = new Map(kb.tenets.map((t) => [t.id, t]));
  const tenetIndex = new Map(kb.tenets.map((t, i) => [t.id, i]));

  for (let qi = 0; qi < nQ; qi++) {
    const q = kb.questions[qi];
    const tenet = tenetById.get(q.tenet);
    if (!tenet) throw new Error(`question ${q.id} references unknown tenet ${q.tenet}`);
    tenetOfQuestion[qi] = tenetIndex.get(q.tenet) ?? -1;

    for (let ii = 0; ii < nI; ii++) {
      const ideology = kb.ideologies[ii];
      const pos = ideology.positions[q.tenet];
      const e = expectedValue(q, ideology, tenet);
      const dist = answerDistribution(e, pos ? pos.strength : null);
      const base = (qi * nI + ii) * ANSWERS.length;
      for (let a = 0; a < ANSWERS.length; a++) lik[base + a] = dist[a];
      specified[qi * nI + ii] = pos ? 1 : 0;
      expected[qi * nI + ii] = e ?? 0;
    }
  }

  const logPrior0 = new Float64Array(nI);
  let totalWeight = 0;
  for (const ideology of kb.ideologies) totalWeight += Math.max(ideology.priorWeight, 1e-6);
  for (let ii = 0; ii < nI; ii++) {
    logPrior0[ii] = Math.log(Math.max(kb.ideologies[ii].priorWeight, 1e-6) / totalWeight);
  }

  return { kb, nI, nQ, lik, specified, expected, logPrior0, tenetOfQuestion };
}
