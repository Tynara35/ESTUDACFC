const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../dist/core.js');
const root=path.resolve(__dirname,'../dist');
const data=JSON.parse(fs.readFileSync(path.join(root,'bank.json'),'utf8'));
test('proveniência dos PDFs e gabaritos correspondentes aos cadernos',()=>{
  const crypto=require('node:crypto');
  for(const e of data.exams)for(const kind of ['proof','key'])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,e[kind+'_file']))).digest('hex'),e[kind+'_sha256']);
  assert.equal(data.questions.find(q=>q.id==='2024.1-1').answer,'B');
  assert.equal(data.questions.find(q=>q.id==='2024.1-RS-1').answer,'A');
  for(const q of data.questions.filter(q=>q.exam==='2020.1')){assert.equal(q.options.length,4);assert.doesNotMatch(q.text,/Resposta correta:|Questão: ANULADA/);}
});
test('20 provas de 2016 a 2025, mais 2026 e RS, sem questões duplicadas',()=>{
  assert.equal(data.questions.length,1150);assert.equal(data.exams.length,23);
  assert.equal(new Set(data.questions.map(q=>q.id)).size,1150);
  for(let year=2016;year<=2026;year++)for(let ed=1;ed<=2;ed++)assert.equal(data.questions.filter(q=>q.exam===`${year}.${ed}`).length,50);
  for(const q of data.questions){assert.match(q.answer,/^[ABCD*]$/);assert.ok(q.text.length>80);for(const asset of [...q.images,q.source,q.key])assert.ok(fs.existsSync(path.join(root,asset)),asset);}
});
test('banco JS e JSON idênticos',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'bank.js'),'utf8'),context);
  assert.equal(JSON.stringify(context.window.BANK),JSON.stringify(data.questions));
});
test('sorteio sem repetição, sem modificar banco, incluindo diversas edições',()=>{
  const original=JSON.stringify(data.questions);
  for(const count of [10,20,30,50]){const result=core.mixed(data.questions,count,()=>0);assert.equal(result.length,count);assert.equal(new Set(result.map(q=>q.id)).size,count);}
  const result=core.mixed(data.questions,50);assert.ok(new Set(result.map(q=>q.exam)).size>1);
  assert.equal(JSON.stringify(data.questions),original);assert.throws(()=>core.mixed(data.questions,2000));
});
test('anuladas pontuam e preliminares são sinalizadas',()=>{
  const questions=[{id:'a',answer:'A',keyStatus:'definitivo'},{id:'b',answer:'*',keyStatus:'definitivo'},{id:'c',answer:'C',keyStatus:'preliminar'}];
  assert.deepEqual(core.score(questions,{a:'A',c:'D'}),{hits:2,total:3,answered:2,provisional:true});
});
test('migração/backup filtra ids e respostas inválidas e preserva sessão válida',()=>{
  const id=data.questions[0].id;
  const s=core.normalize({answers:{[id]:'B',ghost:'A'},favorites:[id,id,'ghost'],notes:{[id]:'Revisar'},session:{ids:[id],answers:{[id]:'A'},end:Date.now()+5000,exam:'CFC 2016.1'}},data.questions);
  assert.deepEqual(s.answers,{[id]:'B'});assert.deepEqual(s.favorites,[id]);assert.equal(s.session.ids[0],id);
  assert.equal(core.normalize({session:{ids:['ghost'],end:0,exam:'invalid'}},data.questions).session,null);
});
test('PWA usa caminhos relativos e nome solicitado',()=>{
  const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(m.name,'MEU ESTUDO CFC');assert.equal(m.start_url,'./');assert.equal(m.scope,'./');
  for(const icon of m.icons)assert.ok(fs.existsSync(path.join(root,icon.src)));
  assert.doesNotMatch(fs.readFileSync(path.join(root,'index.html'),'utf8'),/Lavanda/);
});
