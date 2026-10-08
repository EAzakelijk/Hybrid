const APP_VERSION='2.1';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORE={get(k,f=null){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};

function nextMonday(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);const day=x.getDay();const add=(8-day)%7||7;x.setDate(x.getDate()+add);return x}
function isoDate(d){const z=new Date(d);return `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`}
function dateOnly(v){const d=new Date(v+'T00:00:00');return isNaN(d)?new Date():d}
function daysBetween(a,b){return Math.floor((dateOnly(b)-dateOnly(a))/86400000)}
function fmtDate(v){return dateOnly(v).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function todayISO(){return isoDate(new Date())}

let settings=STORE.get('settings');
if(!settings){settings={startDate:isoDate(nextMonday()),autoWeek:true,manualWeek:1,upperIncrement:2.5,lowerIncrement:5,dbIncrement:2,defaultRest:90};STORE.set('settings',settings)}
let logs=STORE.get('logs',[]), metrics=STORE.get('metrics',[]), readiness=STORE.get('readiness',[]);
let activeWorkout=null, restTimer=null, restRemaining=0, deferredInstall=null;

const W={
 foundationA:[['Back Squat',3,'5-8',180,'lower'],['Bench Press',3,'5-8',180,'upper'],['Romanian Deadlift',3,'6-8',120,'lower'],['Pull-ups / Lat Pulldown',3,'6-10',90,'pull'],['Seated Cable Row',3,'8-12',90,'upper'],['Lateral Raise',2,'12-15',60,'upper'],["Farmer's Carry",3,'30-40 m',75,'carry'],['Plank',3,'30-60 sec',60,'core']],
 foundationB:[['Trap-Bar Deadlift',3,'4-6',180,'lower'],['Incline DB Press',3,'6-10',120,'db'],['Bulgarian Split Squat',3,'8/been',120,'db'],['Pull-up / Lat Pulldown',3,'6-10',90,'pull'],['DB / Barbell Shoulder Press',3,'6-10',120,'db'],['Hamstring Curl',2,'10-15',75,'upper'],['Face Pull',2,'12-15',60,'upper'],['Hanging Knee Raise',3,'10-15',60,'core']],
 foundationC:[['Front Squat / Hack Squat',3,'6-10',120,'lower'],['DB Bench Press',3,'8-10',90,'db'],['Chest-Supported Row',3,'8-12',90,'upper'],['Walking Lunges',2,'10/been',90,'db'],['Dips / Cable Fly',2,'8-15',75,'upper'],['Biceps Curl',2,'10-15',60,'upper'],['Triceps Extension',2,'10-15',60,'upper'],["Farmer's Carry",3,'30-50 m',75,'carry'],['Ab Wheel / Cable Crunch',3,'8-15',60,'core']],
 buildA:[['Back Squat',4,'4-6',180,'lower'],['Bench Press',4,'4-6',180,'upper'],['Romanian Deadlift',3,'6-8',120,'lower'],['Pull-ups / Lat Pulldown',4,'6-10',90,'pull'],['Seated Cable Row',3,'8-12',90,'upper'],["Farmer's Carry",4,'30-40 m',75,'carry'],['Pallof Press',3,'10/zijde',60,'core']],
 buildB:[['Trap-Bar Deadlift',4,'3-5',180,'lower'],['Incline DB Press',3,'6-10',120,'db'],['Bulgarian Split Squat',3,'8-10/been',120,'db'],['Pull-ups / Chin-ups',4,'5-8',90,'pull'],['DB Shoulder Press',3,'6-10',120,'db'],['Hamstring Curl',3,'10-15',75,'upper'],['Hanging Knee Raise',3,'10-15',60,'core']],
 buildC:[['Front Squat / Hack Squat',3,'6-8',150,'lower'],['DB Bench Press',3,'8-12',90,'db'],['Chest-Supported Row',4,'8-12',90,'upper'],['Walking Lunges',3,'10/been',90,'db'],['Cable Fly / Push-ups',2,'10-15',60,'upper'],['Hammer Curl',2,'10-15',60,'upper'],['Rope Pressdown',2,'10-15',60,'upper'],['Suitcase Carry',3,'30 m/zijde',75,'carry']],
 performanceA:[['Back Squat',3,'3-5',210,'lower'],['Bench Press',3,'3-5',180,'upper'],['Romanian Deadlift',3,'5-7',150,'lower'],['Pull-ups / Weighted Pull-ups',4,'4-8',120,'pull'],['Chest-Supported Row',3,'8-10',90,'upper'],["Farmer's Carry",4,'40 m',75,'carry'],['Ab Wheel',3,'8-12',60,'core']],
 performanceB:[['Trap-Bar Deadlift',3,'3-5',210,'lower'],['Incline DB Press',3,'6-8',120,'db'],['Bulgarian Split Squat',3,'6-8/been',120,'db'],['Chin-ups / Lat Pulldown',4,'5-8',105,'pull'],['DB Shoulder Press',3,'6-8',120,'db'],['Face Pull',2,'12-15',60,'upper'],['Hanging Leg Raise',3,'8-12',60,'core']],
 performanceC:[['Front Squat',3,'5-7',150,'lower'],['DB Bench Press',3,'8-10',90,'db'],['One-Arm DB Row',3,'8-10/zijde',90,'db'],['Reverse Lunge',3,'8/been',90,'db'],['Push-ups',3,'AMRAP-2',75,'upper'],['Suitcase Carry',3,'40 m/zijde',75,'carry'],['Cable Chop',3,'10/zijde',60,'core']],
 kbA:[['Front Squat / Goblet Squat',4,'6-8',150,'lower'],['Weighted Pull-up / Pull-up',4,'4-8',120,'pull'],['Bench Press',3,'5-8',150,'upper'],['Single-Leg RDL',3,'8/been',90,'db'],['Kettlebell Swing',5,'12-15',60,'kb'],['Suitcase Carry',3,'40 m/zijde',75,'carry'],['Dead Bug',3,'8/zijde',45,'core']],
 kbB:[['KB Clean & Press',4,'5/zijde',90,'kb'],['Goblet Squat',4,'8-12',90,'kb'],['One-Arm DB/KB Row',4,'8-12/zijde',75,'db'],['Push-up',4,'8-20',60,'upper'],['KB Romanian Deadlift',3,'10-12',90,'kb'],['Turkish Get-Up',3,'2/zijde',90,'kb'],['Dead Hang',3,'30-60 sec',60,'pull']],
 kbC:[['Trap-Bar Deadlift',3,'4-6',180,'lower'],['Incline DB Press',3,'6-10',120,'db'],['Bulgarian Split Squat',3,'8/been',120,'db'],['Pull-ups',4,'submax',90,'pull'],['Kettlebell Swing',6,'10',45,'kb'],["Farmer's Carry",4,'40 m',75,'carry'],['Pallof Press',3,'10/zijde',60,'core']],
 athleticA:[['Trap-Bar Deadlift',4,'3-5',180,'lower'],['Bench Press',3,'5-7',150,'upper'],['Pull-ups / Weighted Pull-ups',4,'4-8',105,'pull'],['Sled Push OR Heavy Carry',5,'20-30 m',90,'carry'],['Reverse Lunge',3,'8/been',90,'db'],['Ab Wheel',3,'8-12',60,'core']],
 athleticB:[['KB Clean & Press',5,'4/zijde',90,'kb'],['Goblet Squat',4,'10',90,'kb'],['One-Arm KB Row',4,'10/zijde',75,'kb'],['Kettlebell Swing',8,'10',45,'kb'],['Push-up',4,'submax',60,'upper'],['Suitcase Carry',4,'30 m/zijde',60,'carry'],['Turkish Get-Up',2,'2/zijde',90,'kb']],
 athleticC:[['Front Squat',3,'5-7',150,'lower'],['Incline DB Press',3,'8-10',90,'db'],['Chin-ups',4,'submax',90,'pull'],['Single-Leg RDL',3,'8/been',90,'db'],['Sled Push / Bike Sprint',6,'20 sec',100,'conditioning'],["Farmer's Carry",3,'50 m',75,'carry'],['Hanging Knee Raise',3,'12',60,'core']],
 transitionA:[['Back Squat OR Heavy Goblet Squat',3,'5-8',150,'lower'],['Pull-ups / Weighted Pull-ups',5,'4-8',105,'pull'],['DB Floor Press',4,'6-10',90,'db'],['Single-Leg RDL',3,'8/been',90,'db'],['Kettlebell Swing',5,'15',45,'kb'],['Suitcase Carry',4,'40 m/zijde',60,'carry']],
 transitionB:[['KB Clean & Press',4,'5/zijde',75,'kb'],['Bulgarian Split Squat',4,'8/been',90,'db'],['One-Arm Row',4,'10/zijde',75,'db'],['Push-up',4,'submax',60,'upper'],['Turkish Get-Up',3,'2/zijde',90,'kb'],['Towel Hang / Dead Hang',4,'max - 10 sec',60,'pull'],['Plank Drag',3,'8/zijde',60,'core']],
 transitionC:[['Trap-Bar Deadlift OR KB Deadlift',3,'5-8',150,'lower'],['DB Bench / Floor Press',3,'8-12',90,'db'],['Pull-ups / Chin-ups',4,'submax',90,'pull'],['Walking Lunge',3,'10/been',90,'db'],['KB Swing',10,'10 EMOM',0,'kb'],["Farmer's Carry",4,'50 m',75,'carry'],['Hanging Leg Raise',3,'8-12',60,'core']]
};

const runs={
1:'5 min wandelen · 2 min jog / 2 min wandelen × 6 · 5 min wandelen',2:'5 min wandelen · 3 min jog / 2 min wandelen × 6 · 5 min wandelen',3:'5 min wandelen · 5 min jog / 2 min wandelen × 5 · 5 min wandelen',4:'5 min wandelen · 8 min jog / 2 min wandelen × 4 · 5 min wandelen',
5:'15 min easy · 2 min wandelen · 15 min easy',6:'20 min easy · 2 min wandelen · 15 min easy',7:'30-35 min continu easy',8:'35-40 min continu easy',9:'40 min Zone 2',10:'45 min Zone 2',11:'50 min Zone 2',12:'40 min zeer rustig; later deze week optioneel 5 km benchmark',
13:'45 min Zone 2',14:'50 min Zone 2',15:'55 min Zone 2',16:'40 min deload',17:'45 min Zone 2 + 4×20 sec ontspannen strides',18:'50 min Zone 2 + 4×20 sec strides',19:'55-60 min Zone 2',20:'45 min deload',21:'45 min easy op zachte/vaste ondergrond',22:'50 min easy',23:'60 min easy',24:'45 min easy + optioneel 5 km benchmark'};
const cond={
1:'35-45 min low-impact Zone 2: fiets, crosstrainer, roeier of airbike',2:'40-45 min low-impact Zone 2',3:'40-50 min low-impact Zone 2',4:'35-40 min rustig',
5:'10 min easy · 6×(1 min stevig + 2 min rustig) · cooldown',6:'10 min easy · 6×(90 sec stevig + 2 min rustig) · cooldown',7:'10 min easy · 6×(2 min stevig + 2 min rustig) · cooldown',8:'10 min easy · 5×(3 min stevig + 2 min rustig) · cooldown',
9:'10 min easy · 5×(3 min hard + 2 min easy) · cooldown',10:'10 min easy · 4×(4 min hard + 2 min easy) · cooldown',11:'10 min easy · 5×(4 min hard + 2 min easy) · cooldown',12:'30-40 min heel rustig, geen zware intervals',
13:'10 min easy · 6×2 min hard / 2 min easy · cooldown',14:'10 min easy · 5×3 min hard / 2 min easy · cooldown',15:'10 min easy · 4×5 min threshold / 2 min easy · cooldown',16:'30-40 min low-impact Zone 2',
17:'8×45 sec helling of gecontroleerd stevig / 75 sec herstel; geen sprint',18:'10×45 sec / 75 sec herstel',19:'6×2 min stevig / 2 min herstel',20:'35 min rustig',21:'6×3 min stevig / 2 min easy',22:'5×4 min stevig / 2 min easy',23:'3×8 min tempo / 3 min easy',24:'30-40 min easy of 5 km benchmark indien fris'};

function programWeek(){
 if(!settings.autoWeek)return clamp(+settings.manualWeek||1,1,999);
 const diff=daysBetween(settings.startDate,todayISO());
 return diff<0?1:Math.floor(diff/7)+1;
}
function phaseFor(w){if(w<=4)return['Foundation','Loopimpact rustig opbouwen + full-body strength'];if(w<=8)return['Hybrid Build','Meer krachtvolume + eerste loopintervallen'];if(w<=12)return['Performance Base','Zwaardere kracht, langere duur en kwaliteit'];if(w<=16)return['Hybrid 2.0','Kettlebell en functionele kracht toevoegen'];if(w<=20)return['Athletic Capacity','Carries, swings, kracht en work capacity'];if(w<=24)return['Gym-to-Anywhere','Meer DB/KB/pull-up werk, minder machine-afhankelijk'];return['Ongoing Hybrid','Doorlopend 4-weeks blok met automatische variatie']}
function blockWeek(w){return w<=24?w:25+((w-25)%4)}
function strengthKeys(w){if(w<=4)return['foundationA','foundationB','foundationC'];if(w<=8)return['buildA','buildB','buildC'];if(w<=12)return['performanceA','performanceB','performanceC'];if(w<=16)return['kbA','kbB','kbC'];if(w<=20)return['athleticA','athleticB','athleticC'];return['transitionA','transitionB','transitionC']}
function ongoingRun(w,type){const c=((w-25)%4)+1;if(type==='run')return ['45 min Zone 2','50 min Zone 2','55-60 min Zone 2 + 4×20 sec strides','40 min deload Zone 2'][c-1];return ['6×3 min hard / 2 min easy','5×4 min hard / 2 min easy','3×8 min tempo / 3 min easy','30-40 min low-impact easy'][c-1]}
function planForWeek(w){
 const keys=strengthKeys(w), r=w<=24?runs[w]:ongoingRun(w,'run'), c=w<=24?cond[w]:ongoingRun(w,'cond');
 return [
 {dow:1,day:'Maandag',title:`Strength A`,type:'strength',key:keys[0]},
 {dow:2,day:'Dinsdag',title:'Easy / Zone 2 Run',type:'run',prescription:r},
 {dow:3,day:'Woensdag',title:`Strength B`,type:'strength',key:keys[1]},
 {dow:4,day:'Donderdag',title:'Conditioning / Quality Run',type:'run',prescription:c},
 {dow:5,day:'Vrijdag',title:`Strength C`,type:'strength',key:keys[2]},
 {dow:6,day:'Zaterdag',title:'Herstel + werk',type:'rest'},
 {dow:0,day:'Zondag',title:'Herstel + werk',type:'rest'}
 ]
}
function weekStartFor(w){const s=dateOnly(settings.startDate);s.setDate(s.getDate()+(w-1)*7);return s}
function dateForDow(w,dow){const mon=weekStartFor(w);const offset=dow===0?6:dow-1;const d=new Date(mon);d.setDate(mon.getDate()+offset);return isoDate(d)}
function currentDow(){return new Date().getDay()}
function weekFromDate(date){const diff=daysBetween(settings.startDate,date);return diff<0?1:Math.floor(diff/7)+1}
function completionFor(date,title){return logs.find(x=>x.date===date&&x.title===title)}
function latestExerciseLog(name){for(const l of logs){if(l.type==='strength'&&l.exercises){const e=l.exercises.find(x=>x.name===name);if(e)return e}}return null}
function numericRepRange(s){const m=String(s).match(/(\d+)\s*-\s*(\d+)/);return m?[+m[1],+m[2]]:null}
function suggestLoad(ex){
 const prev=latestExerciseLog(ex[0]);if(!prev)return 'Start conservatief · houd 2 reps over';
 const rr=numericRepRange(ex[2]);if(!rr)return `Vorige keer: ${formatSets(prev.sets)}`;
 const valid=prev.sets.filter(s=>+s.weight>0&&+s.reps>0);if(!valid.length)return `Vorige keer: ${formatSets(prev.sets)}`;
 const allMax=valid.length>=ex[1]&&valid.slice(0,ex[1]).every(s=>+s.reps>=rr[1]&&(+s.rir||0)>=1);
 const tooHard=valid.some(s=>+s.reps<rr[0]||(+s.rir===0));
 let lastW=+valid[0].weight||0;
 if(allMax&&lastW){let inc=ex[4]==='lower'?settings.lowerIncrement:ex[4]==='db'?settings.dbIncrement:settings.upperIncrement;return `Doel: ~${lastW+inc} kg · vorige ${formatSets(valid)}`}
 if(tooHard)return `Behoud/verlaag licht · vorige ${formatSets(valid)}`;
 return `Behoud ${lastW||'gewicht'} en voeg reps toe · vorige ${formatSets(valid)}`
}
function formatSets(sets){return (sets||[]).filter(s=>s.weight||s.reps).map(s=>`${s.weight||'-'}×${s.reps||'-'} RIR${s.rir??'-'}`).join(' / ')||'geen data'}

const titles={home:'Vandaag',plan:'12+ weken plan',history:'Historie',progress:'Progressie',settings:'Instellingen',workout:'Training'};
function show(view){$$('.view').forEach(v=>v.classList.remove('active'));$(`#view-${view}`).classList.add('active');$$('.bottomnav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#pageTitle').textContent=titles[view];if(view==='home')renderHome();if(view==='plan')renderPlan();if(view==='history')renderHistory();if(view==='progress')renderProgress();if(view==='settings')renderSettings();window.scrollTo(0,0)}
$$('.bottomnav button').forEach(b=>b.onclick=()=>show(b.dataset.view));

function todayPlan(){const w=programWeek(), p=planForWeek(w);return p.find(x=>x.dow===currentDow())||p[0]}
function getTodayReadiness(){return readiness.find(x=>x.date===todayISO())}
function readinessAdvice(r){if(!r)return null;const score=(+r.sleep + +r.energy + (11-+r.soreness))/3;if(score<4.5)return{score,txt:'Lage readiness: houd kracht op RIR 3, schrap 1 accessoire-set per oefening en maak cardio rustig.'};if(score<6)return{score,txt:'Matige readiness: voer het plan uit, maar jaag geen PR’s na en houd ongeveer RIR 2-3.'};return{score,txt:'Goede readiness: normaal programma. Progressie mag als techniek en reps goed blijven.'}}
function renderHome(){
 const w=programWeek(), [phase,desc]=phaseFor(w), r=getTodayReadiness(), adv=readinessAdvice(r);
 const preStart=dateOnly(todayISO())<dateOnly(settings.startDate);
 const tp=preStart?{dow:1,day:'Programmastart',title:'Voorbereiden',type:'rest',prescription:''}:todayPlan();const date=preStart?settings.startDate:dateForDow(w,tp.dow);const done=completionFor(date,tp.title);
 $('#view-home').innerHTML=`
 <div class="card hero"><div class="eyebrow">PROGRAMMA</div><div style="display:flex;justify-content:space-between;align-items:end;gap:12px"><div><h2 style="margin:4px 0">Week ${w}</h2><div class="muted">${desc}</div></div><span class="phase-badge">${phase}</span></div><div class="space"></div><div class="bar"><span style="width:${Math.min(100,(w<=24?w/24:1)*100)}%"></span></div></div>
 <div class="grid2"><div class="metric"><small>START</small><b>${fmtDate(settings.startDate)}</b></div><div class="metric"><small>VANDAAG</small><b>${new Date().toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'})}</b></div></div>
 <div class="section-title"><h2>Training vandaag</h2>${done?'<span class="phase-badge">GEDAAN</span>':''}</div>
 <div class="card"><div class="eyebrow">${tp.day.toUpperCase()}</div><h2 style="margin:5px 0 6px">${tp.title}</h2><p class="muted">${preStart?`Je programma start op ${fmtDate(settings.startDate)}. Gebruik deze dagen voor wandelen, slaap en herstel.`:(tp.type==='strength'?strengthSummary(tp.key):tp.prescription||'Herstel. Wandelen/mobiliteit is prima.')}</p>${tp.type!=='rest'?`<button class="primary full" onclick="startWorkout('${tp.type}','${tp.key||''}','${encodeURIComponent(tp.title)}','${date}')">${done?'Nogmaals openen':'Start training'}</button>`:`<div class="callout">${preStart?'Na de startdatum berekent de app automatisch iedere trainingsweek.':'Geen geplande training. Je werkdag telt al mee als belasting; prioriteit is herstel.'}</div>`}</div>
 <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="eyebrow">READINESS</div><h3 style="margin:4px 0">${r?`${adv.score.toFixed(1)}/10`:'Nog niet ingevuld'}</h3></div><button class="secondary" id="checkinBtn">Check-in</button></div>${adv?`<p class="muted">${adv.txt}</p>`:'<p class="muted">30 seconden: slaap, energie en spierpijn. De app geeft daarna een trainingsadvies.</p>'}</div>
 <div class="section-title"><h2>Deze week</h2><button class="secondary" onclick="show('plan')">Bekijk plan</button></div>${weekCards(w,true)}`;
 $('#checkinBtn').onclick=openReadiness;
}
function strengthSummary(key){const e=W[key]||[];return `${e.length} oefeningen · full body · compounds meestal RIR 2 · progressive overload`}
function weekCards(w,compact=false){return planForWeek(w).map(p=>{const d=dateForDow(w,p.dow),done=completionFor(d,p.title),today=d===todayISO();return `<div class="daycard ${today?'today':''} ${done?'done':''}"><div><small>${p.day.toUpperCase()} · ${fmtDate(d)}</small><strong>${p.title}</strong><span class="muted">${p.type==='rest'?'Herstel':p.type==='strength'?strengthSummary(p.key):(p.prescription||'')}</span></div>${p.type==='rest'?'<span class="status">REST</span>':`<button class="secondary" onclick="startWorkout('${p.type}','${p.key||''}','${encodeURIComponent(p.title)}','${d}')">${done?'✓':'Open'}</button>`}</div>`}).join('')}

let viewedWeek=programWeek();
function renderPlan(){const [phase,desc]=phaseFor(viewedWeek);$('#view-plan').innerHTML=`<div class="card"><div class="weeknav"><button id="pw">‹</button><div style="text-align:center"><small>${phase.toUpperCase()}</small><strong>Week ${viewedWeek}</strong><div class="muted">${desc}</div></div><button id="nw">›</button></div></div>${viewedWeek===12?'<div class="callout">Na deze week stopt de app niet: week 13-24 worden automatisch toegevoegd met meer kettlebell, carries en functionele kracht. Vanaf week 25 draait een nieuw 4-weeks hybrid block door.</div>':''}${weekCards(viewedWeek)}`;$('#pw').onclick=()=>{viewedWeek=Math.max(1,viewedWeek-1);renderPlan()};$('#nw').onclick=()=>{viewedWeek++;renderPlan()}}

window.startWorkout=(type,key,titleEnc,date)=>{
 const title=decodeURIComponent(titleEnc);activeWorkout={id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),type,key,title,date,week:weekFromDate(date),startedAt:new Date().toISOString(),exercises:[]};
 $('#pageTitle').textContent=title;$$('.view').forEach(v=>v.classList.remove('active'));$('#view-workout').classList.add('active');$$('.bottomnav button').forEach(b=>b.classList.remove('active'));
 if(type==='strength')renderStrengthWorkout();else renderRunWorkout();window.scrollTo(0,0)
}
function renderStrengthWorkout(){const exs=W[activeWorkout.key]||[];const r=readiness.find(x=>x.date===todayISO()),adv=readinessAdvice(r);$('#view-workout').innerHTML=`<button class="secondary" onclick="show('home')">← Terug</button>${adv?`<div class="callout ${adv.score<4.5?'warning':''}">${adv.txt}</div>`:''}<div class="card"><div class="eyebrow">WEEK ${activeWorkout.week}</div><h2 style="margin:4px 0">${activeWorkout.title}</h2><div class="muted">Log kg, reps en RIR. Vink een set af om automatisch de rusttimer te starten.</div></div><div id="exerciseArea"></div><div class="card form-card"><label>Trainingnotitie<textarea id="workoutNote" placeholder="Techniek, pijnvrij, energie, etc."></textarea></label></div><button class="primary full" id="finishBtn">Training opslaan</button>`;
 $('#exerciseArea').innerHTML=exs.map((e,ei)=>`<div class="exercise" data-ei="${ei}"><div class="exhead"><h3>${e[0]}</h3><div class="hint">${e[1]} sets · ${e[2]} · rust ${e[3]?Math.round(e[3]/60*10)/10+' min':'EMOM'} · ${suggestLoad(e)}</div></div><div class="sethead"><span>SET</span><span>KG</span><span>REPS</span><span>RIR</span><span>✓</span></div>${Array.from({length:e[1]},(_,si)=>`<div class="setrow"><b>${si+1}</b><input inputmode="decimal" type="number" step="0.5" data-k="weight" data-e="${ei}" data-s="${si}" placeholder="kg"><input inputmode="numeric" type="number" data-k="reps" data-e="${ei}" data-s="${si}" placeholder="reps"><input inputmode="numeric" type="number" min="0" max="5" data-k="rir" data-e="${ei}" data-s="${si}" placeholder="2"><button class="tick" data-rest="${e[3]||60}" onclick="toggleSet(this)">○</button></div>`).join('')}</div>`).join('');
 $('#finishBtn').onclick=finishStrength;
}
window.toggleSet=(btn)=>{btn.classList.toggle('checked');btn.textContent=btn.classList.contains('checked')?'✓':'○';if(btn.classList.contains('checked'))startRest(+btn.dataset.rest||settings.defaultRest)}
function finishStrength(){const exs=W[activeWorkout.key]||[];activeWorkout.exercises=exs.map((e,ei)=>({name:e[0],prescription:e[2],sets:Array.from({length:e[1]},(_,si)=>{const base=`[data-e="${ei}"][data-s="${si}"]`;return {weight:+$(`input[data-k="weight"]${base}`)?.value||0,reps:+$(`input[data-k="reps"]${base}`)?.value||0,rir:+$(`input[data-k="rir"]${base}`)?.value||0}})}));activeWorkout.note=$('#workoutNote')?.value||'';saveLog(activeWorkout);stopRest();alert('Training opgeslagen. Volgende keer zie je deze prestaties als referentie.');show('home')}
function renderRunWorkout(){let prescription=planForWeek(activeWorkout.week).find(x=>x.title===activeWorkout.title)?.prescription||'Rustige cardio';$('#view-workout').innerHTML=`<button class="secondary" onclick="show('home')">← Terug</button><div class="card run-card"><div class="eyebrow">TRAININGSDOEL</div><h2>${activeWorkout.title}</h2><div class="callout">${prescription}</div><label>Afstand (km)<input id="runDistance" inputmode="decimal" type="number" step="0.01"></label><label>Duur<input id="runDuration" placeholder="bijv. 38:20"></label><label>Gem. hartslag (optioneel)<input id="runHR" inputmode="numeric" type="number"></label><label>RPE 1-10<input id="runRPE" inputmode="numeric" type="number" min="1" max="10" value="5"></label><label>Notitie<textarea id="runNote" placeholder="Scheen/kuit, ondergrond, ademhaling, gevoel..."></textarea></label></div><button class="primary full" id="finishRun">Cardio opslaan</button>`;$('#finishRun').onclick=()=>{Object.assign(activeWorkout,{distance:+$('#runDistance').value||0,duration:$('#runDuration').value||'',hr:+$('#runHR').value||0,rpe:+$('#runRPE').value||0,note:$('#runNote').value||'',prescription});saveLog(activeWorkout);alert('Cardio opgeslagen.');show('home')}}
function saveLog(log){logs=logs.filter(x=>!(x.date===log.date&&x.title===log.title));logs.unshift(log);STORE.set('logs',logs)}

function startRest(sec){stopRest();restRemaining=sec;$('#timerBar').classList.remove('hidden');drawTimer();restTimer=setInterval(()=>{restRemaining--;drawTimer();if(restRemaining<=0){stopRest();if(navigator.vibrate)navigator.vibrate([120,80,120])}},1000)}
function drawTimer(){const m=Math.floor(restRemaining/60),s=restRemaining%60;$('#timerText').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function stopRest(){clearInterval(restTimer);restTimer=null;$('#timerBar').classList.add('hidden')}
$('#timerMinus').onclick=()=>{restRemaining=Math.max(0,restRemaining-15);drawTimer()};$('#timerPlus').onclick=()=>{restRemaining+=15;drawTimer()};$('#timerStop').onclick=stopRest;

function renderHistory(){if(!logs.length){$('#view-history').innerHTML='<div class="card">Nog geen trainingen gelogd.</div>';return}$('#view-history').innerHTML=`<div class="card">${logs.map(l=>`<div class="history-item"><small>${fmtDate(l.date)} · WEEK ${l.week||'-'}</small><strong style="display:block">${l.title}</strong><span class="muted">${l.type==='run'?`${l.distance||'-'} km · ${l.duration||'-'} · RPE ${l.rpe||'-'}`:`${l.exercises?.length||0} oefeningen${l.note?' · '+l.note:''}`}</span></div>`).join('')}</div>`}
function best5k(){const rs=logs.filter(l=>l.type==='run'&&l.distance>=4.95&&l.distance<=5.2&&l.duration);if(!rs.length)return'—';const toSec=s=>{const p=s.split(':').map(Number);return p.length===2?p[0]*60+p[1]:999999};rs.sort((a,b)=>toSec(a.duration)-toSec(b.duration));return rs[0].duration}
function renderProgress(){const latest=metrics[0]||{};const totalStrength=logs.filter(l=>l.type==='strength').length,totalRuns=logs.filter(l=>l.type==='run').length;$('#view-progress').innerHTML=`<div class="grid2"><div class="metric"><small>KRACHTSESSIES</small><b>${totalStrength}</b></div><div class="metric"><small>CARDIOSESSIES</small><b>${totalRuns}</b></div><div class="metric"><small>BESTE 5 KM</small><b>${best5k()}</b></div><div class="metric"><small>PULL-UPS</small><b>${latest.pullups??'—'}</b></div></div><div class="card form-card"><div class="eyebrow">NIEUWE METING</div><label>Lichaamsgewicht (kg)<input id="mWeight" type="number" step="0.1" value="${latest.weight??''}"></label><label>Max. strikte pull-ups<input id="mPull" type="number" value="${latest.pullups??''}"></label><label>Optionele 5 km benchmark<input id="m5k" placeholder="bijv. 31:45" value="${latest.fivek??''}"></label><button class="primary full" id="saveMetric">Meting opslaan</button></div>${metrics.length?`<div class="card"><div class="eyebrow">METINGSHISTORIE</div><table class="kpi-table">${metrics.slice(0,10).map(m=>`<tr><td>${fmtDate(m.date)}</td><td>${m.weight||'—'} kg · ${m.pullups||'—'} PU · ${m.fivek||'—'}</td></tr>`).join('')}</table></div>`:''}`;$('#saveMetric').onclick=()=>{metrics.unshift({date:todayISO(),weight:+$('#mWeight').value||null,pullups:+$('#mPull').value||null,fivek:$('#m5k').value||''});STORE.set('metrics',metrics);renderProgress()}}

function renderSettings(){const w=programWeek();$('#view-settings').innerHTML=`<div class="card form-card"><div class="eyebrow">PROGRAMMA</div><label>Startdatum<input id="sStart" type="date" value="${settings.startDate}"></label><label><input id="sAuto" type="checkbox" ${settings.autoWeek?'checked':''}> Week automatisch bepalen vanaf startdatum</label><label>Handmatige week (alleen als auto uit staat)<input id="sWeek" type="number" min="1" value="${settings.manualWeek}"></label><div class="callout">Huidige berekende programmaweek: <b>${w}</b>. Na week 24 blijft het programma automatisch doorlopen in nieuwe 4-weekse hybrid blocks.</div></div><div class="card form-card"><div class="eyebrow">PROGRESSIVE OVERLOAD</div><label>Verhoging lower-body barbell (kg)<input id="sLower" type="number" step="0.5" value="${settings.lowerIncrement}"></label><label>Verhoging upper-body barbell (kg)<input id="sUpper" type="number" step="0.5" value="${settings.upperIncrement}"></label><label>Verhoging dumbbells (kg)<input id="sDb" type="number" step="0.5" value="${settings.dbIncrement}"></label><button class="primary full" id="saveSettings">Instellingen opslaan</button></div><div class="card"><div class="eyebrow">BACK-UP</div><p class="muted">Je gegevens staan lokaal op dit apparaat. Exporteer af en toe een back-upbestand.</p><div class="grid2"><button class="secondary" id="exportBtn">Data exporteren</button><button class="secondary" id="importBtn">Data importeren</button></div><input id="importFile" class="hidden" type="file" accept="application/json"><div class="space"></div><button class="danger full" id="clearBtn">Alle lokale data wissen</button></div><div class="card"><small>APP</small><p class="muted">Hybrid Athlete Coach v${APP_VERSION} · offline-ready PWA.</p></div>`;
 $('#saveSettings').onclick=()=>{settings={...settings,startDate:$('#sStart').value||settings.startDate,autoWeek:$('#sAuto').checked,manualWeek:+$('#sWeek').value||1,lowerIncrement:+$('#sLower').value||5,upperIncrement:+$('#sUpper').value||2.5,dbIncrement:+$('#sDb').value||2};STORE.set('settings',settings);viewedWeek=programWeek();alert('Instellingen opgeslagen.');renderSettings()};
 $('#exportBtn').onclick=exportData;$('#importBtn').onclick=()=>$('#importFile').click();$('#importFile').onchange=importData;$('#clearBtn').onclick=()=>{if(confirm('Dit wist workouts, metingen en instellingen op dit apparaat. Doorgaan?')){localStorage.clear();location.reload()}}
}
function exportData(){const data={version:APP_VERSION,exportedAt:new Date().toISOString(),settings,logs,metrics,readiness};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hybrid-athlete-backup-${todayISO()}.json`;a.click();URL.revokeObjectURL(a.href)}
function importData(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.settings)STORE.set('settings',d.settings);if(d.logs)STORE.set('logs',d.logs);if(d.metrics)STORE.set('metrics',d.metrics);if(d.readiness)STORE.set('readiness',d.readiness);alert('Back-up geïmporteerd.');location.reload()}catch{alert('Dit bestand kon niet worden gelezen.')}};r.readAsText(f)}

function openReadiness(){const dlg=$('#readinessDialog');const old=getTodayReadiness();if(old){$('#sleepScore').value=old.sleep;$('#energyScore').value=old.energy;$('#sorenessScore').value=old.soreness}syncReadinessLabels();dlg.showModal()}
function syncReadinessLabels(){$('#sleepVal').textContent=$('#sleepScore').value;$('#energyVal').textContent=$('#energyScore').value;$('#sorenessVal').textContent=$('#sorenessScore').value}
['sleepScore','energyScore','sorenessScore'].forEach(id=>$(`#${id}`).oninput=syncReadinessLabels);
$('#saveReadiness').onclick=()=>{readiness=readiness.filter(x=>x.date!==todayISO());readiness.unshift({date:todayISO(),sleep:+$('#sleepScore').value,energy:+$('#energyScore').value,soreness:+$('#sorenessScore').value});STORE.set('readiness',readiness);setTimeout(renderHome,0)};

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn').classList.remove('hidden')});
$('#installBtn').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBtn').classList.add('hidden')};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));

window.show=show;
renderHome();
