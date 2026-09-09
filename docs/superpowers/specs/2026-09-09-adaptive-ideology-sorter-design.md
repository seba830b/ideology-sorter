# Adaptive Ideology Sorter — Design

**Date:** 2026-09-09
**Status:** Approved

## 1. Summary

A web-based political test that identifies the user's own ideology by asking questions
that adapt to their previous answers, in the manner of Akinator. It covers 400+
ideologies including deeply niche and fringe tendencies.

The distinction from existing tests (IdeoSorter, 8values, Political Compass) is that
those are **static**: a fixed battery of statements, scored into an axis vector, matched
against ideology profiles. Every user sees the same questions. This design instead
maintains a **probability distribution over every ideology** and selects each next
question by **expected information gain**, so the question path branches. Nobody is
asked about Bookchin's confederalism unless they have already tested
libertarian-socialist.

Target: converge to a confident answer in 15–25 questions over a 400+ ideology set,
where a static test needs 80–120 for a worse result.

## 2. Goals

- Identify the user's own position (not a "guess the ideology I'm thinking of" game).
- 400+ ideologies, with real fringe and niche coverage as the headline feature.
- Questions visibly adapt: the test feels like it is narrowing in.
- Never confidently mislabel. A hybrid or low-confidence result is a valid output.
- Explain its reasoning — which answers decided the result.
- Adding an ideology is a data change, never a code change.
- Knowledge base quality is measurable, in CI, not a matter of opinion.

## 3. Non-goals (v1)

- No backend, accounts, or saved results. Consistent with comparable tests.
- No free-text answers. Considered and rejected: it would require a backend, ~20 LLM
  calls per run, and per-question latency.
- No crowd-sourced questions or ideology submissions.
- No Discord bot. The engine boundary keeps this cheap to add later.
- No Akinator-style learning from real user answers. Natural v2; requires a backend and
  traffic. Explicitly not designed for now.
- No i18n.

## 4. Architecture

```
knowledge base (YAML, hand-authored, versioned)
        |  build step: validate + compile
        v
    kb.json  (~300-600 KB, loaded once)
        |
     engine  (pure TS: no DOM, no framework, no I/O)
        |
       UI    (Vite + vanilla TS)
```

**Stack:** Vite + TypeScript. No UI framework — the app is a question card and a results
screen; a framework earns nothing and costs bundle size on a page whose pitch is that it
loads instantly.

**Engine boundary:** the engine accepts a belief state plus an answer and returns a new
belief state plus the next question. It never touches the DOM and performs no I/O. This
is what makes both the simulation harness (§11) and a future Discord bot possible without
a rewrite.

**Deployment:** static hosting. The test runs fully offline once loaded.

## 5. Data model

### 5.1 Tenets

The controlled vocabulary. ~60–100 categorical variables with named options.

```yaml
state_trajectory:
  label: What becomes of the state
  kind: categorical
  options: [abolish_now, wither_away, minimal, permanent_strong, replace_with_market]

economic_coordination:
  kind: ordered
  options: [free_market, market_socialism, mixed, indicative_planning, central_planning]
```

`kind: ordered` grants partial credit for adjacent options; `kind: categorical` does not.

This distinction is load-bearing. On a categorical tenet, `abolish_now` and `minimal` are
simply different values — answering like an anarchist gives a minarchist nothing. This is
precisely where axis-based tests fail: a coordinate cannot distinguish "no state" from
"small state", which is why the Political Compass places anarcho-communists and
anarcho-capitalists in the same corner.

`state_trajectory` is categorical. `economic_coordination` is ordered, because a market
socialist answering one step toward planning should not be destroyed for it.

### 5.2 Ideologies

Sparse by design. Typically 10–25 positions specified out of 60–100 tenets.

```yaml
id: bookchinist_communalism
name: Communalism
aliases: [libertarian municipalism, social ecology]
family: libertarian_socialism
prior_weight: 0.4
positions:
  scale:            {value: municipal_confederal, strength: core}
  state_trajectory: {value: abolish_now,          strength: core}
  ecology:          {value: central,              strength: core}
  transition:       {value: electoral,            strength: strong}
  land_regime:      {value: commons,              strength: strong}
blurb: "..."
reading: ["..."]
```

**`strength` ∈ {core, strong, typical, weak}** sets the sharpness of the likelihood.
`core` means adherents essentially never deviate, so disagreement eliminates the
candidate; `typical` means most-but-not-all, so disagreement only dents it. This encodes
*how diagnostic* a position is — the information a flat answer matrix discards.

**Unlisted tenets are `unspecified`** and yield a flat likelihood. Georgism is never
penalised for holding no ecological position. Silence is modelled, not imputed as
centrism.

### 5.3 Questions

Each question probes exactly one tenet and declares the answer it expects from each
option, on the same 5-point scale the user answers on.

```yaml
id: q_land_rent
tenet: land_regime
tier: 2
prompt: >
  The rental value of land should be collected by the community,
  even if the land itself stays in private hands.
expected:
  private_taxed_rent: +2
  commons:            +1
  private_absolute:   -2
  collectivised:      -1
  # unlisted options default to 0
```

`tier` ∈ {1,2,3}: 1 = broad opener, 2 = mid, 3 = fine-grained tiebreak.

## 6. Engine

### 6.1 Answers

5-point Likert plus an explicit **no opinion**. Likert rather than yes/no because a
400-target set needs the additional bits per question.

### 6.2 Belief update

Log-space naive Bayes. The independence assumption is false and empirically fine — this
is why it is "naive" and why it still works.

```
log P(i) += log P(a | i)
```

`P(answer | ideology)` is a discretised Gaussian centred on that ideology's expected
value for the question, with spread set by `strength`.

**No opinion** yields a flat likelihood, with a small tilt toward ideologies that leave
that tenet `unspecified` — consistently having no view on ecology is itself evidence.

Initial prior comes from `prior_weight`, normalised within family.

### 6.3 Question selection

Expected information gain:

```
IG(q) = H(P) - Σ_a P(a) · H(P | a)
```

Computed over the live candidate set (top-K covering 99% of mass), not all 400.

Four modifiers on top of raw greedy IG:

1. **Tier pacing** — the first three questions are drawn from tier 1, so the test opens
   with something recognisable rather than a question about mutual banking.
2. **Tenet cooldown** — no two consecutive questions on the same tenet.
3. **Anti-railroad** — every fifth question is selected against a temperature-flattened
   copy of the belief state, surfacing questions that re-test the early branch decision.
4. **Redundancy guard** — skip questions whose `expected` row is near-identical to one
   already asked.

**On modifier 3.** Adaptive selection has a failure mode specific to guessing the user's
*own* position: a few early answers place them in a branch, after which information gain
only offers questions that discriminate *within* that branch. If the early read was
wrong, the test never asks anything that could escape it, and converges confidently on
the wrong answer. Periodic flattened selection is the fix, and it is a requirement, not
a refinement.

### 6.4 Stopping

Stop when the top candidate exceeds ~0.55 **and** holds at least a 2x margin over the
runner-up; or when no remaining question offers meaningful gain; or at a hard cap of ~30.
Floor of ~12 questions so a run never feels cheap. Thresholds to be tuned against the
simulation harness.

### 6.5 Output

Not a single winner:

- Top 3 with confidence, plus family label.
- **Deciding answers.** For each answered question, compute its log-likelihood-ratio
  contribution to winner-versus-runner-up; sort; show the top four. Genuine
  explainability for very little code.
- **Nearest misses** — "one answer away from mutualism".
- **Hybrid output.** When top likelihood is low across the board, do not force a label:
  report that the user sits between two named traditions. For a self-identification test
  this is correct surprisingly often, and confidently mislabelling someone is the fastest
  way to lose them.
- Share card, and per-ideology blurb with reading links.

## 7. Family taxonomy

Families do **not** drive inference — all guessing runs on tenets. Families serve three
purposes only: prior weighting, grouping the results screen, and deciding which YAML file
an entry lives in. A debatable placement therefore costs no accuracy.

Each ideology has exactly one family. Cross-cutting cases are handled via `aliases`.

**30 families**, averaging ~18 entries each. Two were added while building the seed
roster: **Monetary & distributive heterodoxy** (Gesell, Douglas, Kelso) and
**Constitutional & democratic-form** (sortition, futarchy, epistocracy — ideologies
about how decisions get made, orthogonal to every economic tenet). The ultra-niche
entries would not fit anywhere honest without them.

Marxist-Leninist tendencies · Trotskyism & left communism · Social anarchism ·
Individualist & market anarchism · Anarcho-capitalism · Classical liberalism &
libertarianism · Social democracy & democratic socialism · Georgism · Cooperativism &
syndicalism · Religious social thought · Religious traditionalism & integralism ·
Conservatism & traditionalism · Radical traditionalism & far right · Fascism & national
socialism · Nationalism & national liberation · Populism · Green & ecological ·
Primitivism & anti-civilisation · Technocracy & managerialism · Accelerationism &
futurism · Feminist tendencies · Liberation movements · Globalism & world federalism ·
Localism & communitarianism · Third Way & centrism · Post-left & antipolitical · Utopian
& pre-Marxist socialism · Monetary & distributive heterodoxy · Constitutional &
democratic-form · Esoteric & syncretic fringe

Two deliberate placements: **national anarchism** files under esoteric/syncretic, because
on tenets it shares almost nothing with either anarchism family — the name is the only
overlap. **Juche** files under Marxist-Leninist, because that is where people looking for
it will expect to find it.

## 8. Authoring pipeline

**Author by tenet, not by ideology.** Writing 400 complete entries one at a time is slow
and inconsistent, because the meaning of `strength: strong` gets re-decided on every
entry. Instead: take one tenet, put all 400 candidates in front of you, and sweep — "who
wants the state abolished immediately?" — in one sitting, under one calibration.

**Files are one YAML per family** (~28 files x ~15 entries), not one per ideology. Fine
distinctions live inside families, so keeping a family in a single readable file is what
reveals that mutualism and individualist anarchism have drifted into the same entry.

**Work loop:**

1. Build the tenet vocabulary. Slowest and hardest; do it first and carefully. Changing
   an option later invalidates every ideology that used it.
2. Skeleton the roster: id, name, aliases, family, prior_weight, blurb. No positions.
   The seed list is `docs/ideology-roster.md` — ~540 candidate entries, ~300 of them
   marked ultra-niche. Expect 30–60 to merge or drop at step 4.
3. Tenet sweeps, most-discriminating tenets first.
4. Run the confusability check. It fails, listing every pair it cannot separate.
5. Write questions to break those pairs. Return to 4.

**The build failures are the task list.** There is never a question of what to work on
next, and it is not possible to quietly ship a version in which two ideologies are
indistinguishable.

## 9. Build-time validation

Every build:

- Unknown tenet or option references.
- **Dominated ideologies** — identical on all specified positions.
- Orphan questions probing a tenet no ideology uses.
- Ideologies with fewer than ~6 positions (too thin to ever win).
- **Confusability:**

```
for every pair (A,B) of ideologies:
  best = max over all questions q of |expected(q,A) - expected(q,B)|
  if best < 3 -> FAIL "A and B are not separable by the current question bank"
```

400^2 x 300 is ~48M comparisons — a few seconds at build time.

An explicit `contrast_pairs` list carries the known-treacherous pairs — e.g.
`[anarcho_communism, minarchism]`, `[anarcho_capitalism, minarchism]`,
`[georgism, geolibertarianism]`, `[mutualism, individualist_anarchism]`,
`[strasserism, orthodox_fascism]` — under a stricter threshold, always reported.

The hardest of these is anarcho-capitalism versus minarchism: near-identical on property,
markets and land, differing only on whether a monopoly on force can ever be legitimate.
The bank carries a question built to split exactly that:

> "Even a state limited to courts, police, and defence is illegitimate — those services
> should come from competing private providers."
> `replace_with_market: +2` · `minimal: -2` · `abolish_now: +1`

## 10. Edge cases

- **Contradictory or troll answers** land in the low-confidence path (§6.5) and produce a
  hybrid or insufficient-signal result, never a confident wrong label.
- **Back button** recomputes from scratch; the engine is pure and this is sub-millisecond.
- **Refresh** — answers persist to `localStorage` inside try/catch, so a 20-question run
  is not lost. The app must render correctly when storage is unavailable or empty.
- **Invalid knowledge base** fails the build rather than shipping.
- **No network after load** — nothing to fail at runtime.

## 11. Testing

**Simulation harness — the primary quality gate.** For each of the 400 ideologies,
simulate an ideal adherent answering according to that ideology's own profile plus noise;
run the full test 100 times; report:

- top-1 and top-3 accuracy, per ideology
- mean questions to convergence
- **the confusion matrix** — which ideologies are mistaken for which
- degradation under 10% / 20% / 30% answer noise

This converts "is the knowledge base any good?" into a number, and the confusion matrix
*is* the authoring backlog: it names the pairs still needing a discriminating question.
Runs in CI and gates merges.

**Unit tests** on the Bayes update, information gain computation, the stopping rule, and
each of the four selection modifiers.

## 12. Open questions

- **The tenet vocabulary itself** is not yet written. It is the first work item and
  deserves its own focused pass before mass authoring begins. The ultra-niche entries
  drive it: Gesell needs `money_form`, Cosmism needs `death_and_finitude`, sortition
  needs `decision_procedure`, Anthroposophy needs `sphere_separation`. A tenet used by
  five ideologies and `unspecified` for the other 535 is cheap (§5.2) and enormously
  discriminating when it fires — resist generalising these away.
- **`prior_weight` calibration** — initial values are guesses. Revisit once there is any
  real usage signal, even informal.
- **Stopping thresholds** (0.55, 2x margin, 12/30 bounds) are starting points to be tuned
  against the simulation harness, not fixed requirements.

---

## 13. Implementation notes — where the build departed from this spec

Recorded because the simulation harness forced several changes.

**Likelihood tempering (new).** Naive Bayes treats every question as independent evidence,
which they are not — several questions probe one tenet, and tenets correlate. Untempered,
belief spiked to near-certainty after a handful of answers and the stopping rule fired on
evidence that was not there: the test stopped at 12 questions and was wrong. Log-likelihoods
are now multiplied by 0.55. `minQuestions` rose 12 → 16 and `maxQuestions` 30 → 32.

**Family defaults (new).** §8 prescribes authoring by tenet rather than by ideology. The
implementation does this at family granularity: each ideology file carries a
`family_defaults` block that expands into ordinary per-ideology positions at build time,
overridden by anything the member states itself. This raised mean positions per ideology
from 8.8 to 38, and with it top-1 accuracy from 33.9% to 53.5%. The engine never sees
families; the compiled KB holds only per-ideology positions, exactly as §7 requires.

**Confusability metric replaced.** §9's rule — fail when no single question separates a pair
by 3 — flagged 64,453 of 128,778 pairs, almost all of them genuinely distinguishable by a
dozen questions contributing 2 each. It measured the wrong thing. The check now uses
Euclidean separation across the whole question bank, failing below 2.5. That leaves two
pairs, both genuinely near-identical doctrines.

**Prior normalised globally**, not within family. Family-relative normalisation would have
given a 9-member family the same total mass as a 28-member one, which is not what
`prior_weight` is for.

**`constitutionalism` was missing** from the tenet vocabulary while being used by 30+
ideologies and 2 questions. The build's reference check caught it on first run — the
validation earning its place immediately.

**Measured result.** 508 ideologies, 69 tenets, 284 questions: 56.6% top-1, 70.7% top-3,
mean 23.9 questions, 8.1% hybrid verdicts, at 15% answer noise. Random baseline is 0.2%.
