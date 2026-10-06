import sys,json,re,hashlib,sqlite3
from pathlib import Path
import pymupdf as fitz
sys.stdout.reconfigure(encoding='utf8',errors='replace')
ROOT=Path(__file__).resolve().parents[1]/'dist';records=json.loads((ROOT/'sources.json').read_text(encoding='utf8'));subjects=json.loads((Path(__file__).parent/'subjects.json').read_text(encoding='utf8'))
bank=[];exams=[]
for r in records:
 ex=r['id'];doc=fitz.open(ROOT/r['proof_file']);key=fitz.open(ROOT/r['key_file']);kt=''.join(p.get_text() for p in key)
 if ex!='2020.1':
  if ex=='2026.1':
   pairs=re.findall(r'^\s*(\d{1,2})\s*\n\s*([ABCD*])\s*$',key[0].get_text(),re.M)
   amap={int(n):a for n,a in pairs};assert len(amap)==50,(ex,'keys',len(amap))
  elif int(ex[:4])>=2024:
   first=re.split(r'(?:PROVA TIPO|Contador\s*-)',kt,flags=re.I)[1]
   answers=re.findall(r'^\s*([ABCD*#])\s*$',first,re.M);assert len(answers)==50,(ex,'keys',len(answers))
   amap={i+1:a.replace('#','*') for i,a in enumerate(answers)}
  else:
   first=re.split(r'CURSO:[^\n]*TIPO\s*0?2',kt,flags=re.I)[0]
   pairs=re.findall(r'^\s*(\d{1,2})\s*\n\s*(ANULADA|[ABCD#*])\s*$',first,re.M)
   amap={int(n):'*' if a in ['#','*','ANULADA'] else a for n,a in pairs};assert len(amap)==50,(ex,'keys',len(amap))
 lines=[];marks=[];heads=[]
 for pi,p in enumerate(doc):
  for b in p.get_text('dict')['blocks']:
   for line in b.get('lines',[]):
    spans=line['spans'];t=''.join(s['text'] for s in spans).strip();box=line['bbox'];size=max(s['size'] for s in spans)
    if not t:continue
    if int(ex[:4])<=2017:
     if pi<6 or box[1]<58 or box[3]>544:continue
     m=re.match(r'^(\d{1,2})\.(?:\s+\D|$)',t) if box[0]<23 else None
    elif ex=='2020.1':
     m=re.match(r'^(\d{1,2})\s+Questão:',t)
    else:
     if pi<1 or box[1]<44 or box[3]>803:continue
     m=re.fullmatch(r'(\d{1,2})',t) if box[0]<45 and size>=(9.9 if int(ex[:4])>=2024 else 11) else None
    lines.append((pi,box,t))
    if m and 1<=int(m[1])<=50:
     if marks and marks[-1][1]==pi and abs(marks[-1][2]-box[1])<2:continue
     marks.append((int(m[1]),pi,box[1],box[3]))
    if ex=='2020.1' and re.fullmatch(r'(?:CONTABILIDADE|AUDITORIA|PERÍCIA|LÍNGUA|NOÇÕES|LEGISLAÇÃO|MATEMÁTICA|TEORIA)[A-ZÀ-Ú /–-]*',t) and size>=10 and box[0]<60 and not m:heads.append((pi,box[1],t))
 print(ex,'markers',len(marks),flush=True)
 assert len(marks)==50,(ex,'markers',len(marks))
 if ex!='2020.1':assert [m[0] for m in marks]==list(range(1,51)),ex
 contexts=[]
 for lp,box,t in lines:
  m=re.search(r'quest(?:ões|ão)(?: de número)?\s+(\d{1,2})(?:\s+e\s+(\d{1,2}))?',t,re.I)
  if m and re.search(r'texto|situação hipotética',t,re.I):
   nums=[int(m[1])]+([int(m[2])] if m[2] else [])
   target=next((mark for mark in marks if mark[0]==min(nums) and (mark[1],mark[2])>(lp,box[1])),None)
   if target:contexts.append((nums,lp,box[1],target[1],target[2]))
 for idx,(original,pi,top,bottom) in enumerate(marks):
  n=idx+1;end=marks[idx+1][1:3] if idx<49 else (len(doc)-1,doc[-1].rect.height-38)
  texts=[];images=[];segments=[]
  for pg in range(pi,end[0]+1):
   lo=top-1 if pg==pi else (0 if ex=='2020.1' else 58 if int(ex[:4])<=2017 else 44)
   hi=end[1]-2 if pg==end[0] else (544 if int(ex[:4])<=2017 else 803)
   content=[(b,t) for lp,b,t in lines if lp==pg and b[1]>=lo-1 and b[3]<=hi+1]
   if not content:continue
   hi=max(b[3] for b,t in content)+3
   segments.append((pg,lo,hi,content));texts.extend(t for b,t in content)
  shared=[];sharedtext=[]
  for nums,cp,cy,ep,ey in contexts:
   if n not in nums:continue
   for pg in range(cp,ep+1):
    lo=cy-1 if pg==cp else (58 if int(ex[:4])<=2017 else 44)
    hi=ey-2 if pg==ep else (544 if int(ex[:4])<=2017 else 803)
    content=[(b,t) for lp,b,t in lines if lp==pg and b[1]>=lo-1 and b[3]<=hi+1]
    if content:shared.append((pg,lo,hi,content));sharedtext.extend(t for b,t in content)
  segments=shared+segments
  text='\n'.join(sharedtext+texts);answer=amap[n] if ex!='2020.1' else None;normalized_options=[]
  if ex=='2020.1':
   options=re.split(r'[\uf0b7•]\s*',re.split(r'Opções de respostas\s*:',text,flags=re.I)[-1])[1:]
   assert len(options)==4,(ex,n,'options',len(options))
   answer='*' if 'Questão: ANULADA' in text else next(('ABCD'[i] for i,o in enumerate(options) if 'Resposta correta:' in o),None)
   assert answer,(ex,n,'no answer')
   for i,option in enumerate(options):
    text=text.replace(option,option.replace('Resposta correta:',''))
   text=text.replace('Questão: ANULADA','Questão:')
   text=text.split('Opções de respostas:')[0]+'Opções de respostas:\n'+'\n'.join(f'{a}) '+o.replace('Resposta correta:','').strip() for a,o in zip('ABCD',options))
   normalized_options=[o.replace('Resposta correta:','').strip() for o in options]
   for si,(pg,lo,hi,content) in enumerate(segments):
    opts=[b[1] for b,t in content if 'Opções de respostas' in t]
    if opts:hi=min(opts)-2
    if opts or not any('Opções de respostas' in t for lp,b,t in lines if (lp,b[1])>=(pi,top) and (lp,b[1])<(pg,lo)):
     temp=fitz.open();temp.insert_pdf(doc,from_page=pg,to_page=pg);p=temp[0]
     for rect in p.search_for('ANULADA'):p.add_redact_annot(rect,fill=(1,1,1))
     p.apply_redactions();img=f'assets/questions/{ex}-{n}-stem-{si}.jpg';(ROOT/img).parent.mkdir(exist_ok=True,parents=True)
     if hi>lo:p.get_pixmap(matrix=fitz.Matrix(1.8,1.8),clip=fitz.Rect(15,lo,p.rect.width-15,hi)).save(ROOT/img,jpg_quality=88);images.append(img)
  else:
   assert all(re.search(r'(?:\(|\b)'+a+r'\s*[).]',text,re.I) for a in 'ABCD'),(ex,n,'missing alternative',text[-800:])
  if ex!='2020.1':
   for si,(pg,lo,hi,content) in enumerate(segments):
    img=f'assets/questions/{ex}-{n}-{si}.jpg';(ROOT/img).parent.mkdir(exist_ok=True,parents=True)
    doc[pg].get_pixmap(matrix=fitz.Matrix(1.8,1.8),clip=fitz.Rect(15,lo,doc[pg].rect.width-15,hi)).save(ROOT/img,jpg_quality=88);images.append(img)
  prev=[t for hp,y,t in heads if (hp,y)<(pi,top)]
  subject=subjects.get(f'{ex}-{n}',prev[-1].title() if prev and ex=='2020.1' else 'Conteúdo misto')
  bank.append(dict(id=f'{ex}-{n}',exam=ex,number=n,originalNumber=original,subject=subject,text=text,images=images,options=normalized_options,answer=answer,keyStatus=r['key_status'],page=pi+1,source=r['proof_file'],key=r['key_file']))
 exams.append({k:r[k] for k in ['id','page','proof_url','key_url','proof_file','key_file','key_status','type']}|{'count':50,'annulled':sum(q['answer']=='*' for q in bank if q['exam']==ex),'note':'Edição online: alternativas identificadas A-D na ordem do documento oficial.' if ex=='2020.1' else '', 'proof_sha256':hashlib.sha256((ROOT/r['proof_file']).read_bytes()).hexdigest(),'key_sha256':hashlib.sha256((ROOT/r['key_file']).read_bytes()).hexdigest()})
(ROOT/'bank.js').write_text('window.EXAMS = '+json.dumps(exams,ensure_ascii=False)+';\nwindow.BANK = '+json.dumps(bank,ensure_ascii=False)+';',encoding='utf8')
(ROOT/'bank.json').write_text(json.dumps({'version':'2026-10-06','exams':exams,'questions':bank},ensure_ascii=False),encoding='utf8')
(ROOT/'sources.json').write_text(json.dumps(exams,ensure_ascii=False,indent=2),encoding='utf8')
db=sqlite3.connect(ROOT/'questions.sqlite');db.executescript('DROP TABLE IF EXISTS questions;DROP TABLE IF EXISTS exams;CREATE TABLE exams (id TEXT PRIMARY KEY, metadata TEXT NOT NULL);CREATE TABLE questions (id TEXT PRIMARY KEY,exam_id TEXT NOT NULL REFERENCES exams(id),number INTEGER NOT NULL,answer TEXT NOT NULL, key_status TEXT NOT NULL, content TEXT NOT NULL);')
db.executemany('INSERT INTO exams VALUES (?,?)',[(e['id'],json.dumps(e,ensure_ascii=False)) for e in exams]);db.executemany('INSERT INTO questions VALUES (?,?,?,?,?,?)',[(q['id'],q['exam'],q['number'],q['answer'],q['keyStatus'],json.dumps(q,ensure_ascii=False)) for q in bank]);db.commit();db.close()
print('TOTAL',len(bank),'QUESTIONS',len(exams),'EXAMS')
