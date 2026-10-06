const test=require('node:test');
const assert=require('node:assert/strict');
const parser=require('../dist/pdf-parser.js');
const text='QUESTAO 1\nQual alternativa responde corretamente?\nA) Um\nB) Dois\nC) Tres\nD) Quatro\nGabarito: B\nQUESTAO 2\nOutra pergunta com alternativas.\nA) Sim\nB) Nao\nC) Talvez\nD) Nenhuma\nResposta correta: D';
test('separa questoes e gabaritos no mesmo PDF',()=>{
  const q=parser.splitQuestions(text);assert.equal(q.length,2);assert.deepEqual(q.map(q=>q.answer),['B','D']);assert.ok(parser.validate(q));
});
test('le gabarito em pares, grades e anuladas',()=>{
  assert.deepEqual(parser.parseKey('1 B\n2 C\n3 ANULADA'),{1:'B',2:'C',3:'*'});
  assert.deepEqual(parser.parseKey('1 2 3 4\nB C D A'),{1:'B',2:'C',3:'D',4:'A'});
});
test('recusa texto vazio e respostas sem conferir',()=>{
  assert.deepEqual(parser.splitQuestions(''),[]);assert.equal(parser.validate([]),false);
  const q=parser.splitQuestions(text);q[0].answer='';assert.equal(parser.validate(q),false);
  q[0].answer='E';assert.equal(parser.validate(q),false);
});
test('nao escolhe silenciosamente entre gabaritos de cadernos diferentes',()=>{
  assert.deepEqual(parser.parseKey('Contador - 1 - Manha\n1 A\nContador - 2 - Manha\n1 B'),{});
  assert.deepEqual(parser.parseKey('1 A\n2 C\n1 B\n2 C'),{});
});
