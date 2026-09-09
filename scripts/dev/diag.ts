import { readFileSync } from 'node:fs';
import { ANSWERS, type Answer } from '../../src/engine/types.ts';
import type { CompiledKB } from '../../src/engine/types.ts';
import { buildModel } from '../../src/engine/likelihood.ts';
import { belief, initialState, selectNext, shouldStop } from '../../src/engine/engine.ts';

const kb = JSON.parse(readFileSync('src/generated/kb.json','utf8')) as CompiledKB;
const model = buildModel(kb);
let seed=12345; const rng=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)%1e6)/1e6;};

// tier distribution
const tiers = [0,0,0,0]; for (const q of kb.questions) tiers[q.tier]++;
console.log('tier counts:', tiers.slice(1).join(' / '));
const posCounts = kb.ideologies.map(i=>Object.keys(i.positions).length);
console.log('positions per ideology: min', Math.min(...posCounts), 'mean', (posCounts.reduce((a,b)=>a+b,0)/posCounts.length).toFixed(1), 'max', Math.max(...posCounts));

function run(targetId: string, noise: number, sample?: number) {
  const ii = kb.ideologies.findIndex(x=>x.id===targetId);
  const state = initialState();
  for(;;){
    const p = belief(model, state);
    const sel = selectNext(model, state, p, sample?{sampleCandidates:sample, rng}:{});
    const stop = shouldStop(state, p, sel?sel.gain:null);
    if (stop.stop || !sel) { 
      const order = Array.from(p.keys()).sort((a,b)=>p[b]-p[a]);
      return {n: state.asked.length, reason: stop.reason,
        top: order.slice(0,5).map(i=>`${kb.ideologies[i].id}:${(p[i]*100).toFixed(1)}%`),
        rank: order.indexOf(ii)};
    }
    // ideal adherent, no noise
    let a: Answer;
    if (rng()<noise) a = ANSWERS[Math.floor(rng()*5)];
    else {
      const base=(sel.qIndex*model.nI+ii)*5; let r=rng(); a=0;
      for(let k=0;k<5;k++){ r-=model.lik[base+k]; if(r<=0){a=ANSWERS[k];break;} }
    }
    state.asked.push({qIndex: sel.qIndex, response: a});
  }
}

for (const id of ['marxism_leninism','anarcho_capitalism','georgism','southern_agrarianism','bookchinist_communalism']) {
  const r = run(id, 0);
  console.log(`\n${id}: ${r.n}q stop=${r.reason} truerank=${r.rank}`);
  console.log('  ', r.top.join('  '));
}
