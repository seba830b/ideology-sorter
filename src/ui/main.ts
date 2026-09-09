import type { CompiledKB, Response } from '../engine/types.ts';
import { buildModel, type Model } from '../engine/likelihood.ts';
import { belief, initialState, selectNext, shouldStop, liveSet, CONFIG, type SessionState } from '../engine/engine.ts';
import { outcome, type Outcome, type Candidate } from '../engine/result.ts';

const app = document.getElementById('app')!;
const STORAGE_KEY = 'ideology-sorter-progress';

let model: Model;
let state: SessionState = initialState();
let pending: { qIndex: number } | null = null;

const ANSWER_LABELS: { v: Response; label: string; key: string }[] = [
  { v: 2, label: 'Strongly agree', key: '1' },
  { v: 1, label: 'Agree', key: '2' },
  { v: 0, label: 'Neutral', key: '3' },
  { v: -1, label: 'Disagree', key: '4' },
  { v: -2, label: 'Strongly disagree', key: '5' },
];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// localStorage can throw outright in some contexts, so every access is guarded.
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.asked));
  } catch {
    /* private mode, blocked storage - progress simply is not kept */
  }
}
function load(): SessionState['asked'] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}
function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

async function boot() {
  app.innerHTML = '<div class="loading">Loading&#8230;</div>';
  const res = await fetch(`${import.meta.env.BASE_URL}kb.json`);
  const kb = (await res.json()) as CompiledKB;
  model = buildModel(kb);
  const resumed = load();
  if (resumed) {
    state = { asked: resumed };
    renderResumePrompt();
  } else {
    renderIntro();
  }
}

function renderIntro() {
  const kb = model.kb;
  app.innerHTML = `
    <div class="intro">
      <h1>Ideology Sorter</h1>
      <p class="lede">A political test that adapts. Every answer narrows the field, and the next
      question is chosen to divide whatever is still standing &mdash; so no two people take the same test.</p>
      <div class="stat-row">
        <div class="stat"><b>${kb.ideologies.length}</b><span>ideologies</span></div>
        <div class="stat"><b>${kb.questions.length}</b><span>questions in bank</span></div>
        <div class="stat"><b>~${CONFIG.minQuestions}&ndash;${CONFIG.maxQuestions}</b><span>you will be asked</span></div>
        <div class="stat"><b>${kb.families.length}</b><span>traditions</span></div>
      </div>
      <p class="small muted">It covers the obvious ones and a great many that are not: Georgism,
      mutualism, Bookchinist communalism, Freiwirtschaft, Posadism, Sultan-Galievism, panarchism,
      political Confucianism, Russian Cosmism. Answer honestly &mdash; it is trying to find where
      you actually sit, not where you would like to.</p>
      <p><button class="btn" id="start">Begin</button></p>
    </div>`;
  document.getElementById('start')!.addEventListener('click', () => {
    state = initialState();
    clearSaved();
    step();
  });
}

function renderResumePrompt() {
  app.innerHTML = `
    <div class="intro">
      <h1>Welcome back</h1>
      <p class="lede">You were ${state.asked.length} question${state.asked.length === 1 ? '' : 's'}
      into a test. Pick up where you left off?</p>
      <p style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn" id="resume">Continue</button>
        <button class="btn ghost" id="restart">Start over</button>
      </p>
    </div>`;
  document.getElementById('resume')!.addEventListener('click', () => step());
  document.getElementById('restart')!.addEventListener('click', () => {
    state = initialState();
    clearSaved();
    renderIntro();
  });
}

/** Advances the test: recompute belief, pick or stop. */
function step() {
  const p = belief(model, state);
  const sel = selectNext(model, state, p);
  const stop = shouldStop(state, p, sel ? sel.gain : null);

  if (stop.stop || !sel) {
    clearSaved();
    renderResult(outcome(model, state, p));
    return;
  }
  pending = { qIndex: sel.qIndex };
  renderQuestion(sel.qIndex, p);
}

function renderQuestion(qIndex: number, p: Float64Array) {
  const q = model.kb.questions[qIndex];
  const tenet = model.kb.tenets.find((t) => t.id === q.tenet);
  const n = state.asked.length + 1;
  const remaining = liveSet(p, 5000, 0.995).length;
  // Progress is bounded below by the minimum, so the bar never claims to be nearly
  // done while the engine is still genuinely undecided.
  const pct = Math.min(100, Math.round((state.asked.length / CONFIG.minQuestions) * 100));

  app.innerHTML = `
    <div class="qhead">
      <span class="qcount">Question ${n}</span>
      <span class="narrowing">${remaining} ideologies still in play</span>
    </div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <span class="tenet-tag">${esc(tenet?.label ?? '')}</span>
    <h2 class="prompt">${esc(q.prompt)}</h2>
    <div class="answers">
      ${ANSWER_LABELS.map(
        (a) => `<button class="ans" data-v="${a.v}"><kbd>${a.key}</kbd><span class="dot"></span>${a.label}</button>`,
      ).join('')}
      <button class="ans skip" data-v="skip"><kbd>0</kbd>No opinion &mdash; skip</button>
    </div>
    <div class="qfoot">
      ${state.asked.length ? '<button class="linkish" id="back">Back</button>' : ''}
      <span class="tiny muted">Keys 1&ndash;5, or 0 to skip</span>
    </div>`;

  for (const el of Array.from(app.querySelectorAll<HTMLButtonElement>('.ans'))) {
    el.addEventListener('click', () => {
      const raw = el.dataset.v!;
      answer(raw === 'skip' ? 'skip' : (Number(raw) as Response));
    });
  }
  document.getElementById('back')?.addEventListener('click', goBack);
}

function answer(response: Response) {
  if (!pending) return;
  state.asked.push({ qIndex: pending.qIndex, response });
  pending = null;
  save();
  step();
}

function goBack() {
  state.asked.pop();
  save();
  step();
}

function candidateRow(c: Candidate, max: number): string {
  return `
    <div class="rank">
      <span class="nm">${esc(c.ideology.name)}</span>
      <span class="pc">${(c.probability * 100).toFixed(1)}%</span>
      <span class="track"><i style="width:${Math.round((c.probability / max) * 100)}%"></i></span>
      <span class="fam">${esc(c.familyLabel)}</span>
    </div>`;
}

function renderResult(res: Outcome) {
  const top = res.top[0];
  if (!top) return;
  const max = top.probability || 1;
  const aliases = top.ideology.aliases.length
    ? `<p class="small muted">Also called: ${esc(top.ideology.aliases.join(', '))}</p>`
    : '';

  const header = res.hybrid
    ? `<div class="verdict-label">No single tradition fits</div>
       <h1 class="winner">Between ${esc(res.top[0].ideology.name)}<br>and ${esc(res.top[1]?.ideology.name ?? 'something else')}</h1>
       <p class="winner-blurb">Your answers do not sit inside one tradition. That is a real
       result, not a failure of the test &mdash; the closest matches are below, but none of them
       explains you well.</p>`
    : `<div class="verdict-label">Closest match</div>
       <h1 class="winner">${esc(top.ideology.name)}</h1>
       <div class="winner-family">${esc(top.familyLabel)}</div>
       <p class="winner-blurb">${esc(top.ideology.blurb)}</p>
       ${aliases}`;

  const deciding = res.deciding
    .map((d) => {
      const said =
        d.response === 'skip'
          ? 'You skipped'
          : d.response > 0
            ? 'You agreed'
            : d.response < 0
              ? 'You disagreed'
              : 'You were neutral';
      const cls = d.weight >= 0 ? 'for' : 'against';
      return `<div class="reason"><div class="said ${cls}">${said}</div>${esc(d.prompt)}</div>`;
    })
    .join('');

  app.innerHTML = `
    ${header}
    <div class="card">
      <h3>Where you landed</h3>
      ${res.top.map((c) => candidateRow(c, max)).join('')}
    </div>
    <div class="card${res.hybrid ? ' hybrid' : ''}">
      <h3>The answers that decided it</h3>
      ${deciding}
    </div>
    <div class="card">
      <h3>Near misses</h3>
      <div class="chips">${res.nearMisses.map((c) => `<span class="chip">${esc(c.ideology.name)}</span>`).join('')}</div>
    </div>
    <p class="small muted">Decided in ${res.questionsAsked} questions out of a bank of
    ${model.kb.questions.length}, against ${model.kb.ideologies.length} ideologies.
    Fit score ${(res.fit * 100).toFixed(0)}%.</p>
    <p style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px">
      <button class="btn" id="again">Take it again</button>
      <button class="btn ghost" id="copy">Copy result</button>
    </p>`;

  document.getElementById('again')!.addEventListener('click', () => {
    state = initialState();
    clearSaved();
    renderIntro();
    window.scrollTo(0, 0);
  });
  document.getElementById('copy')!.addEventListener('click', async (e) => {
    const text = `Ideology Sorter: ${res.top.map((c) => `${c.ideology.name} ${(c.probability * 100).toFixed(0)}%`).join(' | ')}`;
    try {
      await navigator.clipboard.writeText(text);
      (e.currentTarget as HTMLButtonElement).textContent = 'Copied';
    } catch {
      (e.currentTarget as HTMLButtonElement).textContent = 'Copy failed';
    }
  });
  window.scrollTo(0, 0);
}

document.addEventListener('keydown', (e) => {
  if (!pending) return;
  const map: Record<string, Response> = { '1': 2, '2': 1, '3': 0, '4': -1, '5': -2, '0': 'skip' };
  if (e.key in map) {
    e.preventDefault();
    answer(map[e.key]!);
  } else if (e.key === 'Backspace' && state.asked.length) {
    e.preventDefault();
    goBack();
  }
});

boot();
