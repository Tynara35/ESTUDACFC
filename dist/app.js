const bank=window.BANK, exams=window.EXAMS;
const byId=new Map(bank.map(q=>[q.id,q]));
let personalRecords=[],personalURLs=new Map(),ready=false;
function hydrateImports(records){
  for(const urls of personalURLs.values())urls.forEach(url=>URL.revokeObjectURL(url));
  personalURLs.clear();
  for(let i=bank.length-1;i>=0;i--)if(bank[i].personal)bank.splice(i,1);
  for(let i=exams.length-1;i>=0;i--)if(exams[i].personal)exams.splice(i,1);
  personalRecords=records;
  for(const r of records){
    const proof=URL.createObjectURL(r.proof),key=r.key?URL.createObjectURL(r.key):'';
    personalURLs.set(r.id,[proof,...(key?[key]:[])]);
    exams.push({id:r.id,label:r.title,personal:true,type:'pessoal',key_status:'pessoal',count:r.questions.length,note:'Gabarito informado e conferido na importação.'});
    r.questions.forEach((q,i)=>bank.push({id:r.id+'-'+(i+1),exam:r.id,number:i+1,subject:'Meus PDFs',text:q.text,images:[],options:[],answer:q.answer,keyStatus:'pessoal',personal:true,source:proof,key,page:1,choices:[...'ABCDE'].filter(a=>new RegExp('(?:^|\\n)\\s*\\(?'+a+'\\s*[).]','i').test(q.text))}));
  }
  byId.clear();bank.forEach(q=>byId.set(q.id,q));PdfImport.setRecords(records);
}
const app=document.querySelector('#app');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved;
try {saved=JSON.parse(localStorage.getItem('meu-estudo-cfc-v2')||localStorage.getItem('lavanda-v1'));} catch {}
let state=StudyCore.normalize(saved||{},bank);
let view=state.session?'exam':'study',examFilter='',subjectFilter='',search='',index=0,selected=null,revealed=false;
let mode='specific',chosenExam=exams.at(-1).id,mixedCount=50,includePreliminary=true,persistenceWarning=false,review=null;
function confirm(message){
  return new Promise(resolve=>{
    const modal=document.createElement('dialog');
    modal.innerHTML=`<p>${esc(message)}</p><div class="actions"><button data-cancel>Cancelar</button><button data-confirm class="primary">Confirmar</button></div>`;
    document.body.append(modal);
    const close=value=>{modal.close();modal.remove();resolve(value);};
    modal.querySelector('[data-cancel]').onclick=()=>close(false);
    modal.querySelector('[data-confirm]').onclick=()=>close(true);
    modal.oncancel=e=>{e.preventDefault();close(false);};modal.showModal();
  });
}
function save(){
  let local=false;
  try{localStorage.setItem('meu-estudo-cfc-v2',JSON.stringify(state));local=true;}catch{}
  StudyDB.write(state).then(()=>{persistenceWarning=false;}).catch(()=>{persistenceWarning=!local;});
}
const valid=()=>Object.entries(state.answers).filter(([id])=>byId.has(id)&&byId.get(id).answer!=='*'&&byId.get(id).keyStatus!=='preliminar');
const correct=()=>valid().filter(([id,a])=>byId.get(id).answer===a).length;
const examLabel=e=>esc(e.label||e.id)+(e.key_status==='preliminar'?' · preliminar':'');
function stats(){return `<div class="stats"><div class="stat"><small>Questões oficiais</small><strong>${bank.length.toLocaleString('pt-BR')}</strong></div><div class="stat"><small>Respondidas</small><strong>${Object.keys(state.answers).length}</strong></div><div class="stat"><small>Aproveitamento definitivo</small><strong>${valid().length?Math.round(correct()/valid().length*100):0}%</strong></div></div>`;}
function pool(){return bank.filter(q=>(!examFilter||q.exam===examFilter)&&(!subjectFilter||q.subject===subjectFilter)&&(!search||q.text.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))&&(view!=='errors'||state.answers[q.id]&&state.answers[q.id]!==q.answer&&q.answer!=='*')&&(view!=='favorites'||state.favorites.includes(q.id)));}
function filters(){return `<div class="filters"><label>Prova<select id="exam-filter"><option value="">Todas as provas</option>${exams.map(e=>`<option value="${e.id}" ${examFilter===e.id?'selected':''}>${examLabel(e)}</option>`).join('')}</select></label><label>Matéria<select id="subject-filter"><option value="">Todas as matérias</option>${[...new Set(bank.map(q=>q.subject))].sort().map(s=>`<option ${s===subjectFilter?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label>Buscar no enunciado<input id="search" value="${esc(search)}" placeholder="Palavra-chave"></label></div>`;}
function resetQuestion(){selected=null;revealed=false;}
function question(q,total,isExam=false){
  if(!q)return '<div class="empty">Nenhuma questão por aqui.</div>';
  const answer=isExam?state.session.answers[q.id]:review?review.answers[q.id]:state.answers[q.id];
  const show=!isExam&&(revealed||review),e=exams.find(e=>e.id===q.exam);
  const original=(q.images.length?`<details open><summary>Enunciado original</summary>${q.images.map(src=>`<a href="${src}" target="_blank" rel="noopener" title="Ampliar enunciado"><img src="${src}" alt="Questão ${q.number}, CFC ${q.exam}: enunciado e alternativas" loading="lazy"></a>`).join('')}</details>`:'')+(q.options?.length?`<div class="text-question">${q.options.map((o,i)=>`<p><strong>${'ABCD'[i]})</strong> ${esc(o)}</p>`).join('')}</div>`:'');
  return `<article class="question"><div class="qhead"><span>CFC ${q.exam} · ${e.type==='único'?'Caderno único':'Tipo 1'} · Questão ${q.number}<br>${esc(q.subject)}</span><button id="favorite" aria-label="${state.favorites.includes(q.id)?'Remover dos favoritos':'Salvar nos favoritos'}" title="Favorita">${state.favorites.includes(q.id)?'★':'☆'}</button></div>${q.keyStatus==='preliminar'?'<p class="notice">Gabarito preliminar: a resposta pode mudar após recursos.</p>':''}${e.note?`<p class="quiet">${esc(e.note)}</p>`:''}${original}<details ${!q.images.length?'open':''}><summary>Enunciado em texto</summary><div class="text-question">${esc(q.text)}</div></details><div class="answer-options" role="group" aria-label="Escolha sua resposta">${[...'ABCD'].map(a=>`<button aria-pressed="${selected===a}" class="${selected===a?'selected':''}" data-answer="${a}">${a}</button>`).join('')}</div>${show?`<div class="feedback ${q.answer!=='*'&&answer!==q.answer?'wrong':''}" role="status">${q.answer==='*'?'Questão anulada.':answer===q.answer?'Resposta correta!':`Sua resposta: ${answer||'não respondida'}. Gabarito: ${q.answer}.`}<br><span class="quiet">Gabarito ${q.keyStatus}. ${q.keyStatus==='preliminar'||q.answer==='*'?'Não entra no aproveitamento definitivo.':''}</span></div>`:''}<div class="actions"><button id="previous" ${index===0?'disabled':''} aria-label="Questão anterior" title="Anterior">←</button><span class="quiet">${index+1} de ${total}</span>${isExam?`<button id="register" class="primary" ${!selected?'disabled':''}>Salvar resposta</button>`:`<button id="check" class="primary" ${!selected?'disabled':''}>Conferir resposta</button>`}<button id="next" ${index===total-1?'disabled':''} aria-label="Próxima questão" title="Próxima">→</button></div>${!isExam?`<div class="notes"><label>Minhas anotações<textarea id="note">${esc(state.notes[q.id]||'')}</textarea></label></div>`:''}<div class="links">${!isExam?`<a href="${q.source}#page=${q.page}" target="_blank" rel="noopener">Prova oficial ↗</a><a href="${q.key}" target="_blank" rel="noopener">Gabarito ${q.keyStatus} ↗</a>`:''}</div></article>`;
}
function wireQuestion(q,isExam=false){
  if(!q)return;
  if(q.personal){
    document.querySelector('.qhead>span').textContent=`${exams.find(e=>e.id===q.exam).label} · Questão ${q.number} · Meus PDFs`;
    document.querySelector('.answer-options').innerHTML=q.choices.map(a=>`<button aria-pressed="${selected===a}" class="${selected===a?'selected':''}" data-answer="${a}">${a}</button>`).join('');
    if(!isExam)document.querySelector('.question .links').innerHTML=`<a href="${q.source}" target="_blank" rel="noopener">PDF anexado ↗</a>${q.key?`<a href="${q.key}" target="_blank" rel="noopener">Gabarito anexado ↗</a>`:''}`;
  }
  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{selected=b.dataset.answer;render();});
  document.querySelector('#favorite').onclick=()=>{state.favorites=state.favorites.includes(q.id)?state.favorites.filter(id=>id!==q.id):[...state.favorites,q.id];save();render();};
  document.querySelector('#previous').onclick=()=>{index--;resetQuestion();render();};
  document.querySelector('#next').onclick=()=>{index++;resetQuestion();render();};
  if(isExam)document.querySelector('#register').onclick=()=>{state.session.answers[q.id]=selected;save();render();};
  else{
    document.querySelector('#check').onclick=()=>{state.answers[q.id]=selected;if(review)review.answers[q.id]=selected;revealed=true;save();render();};
    document.querySelector('#note').oninput=e=>{state.notes[q.id]=e.target.value;save();};
  }
}
function finish(){
  const s=state.session;if(!s)return;
  const qs=s.ids.map(id=>byId.get(id)),result=StudyCore.score(qs,s.answers);
  review={ids:[...s.ids],answers:{...s.answers},exam:s.exam,...result};
  Object.assign(state.answers,s.answers);
  state.history.unshift({...result,exam:s.exam,date:new Date().toISOString(),ids:[...s.ids],answers:{...s.answers}});
  state.history=state.history.slice(0,200);state.session=null;index=0;resetQuestion();save();render();
}
function history(){return state.history.length?'<div class="list">'+state.history.map((h,i)=>`<div class="list-row"><div><strong>${esc(h.exam)}</strong><p>${new Date(h.date).toLocaleDateString('pt-BR')} · ${h.answered||0} respondidas${h.provisional?' · Resultado preliminar':''}</p></div><strong>${h.hits}/${h.total}</strong>${h.ids?`<button data-review="${i}">Revisar</button>`:''}</div>`).join('')+'</div>':'<p class="quiet">Nenhum simulado concluído.</p>';}
function wireHistory(){document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{review=structuredClone(state.history[Number(b.dataset.review)]);view='exam';index=0;resetQuestion();render();});}
function renderExam(){
  const chosen=exams.find(e=>e.id===chosenExam);
  const s=state.session;
  if(s){
    const qs=s.ids.map(id=>byId.get(id));index=Math.max(0,Math.min(index,qs.length-1));
    if(selected===null)selected=s.answers[qs[index].id]||null;
    app.innerHTML=`<div class="session-banner"><span>${esc(s.exam)} · ${Object.keys(s.answers).length}/${qs.length} respondidas</span><strong id="timer" class="timer"></strong><button id="finish" class="danger">Finalizar</button></div><div class="map">${qs.map((q,i)=>`<button class="${s.answers[q.id]?'done':''} ${i===index?'current':''}" data-jump="${i}" aria-label="Questão ${i+1}">${i+1}</button>`).join('')}</div>`+question(qs[index],qs.length,true);
    wireQuestion(qs[index],true);
    document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{index=Number(b.dataset.jump);resetQuestion();render();});
    document.querySelector('#finish').onclick=async()=>{const remaining=qs.length-Object.keys(s.answers).length;if(!remaining||await confirm(`Há ${remaining} questões sem resposta. Finalizar?`))finish();};tick();return;
  }
  if(review){
    const qs=review.ids.map(id=>byId.get(id)).filter(Boolean);index=Math.max(0,Math.min(index,qs.length-1));
    app.innerHTML=`<div class="result-head"><h2>${review.hits}/${review.total} pontos</h2><button id="new-exam">Novo simulado</button></div><p class="quiet">${esc(review.exam)}${review.provisional?' · Resultado preliminar':''}</p>`+question(qs[index],qs.length);
    document.querySelector('#new-exam').onclick=()=>{review=null;index=0;resetQuestion();render();};wireQuestion(qs[index]);return;
  }
  app.innerHTML=`<div class="exam-config"><div class="segmented" role="group" aria-label="Modo de simulado"><button id="specific" aria-pressed="${mode==='specific'}">Prova específica</button><button id="mixed" aria-pressed="${mode==='mixed'}">Questões misturadas</button></div>${mode==='specific'?`<label>Prova<select id="exam-choice">${exams.map(e=>`<option value="${e.id}" ${chosenExam===e.id?'selected':''}>${examLabel(e)}</option>`).join('')}</select></label>`:`<label>Quantidade<select id="mixed-count">${[10,20,30,50].map(n=>`<option ${mixedCount===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="checkbox"><input id="preliminary" type="checkbox" ${includePreliminary?'checked':''}>Incluir provas com gabarito preliminar</label>`}<p class="quiet">${mode==='specific'?'50 questões · 4 horas':mixedCount+' questões · '+Math.round(mixedCount*4.8)+' minutos'} · Correção ao finalizar</p><button class="primary" id="start">Iniciar simulado</button></div><h2 class="section-title">Últimos simulados</h2>`+history();
  document.querySelector('#specific').onclick=()=>{mode='specific';render();};document.querySelector('#mixed').onclick=()=>{mode='mixed';render();};
  if(mode==='specific'){
    const hint=document.querySelector('.exam-config .quiet');hint.textContent=`${chosen.count} questões · ${Math.round(chosen.count*4.8)} minutos · Correção ao finalizar`;
    document.querySelector('#exam-choice').onchange=e=>{chosenExam=e.target.value;render();};
  }
  else{document.querySelector('#mixed-count').onchange=e=>{mixedCount=Number(e.target.value);render();};document.querySelector('#preliminary').onchange=e=>{includePreliminary=e.target.checked;};}
  document.querySelector('#start').onclick=()=>{
    const qs=mode==='specific'?bank.filter(q=>q.exam===chosenExam):StudyCore.mixed(bank.filter(q=>includePreliminary||q.keyStatus!=='preliminar'),mixedCount);
    state.session={exam:mode==='specific'?(chosen.label||'CFC '+chosenExam):'Misturadas · todas as provas'+(includePreliminary?'':' sem preliminares'),ids:qs.map(q=>q.id),answers:{},end:Date.now()+qs.length*4.8*60000};
    review=null;index=0;resetQuestion();save();render();
  };wireHistory();
}
function render(){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const names={study:'Questões',errors:'Caderno de erros',favorites:'Favoritas',exam:'Simulado',progress:'Meu progresso',sources:'Provas oficiais',uploads:'Meus PDFs'};
  document.querySelector('#title').textContent=names[view];document.querySelector('#subtitle').textContent=view==='study'?`${exams.filter(e=>!e.personal).length} provas oficiais · ${personalRecords.length} pessoais`:'';
  if(['study','errors','favorites'].includes(view)){
    const qs=pool();index=Math.max(0,Math.min(index,qs.length-1));app.innerHTML=stats()+filters()+question(qs[index],qs.length);
    document.querySelector('#exam-filter').onchange=e=>{examFilter=e.target.value;index=0;resetQuestion();render();};
    document.querySelector('#subject-filter').onchange=e=>{subjectFilter=e.target.value;index=0;resetQuestion();render();};
    document.querySelector('#search').oninput=e=>{search=e.target.value;index=0;resetQuestion();const pos=e.target.selectionStart;render();const input=document.querySelector('#search');input.focus();input.setSelectionRange(pos,pos);};wireQuestion(qs[index]);
  }
  if(view==='exam')renderExam();
  if(view==='uploads')PdfImport.render(app,{
    refresh:()=>{if(view==='uploads')render();},
    save:async record=>{
      if(state.session?.ids.some(id=>id.startsWith(record.id+'-'))){const error=new Error('Finalize o simulado desta prova antes de editar.');error.name='ActiveSession';throw error;}
      await StudyDB.putImport(record);
      if(personalRecords.some(r=>r.id===record.id)){
        for(const id of [...byId.keys()].filter(id=>id.startsWith(record.id+'-'))){delete state.answers[id];delete state.notes[id];state.favorites=state.favorites.filter(f=>f!==id);}
        state.history=state.history.filter(h=>!h.ids?.some(id=>id.startsWith(record.id+'-')));
      }
      hydrateImports([...personalRecords.filter(r=>r.id!==record.id),record]);save();
    },
    simulate:id=>{if(state.session){view='exam';render();return;}chosenExam=id;mode='specific';review=null;index=0;resetQuestion();view='exam';render();},
    remove:async id=>{
      if(state.session?.ids.some(qid=>qid.startsWith(id+'-'))){await confirm('Finalize o simulado que usa esta prova antes de excluí-la.');return;}
      if(!await confirm('Excluir este PDF, suas questões e o progresso vinculado neste dispositivo?'))return;
      try{await StudyDB.deleteImport(id);state.history=state.history.filter(h=>!h.ids?.some(qid=>qid.startsWith(id+'-')));hydrateImports(personalRecords.filter(r=>r.id!==id));state=StudyCore.normalize(state,bank);chosenExam=exams.at(-1).id;save();render();}catch{app.insertAdjacentHTML('afterbegin','<p role="alert">Não foi possível excluir o arquivo.</p>');}
    }
  });
  if(view==='progress'){
    app.innerHTML=stats()+`<p class="quiet">Última resposta por questão; exclui anuladas e gabaritos preliminares. Dados salvos neste dispositivo.</p><h2>Histórico de simulados</h2>`+history()+`<div class="backup-actions"><button id="export">Exportar progresso</button><button id="import">Importar progresso</button><input type="file" id="backup" accept="application/json,.json" hidden></div>`;
    document.querySelector('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='meu-estudo-cfc-progresso.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    document.querySelector('#import').onclick=()=>document.querySelector('#backup').click();
    document.querySelector('#backup').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw new Error('Arquivo muito grande');const imported=StudyCore.normalize(JSON.parse(await file.text()),bank);if(await confirm('Substituir o progresso deste dispositivo pelo backup?')){state=imported;save();review=null;render();}}catch{app.insertAdjacentHTML('afterbegin','<p class="notice" role="alert">Backup inválido. Use um arquivo de progresso exportado pelo aplicativo.</p>');}};wireHistory();
  }
  if(view==='sources'){
    const exams=window.EXAMS.filter(e=>!e.personal),bank=window.BANK.filter(q=>!q.personal);
    app.innerHTML=`<p class="quiet">${bank.length} questões · 20 provas de 2016–2025, mais 2026 e reaplicação RS. As versões preliminares estão identificadas. Conteúdo misto indica questões ainda não classificadas por matéria.</p>`+exams.map(e=>`<div class="file-row"><h2>CFC ${e.id}</h2><p>${e.count} questões · ${e.annulled} anuladas · Gabarito ${e.key_status}</p>${e.note?`<p class="quiet">${esc(e.note)}</p>`:''}<div class="links"><a href="${e.proof_file}" target="_blank" rel="noopener">Prova PDF ↗</a><a href="${e.key_file}" target="_blank" rel="noopener">Gabarito PDF ↗</a><a href="${e.page}" target="_blank" rel="noopener">Página oficial ↗</a></div></div>`).join('')+'<p class="quiet">Sem vínculo com CFC, FBC, Consulplan ou FGV. As normas e respostas refletem a época da prova.</p>';
  }
  const labels=app.querySelectorAll('.stat small');if(labels.length){labels[0].textContent='Questões';labels[2].textContent='Aproveitamento';}
  if(persistenceWarning)app.insertAdjacentHTML('afterbegin','<p role="alert">Não foi possível salvar. Exporte seu progresso antes de sair.</p>');
}
function tick(){if(!state.session)return;const secs=Math.max(0,Math.ceil((state.session.end-Date.now())/1000));const el=document.querySelector('#timer');if(el)el.textContent=[Math.floor(secs/3600),Math.floor(secs%3600/60),secs%60].map(n=>String(n).padStart(2,'0')).join(':');if(!secs)finish();}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{if(!ready)return;view=b.dataset.view;review=null;index=0;resetQuestion();render();});
StudyDB.init(bank,exams).then(async()=>{
  hydrateImports(await StudyDB.imports());
  state=StudyCore.normalize(saved||await StudyDB.read()||{},bank);view=state.session?'exam':'study';ready=true;save();render();
}).catch(()=>{ready=true;render();});
setInterval(()=>{if(ready)tick();},1000);app.innerHTML='<p role="status">Carregando banco de questões…</p>';
