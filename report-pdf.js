'use strict';
// Dependency-free, searchable text-based PDF generator for saved project snapshots.
// Each report retains every task and subtask, its status, and process notes.
const PAGE_W=612,PAGE_H=792;
const orange=[.91,.42,.16],dark=[.13,.17,.23],muted=[.38,.44,.52],light=[.94,.96,.98];
function latin(s){return String(s??'').normalize('NFKD').replace(/[\u2012-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2022/g,'-').replace(/\u00a0/g,' ').replace(/[^\x20-\x7e\xa0-\xff]/g,'?');}
function esc(s){return latin(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function pdfReport(report){
 if(!report||typeof report!=='object'||!report.project||!Array.isArray(report.tasks))throw new Error('Invalid saved report');
 const pages=[];let commands=[],y=0;
 const color=([r,g,b])=>`${r} ${g} ${b} rg`;
 function text(x,y,s,sz=9,bold=false,col=dark){commands.push(color(col),`BT /F${bold?2:1} ${sz} Tf 1 0 0 1 ${x} ${y} Tm (${esc(s)}) Tj ET`);}
 function rect(x,y,w,h,col){commands.push(color(col),`${x} ${y} ${w} ${h} re f`);}
 function line(x1,y1,x2,y2){commands.push('.85 .88 .91 RG','0.6 w',`${x1} ${y1} m ${x2} ${y2} l S`);}
 function wrap(s,chars=98){const result=[];for(const raw of String(s??'').split(/\r?\n/)){let words=latin(raw).split(/\s+/);let curr='';for(const word of words){if(!word)continue;if((curr+' '+word).trim().length>chars&&curr){result.push(curr);curr='';}if(word.length>chars){if(curr){result.push(curr);curr='';}for(let i=0;i<word.length;i+=chars)result.push(word.slice(i,i+chars));}else curr=curr?curr+' '+word:word;}result.push(curr||' ');}return result;}
 function begin(){if(commands.length)pages.push(commands);commands=[];rect(0,PAGE_H-9,PAGE_W,9,orange);text(43,751,'TCG MACHINES',12,true);text(43,735,'PRODUCTION OPERATIONS / PROJECT UPDATE',8,true,orange);text(457,751,'SAVED REPORT',8,false,muted);line(42,720,570,720);y=700;}
 function enough(h){if(y-h<65)begin();}
 function words(s,opts={}){let {sz=9,col=dark,indent=0,bold=false,gap=12,limit=96}=opts;const lines=wrap(s,limit-Math.round(indent/9));for(const str of lines){enough(gap);text(43+indent,y,str,sz,bold,col);y-=gap;}return lines.length;}
 function head(s){enough(32);y-=5;text(43,y,latin(s).slice(0,97),10,true,orange);y-=19;}
 begin();
 words(report.title||report.project.name,{sz:18,bold:true,gap:23,limit:48});
 const p=report.project;
 const tag=({active:'ACTIVE / PLANNED',completed:'COMPLETED',completed_followup:'COMPLETED / FOLLOW-UP REQUIRED'})[p.workflowStatus]||'PROJECT UPDATE';
 words(`STATUS: ${tag}`,{sz:9,bold:true,col:orange,gap:16});
 rect(42,y-45,528,47,light);
 text(52,y-16,`OWNER: ${latin(p.owner||'Not assigned').slice(0,90)}`,8,true);
 text(52,y-32,`START: ${p.startDate||'Unspecified'}    TARGET: ${p.deadline||'Unspecified'}    ESTIMATED: ${p.estimatedHours||'?'} h`,8,false,muted);
 y-=65;
 head('PROJECT PURPOSE');words(p.description||'No project description recorded.',{sz:8.8,gap:12,limit:107});
 if(report.summary){head('PROCESS SUMMARY / LESSONS');words(report.summary,{sz:8.8,gap:12,limit:108});}
 if(report.tags){words(`Search keywords: ${report.tags}`,{sz:8,col:muted,gap:11,limit:115});}
 head('ALL TASKS AND SUBTASKS');
 const roots=report.tasks.filter(t=>!t.parentId);
 const entries=roots.length?roots:report.tasks;
 for(let i=0;i<entries.length;i++){
  const t=entries[i];const kids=report.tasks.filter(k=>k.parentId===t.id);
  enough(44);words(`${String(i+1).padStart(2,'0')}  ${t.title}`,{bold:true,sz:9,gap:12,limit:92});
  if(!kids.length){words(`  [${t.status==='done'?'DONE':'OPEN'}]   ${t.title}`,{indent:14,sz:8.3,gap:11,limit:99});}
  for(const s of kids){enough(24);words(`[${s.status==='done'?'DONE':'OPEN'}] ${s.title}`,{indent:17,sz:8.5,gap:11,col:s.status==='done'?dark:muted,limit:96});if(s.notes)words(`Process note: ${s.notes}`,{indent:30,sz:7.8,gap:10,col:muted,limit:93});}
  if(t.notes&&kids.length)words(`Workstream note: ${t.notes}`,{indent:17,sz:7.8,gap:10,col:muted,limit:96});
  y-=11;
 }
 if(report.tasks.some(t=>t.parentId&&!entries.some(r=>r.id===t.parentId))){head('OTHER SUBTASKS');for(const t of report.tasks.filter(t=>t.parentId&&!entries.some(r=>r.id===t.parentId)))words(`[${t.status==='done'?'DONE':'OPEN'}] ${t.title}`,{indent:12,sz:8.5,gap:11});}
 pages.push(commands);
 const total=pages.length;
 for(let i=0;i<total;i++){pages[i].push('0.80 0.84 0.89 RG','0.65 w','42 45 m 570 45 l S');const old=commands;commands=pages[i];text(43,30,`Saved ${String(report.generatedAt||'').slice(0,10)}  |  Project: ${String(p.name||'').slice(0,60)}  |  Page ${i+1} of ${total}`,7,false,muted);commands=old;}
 // Static PDF object table: 1 catalog, 2 pages, 3 normal font, 4 bold font, then page/stream pairs.
 const objects=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 const pageRefs=[];
 for(let i=0;i<total;i++){
  const pageId=5+i*2,streamId=pageId+1;pageRefs.push(`${pageId} 0 R`);
  const content=pages[i].join('\n')+'\n';const buf=Buffer.from(content,'latin1');
  objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`;
  objects[streamId]=Buffer.concat([Buffer.from(`<< /Length ${buf.length} >>\nstream\n`,'latin1'),buf,Buffer.from('endstream','latin1')]);
 }
 objects[2]=`<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${total} >>`;
 let buffers=[Buffer.from('%PDF-1.4\n%\xff\xff\xff\xff\n','latin1')],offsets=[0];let size=buffers[0].length;
 for(let i=1;i<objects.length;i++){
  offsets[i]=size;const a=Buffer.from(`${i} 0 obj\n`,'latin1'),b=Buffer.isBuffer(objects[i])?objects[i]:Buffer.from(objects[i],'latin1'),z=Buffer.from('\nendobj\n','latin1');buffers.push(a,b,z);size+=a.length+b.length+z.length;
 }
 const xref=size;let x=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let i=1;i<objects.length;i++)x+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
 x+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 buffers.push(Buffer.from(x,'latin1'));return Buffer.concat(buffers);
}
module.exports={pdfReport};
