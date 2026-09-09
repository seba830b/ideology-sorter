/**
 * Compiles kb/*.yaml into src/generated/kb.json and validates it.
 *
 * The validation is the point: the build failures are the authoring task list.
 * Run with --strict to turn warnings into errors (used in CI).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import type { CompiledKB, Ideology, Question, Tenet } from '../src/engine/types.ts';
import { buildModel } from '../src/engine/likelihood.ts';

const KB = 'kb';
const OUT = 'public';
const strict = process.argv.includes('--strict');

const errors: string[] = [];
const warnings: string[] = [];

// ---------------------------------------------------------------- tenets
const rawTenets = YAML.parse(readFileSync(join(KB, 'tenets.yaml'), 'utf8')) as Record<
  string,
  { label?: string; kind: string; options: string[] }
>;

const tenets: Tenet[] = Object.entries(rawTenets).map(([id, t]) => {
  if (t.kind !== 'ordered' && t.kind !== 'categorical') {
    errors.push(`tenet ${id}: kind must be "ordered" or "categorical", got "${t.kind}"`);
  }
  if (new Set(t.options).size !== t.options.length) {
    errors.push(`tenet ${id}: duplicate options`);
  }
  return { id, label: t.label ?? id, kind: t.kind as Tenet['kind'], options: t.options };
});
const tenetById = new Map(tenets.map((t) => [t.id, t]));

// ------------------------------------------------------------ ideologies
const ideologies: Ideology[] = [];
const families: { id: string; label: string }[] = [];

for (const file of readdirSync(join(KB, 'ideologies')).sort()) {
  const doc = YAML.parse(readFileSync(join(KB, 'ideologies', file), 'utf8'));
  families.push({ id: doc.family, label: doc.label });

  // Family defaults are an authoring shorthand for the tenet sweep: positions that
  // hold across a family unless a member says otherwise. They expand into ordinary
  // per-ideology positions here, so the engine never knows families exist.
  const defaults: Record<string, [string, string]> = {};
  for (const [tenetId, spec] of Object.entries(doc.family_defaults ?? {})) {
    defaults[tenetId] = spec as [string, string];
  }

  for (const entry of doc.ideologies) {
    const positions: Ideology['positions'] = {};
    const merged: Record<string, unknown> = { ...defaults, ...(entry.positions ?? {}) };
    for (const [tenetId, spec] of Object.entries(merged)) {
      const tenet = tenetById.get(tenetId);
      if (!tenet) {
        errors.push(`${entry.id}: unknown tenet "${tenetId}"`);
        continue;
      }
      const [value, strength] = Array.isArray(spec)
        ? (spec as [string, string])
        : [(spec as any).value, (spec as any).strength];
      if (!tenet.options.includes(value)) {
        errors.push(`${entry.id}.${tenetId}: unknown option "${value}"`);
        continue;
      }
      if (!['core', 'strong', 'typical', 'weak'].includes(strength)) {
        errors.push(`${entry.id}.${tenetId}: bad strength "${strength}"`);
        continue;
      }
      positions[tenetId] = { value, strength: strength as any };
    }

    ideologies.push({
      id: entry.id,
      name: entry.name,
      aliases: entry.aliases ?? [],
      family: doc.family,
      priorWeight: entry.prior_weight ?? 0.1,
      positions,
      blurb: entry.blurb ?? '',
      reading: entry.reading,
    });
  }
}

const ids = new Set<string>();
for (const i of ideologies) {
  if (ids.has(i.id)) errors.push(`duplicate ideology id: ${i.id}`);
  ids.add(i.id);
  // Too thin to ever win a run.
  if (Object.keys(i.positions).length < 6) {
    warnings.push(`${i.id}: only ${Object.keys(i.positions).length} positions (min 6)`);
  }
}

// -------------------------------------------------------------- questions
const questions: Question[] = [];
for (const file of readdirSync(join(KB, 'questions')).sort()) {
  const doc = YAML.parse(readFileSync(join(KB, 'questions', file), 'utf8'));
  for (const q of doc.questions) {
    const tenet = tenetById.get(q.tenet);
    if (!tenet) {
      errors.push(`question ${q.id}: unknown tenet "${q.tenet}"`);
      continue;
    }
    for (const [opt, v] of Object.entries(q.expected ?? {})) {
      if (!tenet.options.includes(opt)) {
        errors.push(`question ${q.id}: option "${opt}" not in tenet ${q.tenet}`);
      }
      if (typeof v !== 'number' || v < -2 || v > 2) {
        errors.push(`question ${q.id}: expected value for "${opt}" must be in [-2,2]`);
      }
    }
    questions.push({
      id: q.id,
      tenet: q.tenet,
      tier: q.tier ?? 2,
      prompt: String(q.prompt).trim(),
      expected: q.expected ?? {},
    });
  }
}

const qids = new Set<string>();
for (const q of questions) {
  if (qids.has(q.id)) errors.push(`duplicate question id: ${q.id}`);
  qids.add(q.id);
}

// Orphan questions: probe a tenet no ideology takes a position on.
const usedTenets = new Set<string>();
for (const i of ideologies) for (const t of Object.keys(i.positions)) usedTenets.add(t);
for (const q of questions) {
  if (!usedTenets.has(q.tenet)) warnings.push(`question ${q.id}: tenet ${q.tenet} used by no ideology`);
}
for (const t of tenets) {
  if (!questions.some((q) => q.tenet === t.id)) {
    warnings.push(`tenet ${t.id}: no question probes it`);
  }
}

if (errors.length) {
  console.error('\nKB VALIDATION FAILED\n');
  for (const e of errors) console.error('  ERROR  ' + e);
  process.exit(1);
}

const kb: CompiledKB = { tenets, ideologies, questions, families };

// ---------------------------------------------- dominated & confusable pairs
const model = buildModel(kb);
const nI = model.nI;

const dominated: string[] = [];
const signature = (i: Ideology) =>
  Object.entries(i.positions)
    .map(([k, v]) => `${k}=${v.value}`)
    .sort()
    .join('|');
const bySig = new Map<string, string[]>();
for (const i of ideologies) {
  const s = signature(i);
  bySig.set(s, [...(bySig.get(s) ?? []), i.id]);
}
for (const [, group] of bySig) {
  if (group.length > 1) dominated.push(group.join(' == '));
}

// Confusability. Two measures, because they catch different failures:
//   peak       - the best any SINGLE question does. Low peak means no one question
//                is decisive, which is survivable.
//   separation - Euclidean distance across the WHOLE bank. Low separation means the
//                bank genuinely cannot tell them apart, which is not survivable.
const MIN_SEPARATION = 2.5;
const pairs: { a: string; b: string; sep: number; peak: number }[] = [];
for (let a = 0; a < nI; a++) {
  for (let b = a + 1; b < nI; b++) {
    let sumSq = 0;
    let peak = 0;
    for (let q = 0; q < model.nQ; q++) {
      const d = model.expected[q * nI + a] - model.expected[q * nI + b];
      sumSq += d * d;
      const ad = Math.abs(d);
      if (ad > peak) peak = ad;
    }
    const sep = Math.sqrt(sumSq);
    if (sep < MIN_SEPARATION) {
      pairs.push({ a: ideologies[a].id, b: ideologies[b].id, sep: Number(sep.toFixed(2)), peak: Number(peak.toFixed(1)) });
    }
  }
}
pairs.sort((x, y) => x.sep - y.sep);
const unseparable = pairs;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'kb.json'), JSON.stringify(kb));
const bytes = JSON.stringify(kb).length;

console.log(`kb: ${tenets.length} tenets, ${ideologies.length} ideologies across ${families.length} families, ${questions.length} questions`);
console.log(`    compiled to ${OUT}/kb.json (${(bytes / 1024).toFixed(0)} KB)`);

if (dominated.length) {
  console.log(`\n  DOMINATED (identical position sets): ${dominated.length}`);
  for (const d of dominated.slice(0, 20)) console.log('    ' + d);
}
if (unseparable.length) {
  console.log(`\n  UNSEPARABLE PAIRS (separation < ${MIN_SEPARATION} across the whole bank): ${unseparable.length}`);
  for (const p of unseparable.slice(0, 30)) console.log(`    ${p.a} / ${p.b}  (sep ${p.sep}, peak ${p.peak})`);
  if (unseparable.length > 30) console.log(`    ... and ${unseparable.length - 30} more`);
}
if (warnings.length) {
  console.log(`\n  WARNINGS: ${warnings.length}`);
  for (const w of warnings.slice(0, 25)) console.log('    ' + w);
  if (warnings.length > 25) console.log(`    ... and ${warnings.length - 25} more`);
}

if (strict && (dominated.length || unseparable.length || warnings.length)) {
  console.error('\n--strict: failing on warnings/unseparable pairs');
  process.exit(1);
}
