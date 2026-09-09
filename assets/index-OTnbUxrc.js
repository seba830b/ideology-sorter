(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))a(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function s(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(e){if(e.ep)return;e.ep=!0;const o=s(e);fetch(e.href,o)}})();const b=[-2,-1,0,1,2],H={core:.75,strong:1.05,typical:1.45,weak:2},G={core:0,strong:.3,typical:.6,weak:1},A=.35;function Y(t,n,s){const a=n.positions[t.tenet];if(!a)return null;if(s.kind==="categorical")return t.expected[a.value]??0;const e=s.options.indexOf(a.value);if(e<0)return t.expected[a.value]??0;const o=G[a.strength];if(o<=0)return t.expected[s.options[e]]??0;let i=0,r=0;for(let l=0;l<s.options.length;l++){const p=l-e,g=Math.exp(-(p*p)/(2*o*o));i+=g*(t.expected[s.options[l]]??0),r+=g}return i/r}function D(t,n){if(t===null||n===null)return b.map(()=>1/b.length);const s=H[n],a=b.map(o=>Math.exp(-((o-t)*(o-t))/(2*s*s))),e=a.reduce((o,i)=>o+i,0);return a.map(o=>o/e)}function W(t){const n=t.ideologies.length,s=t.questions.length,a=new Float32Array(s*n*b.length),e=new Uint8Array(s*n),o=new Float32Array(s*n),i=new Int32Array(s),r=new Map(t.tenets.map(c=>[c.id,c])),l=new Map(t.tenets.map((c,f)=>[c.id,f]));for(let c=0;c<s;c++){const f=t.questions[c],I=r.get(f.tenet);if(!I)throw new Error(`question ${f.id} references unknown tenet ${f.tenet}`);i[c]=l.get(f.tenet)??-1;for(let d=0;d<n;d++){const m=t.ideologies[d],u=m.positions[f.tenet],k=Y(f,m,I),w=D(k,u?u.strength:null),L=(c*n+d)*b.length;for(let $=0;$<b.length;$++)a[L+$]=w[$];e[c*n+d]=u?1:0,o[c*n+d]=k??0}}const p=new Float64Array(n);let g=0;for(const c of t.ideologies)g+=Math.max(c.priorWeight,1e-6);for(let c=0;c<n;c++)p[c]=Math.log(Math.max(t.ideologies[c].priorWeight,1e-6)/g);return{kb:t,nI:n,nQ:s,lik:a,specified:e,expected:o,logPrior0:p,tenetOfQuestion:i}}const h={minQuestions:16,maxQuestions:32,likelihoodTemper:.55,stopConfidence:.55,stopMargin:2,minInformationGain:.02,tier1Opening:3,antiRailroadEvery:5,antiRailroadTemperature:3,liveMass:.99,liveCap:250,redundancyThreshold:.9};function E(){return{asked:[]}}function P(t,n){const s=new Float64Array(t.nI);s.set(t.logPrior0);for(const{qIndex:a,response:e}of n.asked){const o=a*t.nI;if(e==="skip"){const i=Math.log(1+A)*h.likelihoodTemper,r=Math.log(1-A/2)*h.likelihoodTemper;for(let l=0;l<t.nI;l++)s[l]+=t.specified[o+l]?r:i}else{const i=b.indexOf(e);for(let r=0;r<t.nI;r++)s[r]+=Math.log(t.lik[(o+r)*b.length+i]+1e-12)*h.likelihoodTemper}}return _(s)}function _(t){let n=-1/0;for(let e=0;e<t.length;e++)t[e]>n&&(n=t[e]);const s=new Float64Array(t.length);let a=0;for(let e=0;e<t.length;e++){const o=Math.exp(t[e]-n);s[e]=o,a+=o}for(let e=0;e<s.length;e++)s[e]/=a;return s}function B(t,n=h.liveCap,s=h.liveMass){const a=Array.from(t.keys()).sort((i,r)=>t[r]-t[i]),e=[];let o=0;for(const i of a)if(e.push(i),o+=t[i],o>=s||e.length>=n)break;return e}function K(t,n){let s=0;for(const e of n)s+=t[e];if(s<=0)return 0;let a=0;for(const e of n){const o=t[e]/s;o>0&&(a-=o*Math.log(o))}return a}function F(t,n,s,a){const e=K(n,s),o=a*t.nI;let i=0;for(const l of s)i+=n[l];if(i<=0)return 0;let r=0;for(let l=0;l<b.length;l++){let p=0;for(const c of s)p+=n[c]/i*t.lik[(o+c)*b.length+l];if(p<=1e-12)continue;let g=0;for(const c of s){const f=n[c]/i*t.lik[(o+c)*b.length+l]/p;f>0&&(g-=f*Math.log(f))}r+=p*g}return e-r}function J(t,n){const s=new Float64Array(t.length);let a=0;for(let e=0;e<t.length;e++){const o=Math.pow(t[e],1/n);s[e]=o,a+=o}for(let e=0;e<s.length;e++)s[e]/=a;return s}function U(t,n,s){if(t.tenetOfQuestion[n]!==t.tenetOfQuestion[s])return!1;const a=n*t.nI,e=s*t.nI;let o=0,i=0,r=0;for(let l=0;l<t.nI;l++){const p=t.expected[a+l],g=t.expected[e+l];o+=p*g,i+=p*p,r+=g*g}return i<=1e-9||r<=1e-9?!1:o/Math.sqrt(i*r)>=h.redundancyThreshold}function V(t,n,s,a={}){const e=new Set(n.asked.map(u=>u.qIndex)),o=n.asked.length,i=o>0?t.tenetOfQuestion[n.asked[o-1].qIndex]:-1,r=B(s),l=o>=h.antiRailroadEvery&&o%h.antiRailroadEvery===0,p=l?J(s,h.antiRailroadTemperature):s,g=l?B(p):r;let c=[];for(let u=0;u<t.nQ;u++){if(e.has(u)||o<h.tier1Opening&&t.kb.questions[u].tier!==1||t.tenetOfQuestion[u]===i)continue;let k=!1;for(const w of e)if(U(t,u,w)){k=!0;break}k||c.push(u)}if(c.length===0)for(let u=0;u<t.nQ;u++)e.has(u)||c.push(u);if(c.length===0)return null;const f=a.sampleCandidates;if(f&&c.length>f){const u=a.rng??Math.random,k=[],w=c.slice();for(let L=0;L<f&&w.length>0;L++){const $=Math.floor(u()*w.length);k.push(w[$]),w[$]=w[w.length-1],w.pop()}c=k}let I=-1/0,d=-1;for(const u of c){const k=F(t,p,g,u);k>I&&(I=k,d=u)}if(d<0)return null;const m=l?F(t,s,r,d):I;return{qIndex:d,gain:m}}function z(t,n,s){const a=t.asked.length;if(a>=h.maxQuestions)return{stop:!0,reason:"cap"};if(s===null)return{stop:!0,reason:"exhausted"};if(a<h.minQuestions)return{stop:!1,reason:"continue"};const e=Array.from(n).sort((r,l)=>l-r),o=e[0]??0,i=e[1]??0;return o>=h.stopConfidence&&o>=h.stopMargin*i?{stop:!0,reason:"confident"}:s<h.minInformationGain?{stop:!0,reason:"exhausted"}:{stop:!1,reason:"continue"}}const X=.45;function O(t,n,s,a){if(a==="skip")return t.specified[n*t.nI+s]?1-A/2:1+A;const e=b.indexOf(a);return t.lik[(n*t.nI+s)*b.length+e]}function Z(t,n,s){let a=0;for(let e=0;e<b.length;e++){const o=t.lik[(n*t.nI+s)*b.length+e];o>a&&(a=o)}return a}function tt(t,n,s){const a=new Map(t.kb.families.map(d=>[d.id,d.label])),e=Array.from(s.keys()).sort((d,m)=>s[m]-s[d]),o=d=>({ideology:t.kb.ideologies[d],probability:s[d],familyLabel:a.get(t.kb.ideologies[d].family)??t.kb.ideologies[d].family}),i=e.slice(0,3).map(o),r=e.slice(3,6).map(o),l=e[0],p=e[1]??e[0];let g=0,c=0;for(const{qIndex:d,response:m}of n.asked){if(m==="skip")continue;const u=O(t,d,l,m),k=Z(t,d,l);k<=0||(g+=Math.log(Math.max(u/k,1e-6)),c++)}const f=c>0?Math.exp(g/c):1,I=n.asked.map(({qIndex:d,response:m})=>({prompt:t.kb.questions[d].prompt,response:m,weight:Math.log(O(t,d,l,m)+1e-12)-Math.log(O(t,d,p,m)+1e-12)})).sort((d,m)=>Math.abs(m.weight)-Math.abs(d.weight)).slice(0,4);return{top:i,fit:f,hybrid:f<X||(i[0]?.probability??0)<.2,deciding:I,nearMisses:r,questionsAsked:n.asked.length}}const M=document.getElementById("app"),Q="ideology-sorter-progress";let x,y=E(),q=null;const et=[{v:2,label:"Strongly agree",key:"1"},{v:1,label:"Agree",key:"2"},{v:0,label:"Neutral",key:"3"},{v:-1,label:"Disagree",key:"4"},{v:-2,label:"Strongly disagree",key:"5"}],v=t=>t.replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]);function R(){try{localStorage.setItem(Q,JSON.stringify(y.asked))}catch{}}function nt(){try{const t=localStorage.getItem(Q);if(!t)return null;const n=JSON.parse(t);return Array.isArray(n)&&n.length?n:null}catch{return null}}function S(){try{localStorage.removeItem(Q)}catch{}}async function st(){M.innerHTML='<div class="loading">Loading&#8230;</div>';const n=await(await fetch("/ideology-sorter/kb.json")).json();x=W(n);const s=nt();s?(y={asked:s},ot()):C()}function C(){const t=x.kb;M.innerHTML=`
    <div class="intro">
      <h1>Ideology Sorter</h1>
      <p class="lede">A political test that adapts. Every answer narrows the field, and the next
      question is chosen to divide whatever is still standing &mdash; so no two people take the same test.</p>
      <div class="stat-row">
        <div class="stat"><b>${t.ideologies.length}</b><span>ideologies</span></div>
        <div class="stat"><b>${t.questions.length}</b><span>questions in bank</span></div>
        <div class="stat"><b>~${h.minQuestions}&ndash;${h.maxQuestions}</b><span>you will be asked</span></div>
        <div class="stat"><b>${t.families.length}</b><span>traditions</span></div>
      </div>
      <p class="small muted">It covers the obvious ones and a great many that are not: Georgism,
      mutualism, Bookchinist communalism, Freiwirtschaft, Posadism, Sultan-Galievism, panarchism,
      political Confucianism, Russian Cosmism. Answer honestly &mdash; it is trying to find where
      you actually sit, not where you would like to.</p>
      <p><button class="btn" id="start">Begin</button></p>
    </div>`,document.getElementById("start").addEventListener("click",()=>{y=E(),S(),T()})}function ot(){M.innerHTML=`
    <div class="intro">
      <h1>Welcome back</h1>
      <p class="lede">You were ${y.asked.length} question${y.asked.length===1?"":"s"}
      into a test. Pick up where you left off?</p>
      <p style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn" id="resume">Continue</button>
        <button class="btn ghost" id="restart">Start over</button>
      </p>
    </div>`,document.getElementById("resume").addEventListener("click",()=>T()),document.getElementById("restart").addEventListener("click",()=>{y=E(),S(),C()})}function T(){const t=P(x,y),n=V(x,y,t);if(z(y,t,n?n.gain:null).stop||!n){S(),rt(tt(x,y,t));return}q={qIndex:n.qIndex},it(n.qIndex,t)}function it(t,n){const s=x.kb.questions[t],a=x.kb.tenets.find(r=>r.id===s.tenet),e=y.asked.length+1,o=B(n,5e3,.995).length,i=Math.min(100,Math.round(y.asked.length/h.minQuestions*100));M.innerHTML=`
    <div class="qhead">
      <span class="qcount">Question ${e}</span>
      <span class="narrowing">${o} ideologies still in play</span>
    </div>
    <div class="bar"><i style="width:${i}%"></i></div>
    <span class="tenet-tag">${v(a?.label??"")}</span>
    <h2 class="prompt">${v(s.prompt)}</h2>
    <div class="answers">
      ${et.map(r=>`<button class="ans" data-v="${r.v}"><kbd>${r.key}</kbd><span class="dot"></span>${r.label}</button>`).join("")}
      <button class="ans skip" data-v="skip"><kbd>0</kbd>No opinion &mdash; skip</button>
    </div>
    <div class="qfoot">
      ${y.asked.length?'<button class="linkish" id="back">Back</button>':""}
      <span class="tiny muted">Keys 1&ndash;5, or 0 to skip</span>
    </div>`;for(const r of Array.from(M.querySelectorAll(".ans")))r.addEventListener("click",()=>{const l=r.dataset.v;N(l==="skip"?"skip":Number(l))});document.getElementById("back")?.addEventListener("click",j)}function N(t){q&&(y.asked.push({qIndex:q.qIndex,response:t}),q=null,R(),T())}function j(){y.asked.pop(),R(),T()}function at(t,n){return`
    <div class="rank">
      <span class="nm">${v(t.ideology.name)}</span>
      <span class="pc">${(t.probability*100).toFixed(1)}%</span>
      <span class="track"><i style="width:${Math.round(t.probability/n*100)}%"></i></span>
      <span class="fam">${v(t.familyLabel)}</span>
    </div>`}function rt(t){const n=t.top[0];if(!n)return;const s=n.probability||1,a=n.ideology.aliases.length?`<p class="small muted">Also called: ${v(n.ideology.aliases.join(", "))}</p>`:"",e=t.hybrid?`<div class="verdict-label">No single tradition fits</div>
       <h1 class="winner">Between ${v(t.top[0].ideology.name)}<br>and ${v(t.top[1]?.ideology.name??"something else")}</h1>
       <p class="winner-blurb">Your answers do not sit inside one tradition. That is a real
       result, not a failure of the test &mdash; the closest matches are below, but none of them
       explains you well.</p>`:`<div class="verdict-label">Closest match</div>
       <h1 class="winner">${v(n.ideology.name)}</h1>
       <div class="winner-family">${v(n.familyLabel)}</div>
       <p class="winner-blurb">${v(n.ideology.blurb)}</p>
       ${a}`,o=t.deciding.map(i=>{const r=i.response==="skip"?"You skipped":i.response>0?"You agreed":i.response<0?"You disagreed":"You were neutral";return`<div class="reason"><div class="said ${i.weight>=0?"for":"against"}">${r}</div>${v(i.prompt)}</div>`}).join("");M.innerHTML=`
    ${e}
    <div class="card">
      <h3>Where you landed</h3>
      ${t.top.map(i=>at(i,s)).join("")}
    </div>
    <div class="card${t.hybrid?" hybrid":""}">
      <h3>The answers that decided it</h3>
      ${o}
    </div>
    <div class="card">
      <h3>Near misses</h3>
      <div class="chips">${t.nearMisses.map(i=>`<span class="chip">${v(i.ideology.name)}</span>`).join("")}</div>
    </div>
    <p class="small muted">Decided in ${t.questionsAsked} questions out of a bank of
    ${x.kb.questions.length}, against ${x.kb.ideologies.length} ideologies.
    Fit score ${(t.fit*100).toFixed(0)}%.</p>
    <p style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px">
      <button class="btn" id="again">Take it again</button>
      <button class="btn ghost" id="copy">Copy result</button>
    </p>`,document.getElementById("again").addEventListener("click",()=>{y=E(),S(),C(),window.scrollTo(0,0)}),document.getElementById("copy").addEventListener("click",async i=>{const r=`Ideology Sorter: ${t.top.map(l=>`${l.ideology.name} ${(l.probability*100).toFixed(0)}%`).join(" | ")}`;try{await navigator.clipboard.writeText(r),i.currentTarget.textContent="Copied"}catch{i.currentTarget.textContent="Copy failed"}}),window.scrollTo(0,0)}document.addEventListener("keydown",t=>{if(!q)return;const n={1:2,2:1,3:0,4:-1,5:-2,0:"skip"};t.key in n?(t.preventDefault(),N(n[t.key])):t.key==="Backspace"&&y.asked.length&&(t.preventDefault(),j())});st();
