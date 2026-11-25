(()=>{'use strict';
const $=s=>document.querySelector(s);let records=[],updatedAt=null,master=null,busy=false,viewPassword='',generation=0;
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());$('#month').value=today.slice(0,7);
const DATA_URL='https://api.github.com/repos/DONGYEON-KIM-BLACK/BonitoU_Dashboard_Releases/contents/attendance/records.enc.json?ref=main';
const duration=n=>Math.floor(n/60)+'시간 '+n%60+'분',minutes=r=>window.bonitoAttendanceWork.minutes(r);
function signedIn(value){$('#login-card').hidden=value;$('#records-view').hidden=!value;$('#logout').hidden=!value;}
function clear(){generation++;viewPassword='';records=[];updatedAt=null;master=null;$('#calendar').replaceChildren();$('#summary').textContent='';$('#updated').textContent='';$('#password').value='';signedIn(false);}
function validated(value){
 if(!value||value.format!=='bonito-attendance'||![1,2].includes(value.version)||!Array.isArray(value.records)||value.records.length>50000)throw Error('근무 기록 형식이 다릅니다.');
 const seen=new Set();for(const r of value.records){if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||seen.has(r.date))throw Error('기록 날짜를 확인해 주세요.');seen.add(r.date);window.bonitoAttendanceWork.metadata(r);for(const t of [r.start,r.end])if(t&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))throw Error('기록 시간을 확인해 주세요.');}return value;
}
function render(){
 const month=$('#month').value;if(!/^\d{4}-\d{2}$/.test(month))return;const [y,m]=month.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate(),byDate=new Map(records.filter(r=>r.date.startsWith(month)).map(r=>[r.date,r]));
 const complete=[...byDate.values()].filter(r=>minutes(r)!==null),total=complete.reduce((sum,r)=>sum+minutes(r),0);let rest=0;
 for(let d=1;d<=days;d++){const key=month+'-'+String(d).padStart(2,'0'),r=byDate.get(key);if(key<=today&&!r?.start&&!r?.end&&!r?.extraSessions?.length)rest++;}
 $('#month-title').textContent=y+'년 '+m+'월';$('#summary').textContent='총 '+duration(total)+' 근무 · 휴무 '+rest+'일';
 $('#updated').textContent=(updatedAt?'마지막 온라인 저장 · '+new Date(updatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'온라인 기록 없음');
 $('#calendar').replaceChildren();
 const offset=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7;for(let i=0;i<offset;i++){const e=document.createElement('div');e.className='day empty';$('#calendar').append(e);}
 for(let d=1;d<=days;d++){const key=month+'-'+String(d).padStart(2,'0'),r=byDate.get(key),n=r?minutes(r):null,status=n!==null?duration(n):r?.start?(key===today?'근무중':'퇴근 미기록'):r?.end?'출근 미기록':key<=today?'휴무':'기록 없음';const cell=document.createElement('div');cell.className='day';cell.setAttribute('role','gridcell');for(const [tag,text]of [['span',d],['strong',status],['small',(()=>{const span=window.bonitoAttendanceWork.displayTimes(r);if(key===today&&span.start&&!span.end)return span.start+' ~ 근무중';return '출근 '+(span.start||'—')+' · 퇴근 '+(span.end||'—');})()]]){const el=document.createElement(tag);el.textContent=text;cell.append(el);}$('#calendar').append(cell);
 }
}
async function fetchRecords(password){
 const response=await fetch(DATA_URL+'&t='+Date.now(),{headers:{Accept:'application/vnd.github.raw+json'},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
 if(response.status===404)throw Error('아직 조회 기록이 없습니다. 마스터 PC에서 먼저 동기화해 주세요.');if(!response.ok)throw Error('기록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.');
 const text=await response.text();if(text.length>12000000)throw Error('기록 파일 크기를 확인해 주세요.');return validated(await window.BonitoAttendanceCrypto.unlock(JSON.parse(text),password));
}
async function load(password,login=false){
 if(busy)return;busy=true;$('#refresh').disabled=true;$('#login button').disabled=true;const stamp=generation,message=login?$('#login-message'):$('#message');message.textContent='암호화된 기록을 확인하는 중입니다.';
 try{const data=await fetchRecords(password);if(stamp!==generation)return;records=data.records;updatedAt=data.updatedAt;master=data.master;viewPassword=password;signedIn(true);render();message.textContent='';}catch(error){if(stamp===generation)message.textContent=error.message;}finally{busy=false;$('#refresh').disabled=false;$('#login button').disabled=false;}
}
$('#login').onsubmit=async event=>{event.preventDefault();const password=$('#password').value;$('#password').value='';await load(password,true);};
$('#logout').onclick=clear;$('#refresh').onclick=()=>load(viewPassword);
$('#month').onchange=render;for(const [id,delta]of [['previous',-1],['next',1]])$('#'+id).onclick=()=>{const [y,m]=$('#month').value.split('-').map(Number),date=new Date(Date.UTC(y,m-1+delta,1));$('#month').value=date.toISOString().slice(0,7);render();};
window.addEventListener('pagehide',clear);
})();
