import { ANSWERS, type Answer, type Response } from './types.ts';
import { SKIP_TILT, type Model } from './likelihood.ts';

export interface AskedQuestion {
  qIndex: number;
  response: Response;
}

export interface SessionState {
  asked: AskedQuestion[];
}

export const CONFIG = {
  minQuestions: 16,
  maxQuestions: 32,
  /**
   * Naive Bayes treats every question as independent evidence, which they are not:
   * several questions probe one tenet, and tenets correlate. Left uncorrected the
   * belief spikes to near-certainty after a handful of answers and the stopping rule
   * fires on evidence that is not really there. Tempering the log-likelihood
   * discounts each question so confidence tracks the actual information.
   */
  likelihoodTemper: 0.55,
  /** Confidence the leader must reach, together with the margin below, to stop. */
  stopConfidence: 0.55,
  /** Leader must be at least this many times the runner-up. */
  stopMargin: 2.0,
  /** Below this expected information gain, no remaining question is worth asking. */
  minInformationGain: 0.02,
  /** Openers are drawn from tier 1 so the test does not start on mutual banking. */
  tier1Opening: 3,
  /** Every Nth question is chosen against a flattened belief, to re-test early branching. */
  antiRailroadEvery: 5,
  antiRailroadTemperature: 3.0,
  /** Candidate set for information gain: smallest prefix covering this much belief mass. */
  liveMass: 0.99,
  liveCap: 250,
  /** Two questions on one tenet whose expected rows correlate above this are redundant. */
  redundancyThreshold: 0.9,
};

export function initialState(): SessionState {
  return { asked: [] };
}

/** Recomputes the belief distribution from scratch. Pure, and cheap enough to do on every step. */
export function belief(model: Model, state: SessionState): Float64Array {
  const logP = new Float64Array(model.nI);
  logP.set(model.logPrior0);

  for (const { qIndex, response } of state.asked) {
    const qBase = qIndex * model.nI;
    if (response === 'skip') {
      const yes = Math.log(1 + SKIP_TILT) * CONFIG.likelihoodTemper;
      const no = Math.log(1 - SKIP_TILT / 2) * CONFIG.likelihoodTemper;
      for (let ii = 0; ii < model.nI; ii++) {
        logP[ii] += model.specified[qBase + ii] ? no : yes;
      }
    } else {
      const a = ANSWERS.indexOf(response);
      for (let ii = 0; ii < model.nI; ii++) {
        logP[ii] +=
          Math.log(model.lik[(qBase + ii) * ANSWERS.length + a] + 1e-12) *
          CONFIG.likelihoodTemper;
      }
    }
  }

  return normaliseLog(logP);
}

function normaliseLog(logP: Float64Array): Float64Array {
  let max = -Infinity;
  for (let i = 0; i < logP.length; i++) if (logP[i] > max) max = logP[i];
  const out = new Float64Array(logP.length);
  let total = 0;
  for (let i = 0; i < logP.length; i++) {
    const v = Math.exp(logP[i] - max);
    out[i] = v;
    total += v;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Indices holding the top `liveMass` of belief, capped. Sorted by descending belief. */
export function liveSet(p: Float64Array, cap = CONFIG.liveCap, mass = CONFIG.liveMass): number[] {
  const order = Array.from(p.keys()).sort((a, b) => p[b] - p[a]);
  const live: number[] = [];
  let acc = 0;
  for (const i of order) {
    live.push(i);
    acc += p[i];
    if (acc >= mass || live.length >= cap) break;
  }
  return live;
}

function entropy(p: Float64Array, live: number[]): number {
  let total = 0;
  for (const i of live) total += p[i];
  if (total <= 0) return 0;
  let h = 0;
  for (const i of live) {
    const q = p[i] / total;
    if (q > 0) h -= q * Math.log(q);
  }
  return h;
}

/** Expected reduction in entropy from asking `qIndex`. */
export function informationGain(
  model: Model,
  p: Float64Array,
  live: number[],
  qIndex: number,
): number {
  const h0 = entropy(p, live);
  const qBase = qIndex * model.nI;

  let mass = 0;
  for (const i of live) mass += p[i];
  if (mass <= 0) return 0;

  let expectedH = 0;
  for (let a = 0; a < ANSWERS.length; a++) {
    let pa = 0;
    for (const i of live) pa += (p[i] / mass) * model.lik[(qBase + i) * ANSWERS.length + a];
    if (pa <= 1e-12) continue;
    let h = 0;
    for (const i of live) {
      const post = ((p[i] / mass) * model.lik[(qBase + i) * ANSWERS.length + a]) / pa;
      if (post > 0) h -= post * Math.log(post);
    }
    expectedH += pa * h;
  }

  return h0 - expectedH;
}

function flatten(p: Float64Array, temperature: number): Float64Array {
  const out = new Float64Array(p.length);
  let total = 0;
  for (let i = 0; i < p.length; i++) {
    const v = Math.pow(p[i], 1 / temperature);
    out[i] = v;
    total += v;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Correlation between two questions' expected rows, used to skip near-duplicates. */
function redundant(model: Model, a: number, b: number): boolean {
  if (model.tenetOfQuestion[a] !== model.tenetOfQuestion[b]) return false;
  const baseA = a * model.nI;
  const baseB = b * model.nI;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < model.nI; i++) {
    const x = model.expected[baseA + i];
    const y = model.expected[baseB + i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na <= 1e-9 || nb <= 1e-9) return false;
  return dot / Math.sqrt(na * nb) >= CONFIG.redundancyThreshold;
}

export interface Selection {
  qIndex: number;
  gain: number;
}

/**
 * Picks the next question by expected information gain, with four modifiers:
 * tier pacing, tenet cooldown, the anti-railroad pass, and the redundancy guard.
 */
export function selectNext(
  model: Model,
  state: SessionState,
  p: Float64Array,
  options: { sampleCandidates?: number; rng?: () => number } = {},
): Selection | null {
  const asked = new Set(state.asked.map((a) => a.qIndex));
  const n = state.asked.length;
  const lastTenet =
    n > 0 ? model.tenetOfQuestion[state.asked[n - 1].qIndex] : -1;

  const live = liveSet(p);

  // Modifier 3: periodically choose against a flattened belief so that a wrong early
  // branch can still be escaped. Without this the test converges confidently on the
  // wrong answer whenever the first few answers are misread.
  const useFlattened =
    n >= CONFIG.antiRailroadEvery && n % CONFIG.antiRailroadEvery === 0;
  const scoringBelief = useFlattened ? flatten(p, CONFIG.antiRailroadTemperature) : p;
  const scoringLive = useFlattened ? liveSet(scoringBelief) : live;

  let candidates: number[] = [];
  for (let qi = 0; qi < model.nQ; qi++) {
    if (asked.has(qi)) continue;
    // Modifier 1: tier pacing.
    if (n < CONFIG.tier1Opening && model.kb.questions[qi].tier !== 1) continue;
    // Modifier 2: tenet cooldown.
    if (model.tenetOfQuestion[qi] === lastTenet) continue;
    // Modifier 4: redundancy guard.
    let dup = false;
    for (const a of asked) {
      if (redundant(model, qi, a)) {
        dup = true;
        break;
      }
    }
    if (dup) continue;
    candidates.push(qi);
  }

  if (candidates.length === 0) {
    for (let qi = 0; qi < model.nQ; qi++) if (!asked.has(qi)) candidates.push(qi);
  }
  if (candidates.length === 0) return null;

  // The simulation harness scores a sample rather than the whole bank, for speed.
  const sample = options.sampleCandidates;
  if (sample && candidates.length > sample) {
    const rng = options.rng ?? Math.random;
    const picked: number[] = [];
    const pool = candidates.slice();
    for (let k = 0; k < sample && pool.length > 0; k++) {
      const j = Math.floor(rng() * pool.length);
      picked.push(pool[j]);
      pool[j] = pool[pool.length - 1];
      pool.pop();
    }
    candidates = picked;
  }

  let best = -Infinity;
  let bestQ = -1;
  for (const qi of candidates) {
    const g = informationGain(model, scoringBelief, scoringLive, qi);
    if (g > best) {
      best = g;
      bestQ = qi;
    }
  }
  if (bestQ < 0) return null;

  // Report the gain against the true belief, so the stopping rule is not fooled by a
  // flattened-pass score.
  const trueGain = useFlattened ? informationGain(model, p, live, bestQ) : best;
  return { qIndex: bestQ, gain: trueGain };
}

export interface StopDecision {
  stop: boolean;
  reason: 'confident' | 'exhausted' | 'cap' | 'continue';
}

export function shouldStop(
  state: SessionState,
  p: Float64Array,
  nextGain: number | null,
): StopDecision {
  const n = state.asked.length;
  if (n >= CONFIG.maxQuestions) return { stop: true, reason: 'cap' };
  if (nextGain === null) return { stop: true, reason: 'exhausted' };
  if (n < CONFIG.minQuestions) return { stop: false, reason: 'continue' };

  const sorted = Array.from(p).sort((a, b) => b - a);
  const top = sorted[0] ?? 0;
  const second = sorted[1] ?? 0;
  if (top >= CONFIG.stopConfidence && top >= CONFIG.stopMargin * second) {
    return { stop: true, reason: 'confident' };
  }
  if (nextGain < CONFIG.minInformationGain) return { stop: true, reason: 'exhausted' };
  return { stop: false, reason: 'continue' };
}

export function answerIndex(a: Answer): number {
  return ANSWERS.indexOf(a);
}
