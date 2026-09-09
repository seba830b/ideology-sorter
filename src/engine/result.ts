import { ANSWERS } from './types.ts';
import type { Ideology } from './types.ts';
import { SKIP_TILT, type Model } from './likelihood.ts';
import type { SessionState } from './engine.ts';

export interface Candidate {
  ideology: Ideology;
  probability: number;
  familyLabel: string;
}

export interface DecidingAnswer {
  prompt: string;
  response: number | 'skip';
  /** Log-likelihood-ratio contribution to leader-over-runner-up. Positive favours the leader. */
  weight: number;
}

export interface Outcome {
  top: Candidate[];
  /** Geometric mean of how well the leader predicted the actual answers, in [0,1]. */
  fit: number;
  /** True when no ideology explains the answers well enough to name a single one. */
  hybrid: boolean;
  deciding: DecidingAnswer[];
  nearMisses: Candidate[];
  questionsAsked: number;
}

/** Below this, the leader is not explaining the answers well enough to be asserted. */
export const HYBRID_FIT_THRESHOLD = 0.45;

function likelihoodOf(model: Model, qIndex: number, ii: number, response: number | 'skip'): number {
  if (response === 'skip') {
    return model.specified[qIndex * model.nI + ii] ? 1 - SKIP_TILT / 2 : 1 + SKIP_TILT;
  }
  const a = ANSWERS.indexOf(response as (typeof ANSWERS)[number]);
  return model.lik[(qIndex * model.nI + ii) * ANSWERS.length + a];
}

function bestLikelihood(model: Model, qIndex: number, ii: number): number {
  let best = 0;
  for (let a = 0; a < ANSWERS.length; a++) {
    const v = model.lik[(qIndex * model.nI + ii) * ANSWERS.length + a];
    if (v > best) best = v;
  }
  return best;
}

export function outcome(model: Model, state: SessionState, p: Float64Array): Outcome {
  const familyLabel = new Map(model.kb.families.map((f) => [f.id, f.label]));
  const order = Array.from(p.keys()).sort((a, b) => p[b] - p[a]);

  const toCandidate = (ii: number): Candidate => ({
    ideology: model.kb.ideologies[ii],
    probability: p[ii],
    familyLabel: familyLabel.get(model.kb.ideologies[ii].family) ?? model.kb.ideologies[ii].family,
  });

  const top = order.slice(0, 3).map(toCandidate);
  const nearMisses = order.slice(3, 6).map(toCandidate);

  const leader = order[0];
  const runnerUp = order[1] ?? order[0];

  // How well did the leader actually predict what the user said? A low value means the
  // answers do not sit inside any one tradition, which is a real result, not a failure.
  let logFit = 0;
  let counted = 0;
  for (const { qIndex, response } of state.asked) {
    if (response === 'skip') continue;
    const got = likelihoodOf(model, qIndex, leader, response);
    const best = bestLikelihood(model, qIndex, leader);
    if (best <= 0) continue;
    logFit += Math.log(Math.max(got / best, 1e-6));
    counted++;
  }
  const fit = counted > 0 ? Math.exp(logFit / counted) : 1;

  const deciding: DecidingAnswer[] = state.asked
    .map(({ qIndex, response }) => ({
      prompt: model.kb.questions[qIndex].prompt,
      response,
      weight:
        Math.log(likelihoodOf(model, qIndex, leader, response) + 1e-12) -
        Math.log(likelihoodOf(model, qIndex, runnerUp, response) + 1e-12),
    }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 4);

  return {
    top,
    fit,
    hybrid: fit < HYBRID_FIT_THRESHOLD || (top[0]?.probability ?? 0) < 0.2,
    deciding,
    nearMisses,
    questionsAsked: state.asked.length,
  };
}
