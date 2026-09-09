/**
 * Simulation harness. For each ideology, simulate an ideal adherent answering
 * according to that ideology's own profile plus noise, run the full test, and
 * measure whether the engine finds them again.
 *
 * The confusion output is the authoring backlog: it names the pairs that still
 * need a discriminating question written.
 *
 *   node scripts/simulate.ts [--runs N] [--noise 0.2] [--quick]
 */
import { readFileSync } from 'node:fs';
import { ANSWERS, type Answer } from '../src/engine/types.ts';
import type { CompiledKB } from '../src/engine/types.ts';
import { buildModel } from '../src/engine/likelihood.ts';
import { belief, initialState, selectNext, shouldStop, CONFIG } from '../src/engine/engine.ts';
import { outcome } from '../src/engine/result.ts';

const arg = (name: string, dflt: number) => {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const quick = process.argv.includes('--quick');
const RUNS = arg('runs', quick ? 3 : 10);
const NOISE = arg('noise', 0.15);
const SAMPLE = arg('sample', 70);

const kb = JSON.parse(readFileSync('src/generated/kb.json', 'utf8')) as CompiledKB;
const model = buildModel(kb);

// Deterministic RNG so runs are reproducible.
let seed = 0x2f6e2b1;
function rng(): number {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
}

/** Sample an answer the way an adherent of `ii` would give it, with noise. */
function sampleAnswer(qIndex: number, ii: number): Answer {
  if (rng() < NOISE) return ANSWERS[Math.floor(rng() * ANSWERS.length)];
  const base = (qIndex * model.nI + ii) * ANSWERS.length;
  let r = rng();
  for (let a = 0; a < ANSWERS.length; a++) {
    r -= model.lik[base + a];
    if (r <= 0) return ANSWERS[a];
  }
  return 0;
}

interface Row {
  id: string;
  name: string;
  family: string;
  top1: number;
  top3: number;
  questions: number;
  hybrid: number;
  confusedWith: Map<string, number>;
}

const rows: Row[] = [];
const started = Date.now();

for (let ii = 0; ii < model.nI; ii++) {
  const ideology = kb.ideologies[ii];
  const row: Row = {
    id: ideology.id,
    name: ideology.name,
    family: ideology.family,
    top1: 0,
    top3: 0,
    questions: 0,
    hybrid: 0,
    confusedWith: new Map(),
  };

  for (let run = 0; run < RUNS; run++) {
    const state = initialState();
    for (;;) {
      const p = belief(model, state);
      const sel = selectNext(model, state, p, { sampleCandidates: SAMPLE, rng });
      const stop = shouldStop(state, p, sel ? sel.gain : null);
      if (stop.stop || !sel) break;
      state.asked.push({ qIndex: sel.qIndex, response: sampleAnswer(sel.qIndex, ii) });
    }

    const p = belief(model, state);
    const res = outcome(model, state, p);
    const top = res.top.map((c) => c.ideology.id);
    if (top[0] === ideology.id) row.top1++;
    if (top.includes(ideology.id)) row.top3++;
    else row.confusedWith.set(top[0]!, (row.confusedWith.get(top[0]!) ?? 0) + 1);
    if (res.hybrid) row.hybrid++;
    row.questions += state.asked.length;
  }

  row.questions /= RUNS;
  rows.push(row);

  if ((ii + 1) % 50 === 0) {
    process.stderr.write(`  ${ii + 1}/${model.nI} ideologies simulated\n`);
  }
}

const n = rows.length;
const top1 = rows.reduce((s, r) => s + r.top1 / RUNS, 0) / n;
const top3 = rows.reduce((s, r) => s + r.top3 / RUNS, 0) / n;
const meanQ = rows.reduce((s, r) => s + r.questions, 0) / n;
const hybridRate = rows.reduce((s, r) => s + r.hybrid / RUNS, 0) / n;

console.log('');
console.log(`runs/ideology ${RUNS}   answer noise ${(NOISE * 100).toFixed(0)}%   ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(`ideologies ${n}   questions in bank ${model.nQ}`);
console.log('');
console.log(`  top-1 accuracy   ${(top1 * 100).toFixed(1)}%`);
console.log(`  top-3 accuracy   ${(top3 * 100).toFixed(1)}%`);
console.log(`  mean questions   ${meanQ.toFixed(1)}`);
console.log(`  hybrid verdicts  ${(hybridRate * 100).toFixed(1)}%`);

const worst = rows.filter((r) => r.top3 / RUNS < 0.5).sort((a, b) => a.top3 - b.top3);
console.log(`\n  WEAKEST ENTRIES (top-3 under 50%): ${worst.length}`);
for (const r of worst.slice(0, 30)) {
  const confusion = [...r.confusedWith.entries()].sort((a, b) => b[1] - a[1])[0];
  const with_ = confusion ? ` -> mostly ${confusion[0]}` : '';
  console.log(`    ${(r.top3 / RUNS * 100).toFixed(0).padStart(3)}%  ${r.id}${with_}`);
}
if (worst.length > 30) console.log(`    ... and ${worst.length - 30} more`);

const byFamily = new Map<string, { t1: number; t3: number; n: number }>();
for (const r of rows) {
  const f = byFamily.get(r.family) ?? { t1: 0, t3: 0, n: 0 };
  f.t1 += r.top1 / RUNS;
  f.t3 += r.top3 / RUNS;
  f.n++;
  byFamily.set(r.family, f);
}
console.log('\n  BY FAMILY (top-1 / top-3)');
for (const [f, v] of [...byFamily.entries()].sort((a, b) => a[1].t3 / a[1].n - b[1].t3 / b[1].n)) {
  console.log(`    ${((v.t1 / v.n) * 100).toFixed(0).padStart(3)}% / ${((v.t3 / v.n) * 100).toFixed(0).padStart(3)}%  ${f} (${v.n})`);
}
