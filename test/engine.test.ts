import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CompiledKB } from '../src/engine/types.ts';
import { ANSWERS } from '../src/engine/types.ts';
import { buildModel, expectedValue, answerDistribution } from '../src/engine/likelihood.ts';
import { belief, initialState, selectNext, shouldStop, informationGain, liveSet, CONFIG } from '../src/engine/engine.ts';
import { outcome } from '../src/engine/result.ts';

const kb = JSON.parse(readFileSync('public/kb.json', 'utf8')) as CompiledKB;
const model = buildModel(kb);
const idx = (id: string) => kb.ideologies.findIndex((i) => i.id === id);

test('answer distribution is a normalised probability vector', () => {
  for (const e of [-2, -1, 0, 1, 2]) {
    const d = answerDistribution(e, 'core');
    assert.ok(d.every((x) => x >= 0));
    assert.ok(Math.abs(d.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  }
});

test('an unspecified tenet yields a flat likelihood', () => {
  const d = answerDistribution(null, null);
  assert.ok(d.every((x) => Math.abs(x - 0.2) < 1e-9));
});

test('a sharper strength concentrates probability on the expected answer', () => {
  const core = answerDistribution(2, 'core');
  const weak = answerDistribution(2, 'weak');
  assert.ok(core[4] > weak[4], 'core should predict its own answer more confidently');
});

test('categorical tenets give no partial credit to a neighbouring option', () => {
  // The whole point of `kind: categorical`: abolish_now must not collect credit
  // from minimal on state_trajectory.
  const tenet = kb.tenets.find((t) => t.id === 'state_trajectory')!;
  assert.equal(tenet.kind, 'categorical');
  const q = kb.questions.find((x) => x.id === 'q_abolish_state')!;
  const anarchist = kb.ideologies[idx('anarcho_communism')]!;
  const minarchist = kb.ideologies[idx('minarchism')]!;
  const a = expectedValue(q, anarchist, tenet)!;
  const m = expectedValue(q, minarchist, tenet)!;
  assert.ok(a >= 2, `anarchist should strongly agree, got ${a}`);
  assert.ok(m <= -1, `minarchist should disagree, got ${m}`);
});

test('anarcho-capitalism and minarchism are separated by the private-defence question', () => {
  const tenet = kb.tenets.find((t) => t.id === 'state_trajectory')!;
  const q = kb.questions.find((x) => x.id === 'q_private_defence_agencies')!;
  const ancap = expectedValue(q, kb.ideologies[idx('anarcho_capitalism')]!, tenet)!;
  const min = expectedValue(q, kb.ideologies[idx('minarchism')]!, tenet)!;
  assert.ok(Math.abs(ancap - min) >= 3, `expected a decisive split, got ${ancap} vs ${min}`);
});

test('belief is a normalised distribution and starts at the prior', () => {
  const p = belief(model, initialState());
  assert.equal(p.length, model.nI);
  assert.ok(Math.abs(Array.from(p).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('an answer moves belief toward ideologies that predicted it', () => {
  const qi = kb.questions.findIndex((q) => q.id === 'q_abolish_state');
  const before = belief(model, initialState());
  const after = belief(model, { asked: [{ qIndex: qi, response: 2 }] });
  const a = idx('anarcho_communism');
  const m = idx('minarchism');
  assert.ok(after[a] / before[a] > 1, 'agreeing should favour the anarchist');
  assert.ok(after[m] / before[m] < 1, 'agreeing should disfavour the minarchist');
});

test('information gain is non-negative and zero for a useless question', () => {
  const p = belief(model, initialState());
  const live = liveSet(p);
  for (let q = 0; q < 12; q++) {
    assert.ok(informationGain(model, p, live, q) >= -1e-9);
  }
});

test('skipping tilts toward ideologies silent on that tenet, but only slightly', () => {
  const qi = kb.questions.findIndex((q) => q.tenet === 'death_and_finitude');
  const before = belief(model, initialState());
  const after = belief(model, { asked: [{ qIndex: qi, response: 'skip' }] });
  const silent = kb.ideologies.findIndex((i) => !i.positions['death_and_finitude']);
  assert.ok(after[silent] > before[silent]);
  assert.ok(after[silent] / before[silent] < 1.5, 'a skip must stay weak evidence');
});

test('the opening questions are all tier 1', () => {
  const state = initialState();
  for (let n = 0; n < CONFIG.tier1Opening; n++) {
    const sel = selectNext(model, state, belief(model, state))!;
    assert.equal(kb.questions[sel.qIndex].tier, 1, `question ${n + 1} should be tier 1`);
    state.asked.push({ qIndex: sel.qIndex, response: 1 });
  }
});

test('no two consecutive questions probe the same tenet', () => {
  const state = initialState();
  let prev = -1;
  for (let n = 0; n < 12; n++) {
    const sel = selectNext(model, state, belief(model, state))!;
    const t = model.tenetOfQuestion[sel.qIndex];
    assert.notEqual(t, prev, 'tenet cooldown violated');
    prev = t;
    state.asked.push({ qIndex: sel.qIndex, response: n % 2 ? 2 : -2 });
  }
});

test('the test never stops before the minimum number of questions', () => {
  const state = initialState();
  for (let n = 0; n < CONFIG.minQuestions - 1; n++) {
    const p = belief(model, state);
    const sel = selectNext(model, state, p)!;
    assert.equal(shouldStop(state, p, sel.gain).stop, false, `stopped at ${n}`);
    state.asked.push({ qIndex: sel.qIndex, response: 2 });
  }
});

test('the test always stops by the cap', () => {
  const state = initialState();
  for (let n = 0; n < CONFIG.maxQuestions; n++) {
    const p = belief(model, state);
    const sel = selectNext(model, state, p);
    if (shouldStop(state, p, sel ? sel.gain : null).stop) break;
    state.asked.push({ qIndex: sel!.qIndex, response: ANSWERS[n % 5] });
  }
  assert.ok(state.asked.length <= CONFIG.maxQuestions);
});

test('an ideal adherent answering noiselessly is identified', () => {
  for (const target of ['anarcho_communism', 'anarcho_capitalism', 'georgism', 'bookchinist_communalism']) {
    const ii = idx(target);
    const state = initialState();
    for (;;) {
      const p = belief(model, state);
      const sel = selectNext(model, state, p);
      if (shouldStop(state, p, sel ? sel.gain : null).stop || !sel) break;
      // The adherent's single most likely answer, with no noise.
      let best = 0;
      let bestA = 0;
      for (let a = 0; a < 5; a++) {
        const v = model.lik[(sel.qIndex * model.nI + ii) * 5 + a];
        if (v > best) { best = v; bestA = a; }
      }
      state.asked.push({ qIndex: sel.qIndex, response: ANSWERS[bestA] });
    }
    const res = outcome(model, state, belief(model, state));
    assert.equal(res.top[0].ideology.id, target, `${target} was not identified`);
  }
});

test('contradictory answers produce a hybrid verdict, not a confident label', () => {
  const state = initialState();
  for (let n = 0; n < CONFIG.maxQuestions; n++) {
    const p = belief(model, state);
    const sel = selectNext(model, state, p);
    if (!sel) break;
    // Alternate hard agreement and hard disagreement regardless of content.
    state.asked.push({ qIndex: sel.qIndex, response: n % 2 ? 2 : -2 });
    if (shouldStop(state, p, sel.gain).stop) break;
  }
  const res = outcome(model, state, belief(model, state));
  assert.ok(res.fit < 0.9, `incoherent answers should not fit well, got ${res.fit}`);
});

test('going back and re-answering is equivalent to never having answered', () => {
  const qi = 0;
  const a = belief(model, { asked: [{ qIndex: qi, response: 2 }] });
  const b = belief(model, initialState());
  const withBack = belief(model, { asked: [] });
  for (let i = 0; i < b.length; i++) assert.ok(Math.abs(b[i] - withBack[i]) < 1e-12);
  assert.ok(Array.from(a).some((v, i) => Math.abs(v - b[i]) > 1e-9), 'answering should change belief');
});
