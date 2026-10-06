(function(root){
  function splitQuestions(text){
    const lines=text.replace(/\r/g,'').split('\n');
    const blocks=[];let current=null;
    for(const line of lines){
      if(current&&/^\s*(?:Gabarito|Resposta correta)\s*:\s*[A-E]\s*$/i.test(line)){current.text+='\n'+line;continue;}
      if(/^\s*(?:GABARITO|RESPOSTAS)\s*(?:OFICIAL|DEFINITIVO|PRELIMINAR|:|$)/i.test(line)){current=null;continue;}
      const m=line.match(/^\s*(?:QUEST[ÃA]O\s*0*(\d{1,3})(?:\s*[.):-])?|0*(\d{1,3})[.)]\s+|0*(\d{1,3})\s*$)(.*)$/i);
      const number=m?Number(m[1]||m[2]||m[3]):0;
      if(m&&number>0&&number<=200&&(!blocks.length||number===blocks.at(-1).number+1)){
        current={number,text:m[4].trim(),answer:''};blocks.push(current);
      }else if(current)current.text+='\n'+line;
    }
    return blocks.map(q=>{
      const answer=q.text.match(/(?:Gabarito|Resposta correta)\s*:\s*([A-E])/i);
      if(answer)q.answer=answer[1].toUpperCase();
      q.text=q.text.replace(/(?:Gabarito|Resposta correta)\s*:\s*[A-E][^\n]*/gi,'').trim();
      q.choices=[...new Set([...q.text.matchAll(/(?:^|\n)\s*\(?([A-Ea-e])\s*[).]\s*/g)].map(m=>m[1].toUpperCase()))];
      return q;
    }).filter(q=>q.text.length>10);
  }
  function parseKey(text){
    if([...text.matchAll(/Contador\s*-\s*\d\s*-/gi)].length>1)return {};
    const keys={},grid=new Set();let ambiguous=false;
    const put=(n,a)=>{if(keys[n]!==undefined&&keys[n]!==a)ambiguous=true;keys[n]=a;};
    const rows=text.replace(/\r/g,'').split('\n').map(row=>row.trim()).filter(Boolean);
    for(let i=0;i<rows.length-1;i++){
      if(!/^\d+(?:\s+\d+)+$/.test(rows[i])||! /^[A-E*#](?:\s+[A-E*#])+$/.test(rows[i+1]))continue;
      const numbers=rows[i].split(/\s+/),answers=rows[i+1].split(/\s+/);
      if(numbers.length===answers.length)numbers.forEach((n,j)=>{if(Number(n)>0&&Number(n)<=200){put(Number(n),answers[j]==='#'?'*':answers[j]);grid.add(Number(n));}});
    }
    for(const m of text.matchAll(/(?:^|[\s;|,])0*(\d{1,3})\s*[-.):–]?\s*(ANULADA|[A-E#*])(?=$|[\s;|,])/gim)){
      const n=Number(m[1]);if(n>0&&n<=200&&!grid.has(n))put(n,/ANULADA|#|\*/i.test(m[2])?'*':m[2].toUpperCase());
    }
    return ambiguous?{}:keys;
  }
  function validate(questions){
    if(!questions.length||questions.length>200)return false;
    return questions.every(q=>q.text.trim().length>=20&&['A','B','C','D'].every(a=>new RegExp('(?:^|\\n)\\s*\\(?'+a+'\\s*[).]','i').test(q.text))&&/^[A-E*]$/.test(q.answer)&& (q.answer==='*'||new RegExp('(?:^|\\n)\\s*\\(?'+q.answer+'\\s*[).]','i').test(q.text)));
  }
  const api={splitQuestions,parseKey,validate};
  if(typeof module!=='undefined')module.exports=api;else root.PdfParser=api;
})(globalThis);
