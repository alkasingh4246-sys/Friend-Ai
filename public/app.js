const chat = document.querySelector('#chat');
const form = document.querySelector('#form');
const input = document.querySelector('#message');
const send = document.querySelector('#send');
const clear = document.querySelector('#clear');
let history = JSON.parse(localStorage.getItem('friendai-history') || '[]');

function render() { chat.innerHTML=''; for (const m of history) addBubble(m.role,m.content,false); chat.scrollTop=chat.scrollHeight; }
function addBubble(role,text,save=true) { const el=document.createElement('div'); el.className=`msg ${role}`; el.textContent=text; chat.appendChild(el); if(save){history.push({role,content:text}); localStorage.setItem('friendai-history',JSON.stringify(history));} chat.scrollTop=chat.scrollHeight; return el; }
render();
clear.onclick=()=>{history=[];localStorage.removeItem('friendai-history');render();};
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px';});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
form.addEventListener('submit',async e=>{
 e.preventDefault(); const text=input.value.trim(); if(!text||send.disabled)return;
 addBubble('user',text); input.value=''; input.style.height='auto'; send.disabled=true; send.textContent='…';
 const pending=addBubble('assistant','Thinking…',false);
 try {
   const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history})});
   const data=await res.json(); if(!res.ok) throw new Error(data.error||'Request failed');
   pending.remove(); addBubble('assistant',data.reply);
 } catch(err) { pending.textContent='Sorry, something went wrong. '+err.message; pending.className='msg assistant'; }
 finally {send.disabled=false;send.textContent='Send';input.focus();}
});
