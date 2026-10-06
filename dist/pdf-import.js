window.PdfImport=(()=>{
  let records=[],draft=null,busy=false,message='',proofFile=null,keyFile=null,proofURL='',library;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function pdfText(file){
    if(!file||file.size>25*1024*1024)throw new Error('Selecione um PDF de até 25 MB.');
    const data=new Uint8Array(await file.arrayBuffer());
    if(!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-'))throw new Error('O arquivo não é um PDF válido.');
    library=library||await import('./vendor/pdfjs/pdf.mjs');
    library.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',location.href).href;
    const task=library.getDocument({data,isEvalSupported:false,cMapUrl:new URL('./vendor/pdfjs/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',location.href).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',location.href).href});
    let doc;
    try{
      doc=await task.promise;if(doc.numPages>200)throw new Error('Limite de 200 páginas por PDF.');
      const pages=[];
      for(let n=1;n<=doc.numPages;n++){
        const page=await doc.getPage(n),content=await page.getTextContent();
        const items=content.items.filter(i=>i.str?.trim()).sort((a,b)=>Math.abs(a.transform[5]-b.transform[5])>3?b.transform[5]-a.transform[5]:a.transform[4]-b.transform[4]);
        let rows=[],row=[],y=null;
        for(const item of items){if(y!==null&&Math.abs(item.transform[5]-y)>3){rows.push(row.join(' '));row=[];}row.push(item.str);y=item.transform[5];}
        if(row.length)rows.push(row.join(' '));pages.push(rows.join('\n'));page.cleanup();
      }
      return pages.join('\n');
    }finally{await task.destroy();}
  }
  function setRecords(items){records=items;}
  function reset(){draft=null;proofFile=null;keyFile=null;if(proofURL)URL.revokeObjectURL(proofURL);proofURL='';message='';}
  function render(container,actions){
    container.innerHTML=`<div class="upload-form"><label>Nome da prova<input id="pdf-title" maxlength="80" value="${escape(draft?.title||'')}" ${busy?'disabled':''}></label><label>PDF das questões<input id="pdf-proof" type="file" accept=".pdf,application/pdf" ${busy?'disabled':''}></label><label>PDF do gabarito (opcional)<input id="pdf-key" type="file" accept=".pdf,application/pdf" ${busy?'disabled':''}></label><div class="actions"><button id="pdf-read" class="primary" ${busy?'disabled':''}>${busy?'Lendo PDF…':'Ler arquivos'}</button>${draft?'<button id="pdf-reset">Nova importação</button>':''}</div></div><p class="quiet">Arquivos pessoais · Até 25 MB e 200 páginas por PDF · Salvos apenas neste dispositivo</p><p id="pdf-message" role="status">${escape(message)}</p>${draft?`<section class="import-review"><div class="result-head"><h2>Conferir importação</h2>${proofURL?`<a href="${proofURL}" target="_blank" rel="noopener">Abrir PDF original ↗</a>`:''}</div><p class="notice">${draft.questions.length} questões identificadas. Confira a numeração, as tabelas, os textos compartilhados e o gabarito antes de salvar.${draft.scanned?' O PDF não contém texto legível; preencha as questões manualmente.':''}</p><div id="draft-questions">${draft.questions.map((q,i)=>`<div class="draft-question"><div class="result-head"><strong>Questão ${i+1} · nº original ${q.number}</strong><button data-remove="${i}" aria-label="Excluir questão ${i+1}" title="Excluir questão">×</button></div><label>Enunciado e alternativas<textarea data-text="${i}" rows="8">${escape(q.text)}</textarea></label><label>Resposta correta<select data-key="${i}"><option value="">Sem gabarito</option>${[...'ABCDE','*'].map(a=>`<option value="${a}" ${q.answer===a?'selected':''}>${a==='*'?'Anulada':a}</option>`).join('')}</select></label></div>`).join('')}</div><div class="actions"><button id="pdf-add" ${draft.questions.length>=200?'disabled':''}>Adicionar questão</button><button id="pdf-save" class="primary">Salvar prova</button></div><label class="checkbox review-check"><input id="pdf-reviewed" type="checkbox">Conferi os enunciados, alternativas e respostas</label><p id="pdf-validation" role="alert"></p></section>`:''}<h2 class="section-title">Meus PDFs</h2>${records.length?records.map(r=>`<div class="file-row"><div class="result-head"><div><h2>${escape(r.title)}</h2><p>${r.questions.length} questões · ${escape(r.proof.name)}</p></div><div class="actions"><button data-simulate="${r.id}" class="primary">Fazer simulado</button><button data-edit="${r.id}">Editar</button><button data-delete="${r.id}" class="danger">Excluir</button></div></div></div>`).join(''):'<p class="quiet">Nenhum PDF importado.</p>'}`;
    document.querySelector('#pdf-title').oninput=e=>{if(draft)draft.title=e.target.value;};
    document.querySelector('#pdf-proof').onchange=e=>{proofFile=e.target.files[0]||null;};
    document.querySelector('#pdf-key').onchange=e=>{keyFile=e.target.files[0]||null;};
    document.querySelector('#pdf-read').onclick=async()=>{
      const title=document.querySelector('#pdf-title').value.trim();
      if(!proofFile){message='Selecione o PDF das questões.';actions.refresh();return;}
      busy=true;message='Lendo arquivos no dispositivo…';const proof=proofFile,key=keyFile;actions.refresh();
      try{
        const text=await pdfText(proof),keyText=key?await pdfText(key):'';
        const questions=PdfParser.splitQuestions(text),keys=key?PdfParser.parseKey(keyText):{};
        if(proofURL)URL.revokeObjectURL(proofURL);proofURL=URL.createObjectURL(proof);
        draft={id:'pdf-'+crypto.randomUUID(),title:title||proof.name.replace(/\.pdf$/i,''),proof,key,questions:questions.map(q=>({...q,answer:keys[q.number]||q.answer})),scanned:text.trim().length<30};
        message=questions.length?'Leitura concluída. Importação ainda não salva.':'Não foi possível separar as questões automaticamente. Você pode adicioná-las manualmente.';
        if(key&&!Object.keys(keys).length)message+=' Gabarito não identificado ou com vários cadernos: preencha as respostas do seu caderno manualmente ou anexe um gabarito com apenas ele.';
      }catch(e){message=e.name==='PasswordException'?'PDF protegido por senha. Anexe uma versão desbloqueada.':'Não foi possível ler o PDF. '+e.message;}
      finally{busy=false;actions.refresh();}
    };
    if(draft){
      document.querySelectorAll('[data-text]').forEach(el=>el.oninput=()=>{draft.questions[Number(el.dataset.text)].text=el.value;});
      document.querySelectorAll('[data-key]').forEach(el=>el.onchange=()=>{draft.questions[Number(el.dataset.key)].answer=el.value;});
      document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{draft.questions.splice(Number(el.dataset.remove),1);actions.refresh();});
      document.querySelector('#pdf-add').onclick=()=>{draft.questions.push({number:draft.questions.length+1,text:'\nA) \nB) \nC) \nD) ',answer:''});actions.refresh();};
      document.querySelector('#pdf-reset').onclick=()=>{reset();actions.refresh();};
      document.querySelector('#pdf-save').onclick=async()=>{
        draft.title=document.querySelector('#pdf-title').value.trim();const error=document.querySelector('#pdf-validation');
        if(!draft.title||!PdfParser.validate(draft.questions)){error.textContent='Preencha um nome, pelo menos uma questão com enunciado, alternativas A)–D) em linhas separadas e um gabarito válido em cada questão.';return;}
        if(!document.querySelector('#pdf-reviewed').checked){error.textContent='Confirme a revisão antes de salvar.';return;}
        const button=document.querySelector('#pdf-save');button.disabled=true;
        try{await actions.save({...draft,scanned:undefined,questions:draft.questions.map(q=>({number:q.number,text:q.text.trim(),answer:q.answer}))});reset();message='Prova salva. Já disponível nos simulados.';actions.refresh();}catch(e){error.textContent=e.name==='ActiveSession'?e.message:'Não foi possível salvar no dispositivo. Verifique o espaço disponível.';button.disabled=false;}
      };
    }
    document.querySelectorAll('[data-simulate]').forEach(b=>b.onclick=()=>actions.simulate(b.dataset.simulate));
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
      const r=records.find(r=>r.id===b.dataset.edit);reset();draft={...r,questions:r.questions.map(q=>({...q}))};proofFile=r.proof;keyFile=r.key;proofURL=URL.createObjectURL(r.proof);actions.refresh();
    });
    document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>actions.remove(b.dataset.delete));
  }
  return {render,setRecords};
})();
