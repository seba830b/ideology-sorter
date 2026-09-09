# Ideology Sorter

An adaptive political test over **508 ideologies**. Unlike IdeoSorter, 8values or the
Political Compass — which ask everyone the same fixed battery and score it into a vector —
this holds a probability distribution over every ideology and chooses each next question by
**expected information gain**. The question path branches, so nobody is asked about
Bookchin's confederalism unless they have already tested libertarian-socialist.

It reaches a confident answer in **16–25 questions**, and runs entirely in the browser:
no backend, no accounts, no tracking. Loads once and works offline.

## How it works

**The knowledge base is not an answer matrix.** 508 ideologies × 284 questions would be
144,000 hand-filled cells, and nobody can author or maintain that. Instead there is a
controlled vocabulary of **69 tenets** — categorical variables like `state_trajectory`
with named options — and each ideology declares a sparse set of positions on them, each
with a `strength` saying how firmly adherents hold it. `P(answer | ideology)` is derived.

Adding an ideology is a data change, never a code change.

**Categorical tenets never give partial credit.** This is the point where axis-based tests
fail: a coordinate cannot distinguish "no state" from "small state", which is why the
Political Compass puts anarcho-communists and anarcho-capitalists in the same corner.
`state_trajectory` is categorical, so answering like an anarchist gives a minarchist
nothing. Ordered tenets like `economic_coordination`, where adjacency is real, do smear.

**Silence is modelled.** An unspecified tenet yields a flat likelihood, so Georgism is
never penalised for having no ecological position — and an abstention tilts slightly
toward ideologies that are genuinely silent there.

**Question selection** is `IG(q) = H(P) − Σ P(a)·H(P|a)` over the live candidate set, with
four modifiers: tier pacing (openers are broad), tenet cooldown, a redundancy guard, and an
**anti-railroad pass** — every fifth question is chosen against a temperature-flattened
belief, so a wrong early branch can still be escaped. Without that, adaptive selection only
ever offers questions that discriminate *within* the branch you were misread into, and the
test converges confidently on the wrong answer.

**It can decline to answer.** When no ideology explains your answers well, it says you sit
between two traditions rather than forcing a label.

## Quality

`npm run sim` simulates an ideal adherent of each of the 508 ideologies answering according
to their own profile plus noise, runs the full test, and reports accuracy and a confusion
matrix.

| | |
|---|---|
| top-1 accuracy | **56.6%** |
| top-3 accuracy | **70.7%** |
| mean questions | 23.9 |
| hybrid verdicts | 8.1% |

At 15% answer noise, against a random baseline of 0.2%. The confusion matrix is the
authoring backlog: it names which pairs still need a discriminating question.

`npm run kb` validates and compiles. It fails the build on unknown tenet or option
references, duplicate ids, ideologies too thin to ever win, and **dominated entries** —
two ideologies with identical position sets. It also reports pairs whose separation across
the whole question bank is too small to tell apart. Two remain, both genuinely near-identical
doctrines (transhumanism/immortalism, radical/materialist feminism).

## Layout

```
kb/tenets.yaml         the controlled vocabulary: 69 tenets, 348 options
kb/ideologies/*.yaml   one file per family, with family_defaults + per-entry positions
kb/questions/*.yaml    284 questions, each probing one tenet
scripts/build-kb.ts    validate + compile to public/kb.json
scripts/simulate.ts    the simulation harness
src/engine/            pure TypeScript: no DOM, no I/O, no framework
src/ui/                the app
docs/                  design spec and the full ideology roster
```

The engine has no UI assumptions, which is what makes the harness possible and would make a
Discord bot an afternoon's work.

## Commands

```bash
npm install
npm run dev      # build the KB and serve
npm run build    # production build to dist/
npm test         # engine unit tests
npm run sim      # simulation harness (add --quick for a fast pass)
npm run kb       # validate and compile the knowledge base only
```

## Adding an ideology

Add an entry to the right file in `kb/ideologies/`, give it 10–25 tenet positions, and run
`npm run kb`. If it is not separable from something already there, the build says so.
