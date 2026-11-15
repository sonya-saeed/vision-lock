(() => {
  const $ = id => document.getElementById(id);
  const STORE = 'astrolympics_vision_sessions_v1';
  const setup = $('setupPanel'), game = $('gamePanel'), result = $('resultPanel'), history = $('historyPanel');
  const callsignInput = $('callsign'), slider = $('distanceSlider'), galaxy = $('galaxy'), target = $('target');
  let callsign = '', offset = 0, focusPoint = 0;

  function loadAll(){ try { const v = JSON.parse(localStorage.getItem(STORE) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
  function saveAll(data){ try { localStorage.setItem(STORE, JSON.stringify(data)); return true; } catch { alert('Browser storage is unavailable. Please enable local site storage and try again.'); return false; } }
  function keyName(s){ return s.trim().toUpperCase().replace(/\s+/g,' '); }
  function sessions(){ return loadAll()[callsign] || []; }
  function setScreen(which){ [setup,game,result,history].forEach(x=>x.classList.add('hidden')); which.classList.remove('hidden'); }
  function updateFocus(){
    offset = Number(slider.value);
    $('offsetReadout').innerHTML = `${offset > 0 ? '+' : ''}${offset.toFixed(1)} <small>cm</small>`;
    // A deliberately visible focus response for gameplay; it is not an optical simulation.
    const blur = Math.min(8, Math.abs(offset - focusPoint) * 1.8);
    galaxy.style.setProperty('--blur', `${blur}px`);
    galaxy.style.transform = `scale(${1 - Math.min(.16, Math.abs(offset)*.025)})`;
    target.style.transform = `translateX(${offset * 10}px)`;
    $('focusStatus').textContent = Math.abs(offset - focusPoint) < .25 ? 'IMAGE APPEARS SHARP' : 'ADJUST UNTIL SHARP';
  }
  function begin(){
    const name = keyName(callsignInput.value);
    if(!name){ callsignInput.focus(); callsignInput.placeholder='ENTER A CALLSIGN FIRST'; return; }
    callsign = name; callsignInput.value = name; slider.value = '0'; focusPoint = (Math.random() * 4 - 2); updateFocus(); setScreen(game); renderMini();
  }
  function record(){
    const data = loadAll(); const arr = data[callsign] || [];
    const d = new Date();
    const session = { id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`), date:d.toISOString(), offsetCm:Number(offset.toFixed(1)), estimatedDiopters:Number(offset.toFixed(1)), direction: offset === 0 ? 'REFERENCE' : offset < 0 ? 'CLOSER' : 'FARTHER' };
    arr.push(session); data[callsign] = arr;
    if(!saveAll(data)) return;
    $('resultOffset').textContent = `${offset > 0 ? '+' : ''}${offset.toFixed(1)} cm`;
    $('resultDiopter').textContent = `${offset > 0 ? '+' : ''}${offset.toFixed(1)} D`;
    $('resultDirection').textContent = session.direction;
    setScreen(result); renderMini();
  }
  function dateLabel(iso){ return new Date(iso).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}); }
  function renderMini(){
    const arr = sessions().slice(-3).reverse();
    $('historyCount').textContent = `${sessions().length} session${sessions().length===1?'':'s'} saved`;
    $('miniHistory').innerHTML = arr.length ? arr.map(s=>`<div class="mini-entry"><span>${dateLabel(s.date)}</span><b>${s.estimatedDiopters>0?'+':''}${s.estimatedDiopters.toFixed(1)} D</b></div>`).join('') : '<p class="empty">Your recorded sessions will appear here.</p>';
  }
  function drawChart(arr){
    const canvas=$('historyChart'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h); ctx.strokeStyle='#293b91';ctx.fillStyle='#9ba9d6';ctx.font='13px Space Mono';
    for(let i=0;i<5;i++){const y=24+i*(h-55)/4;ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(w-18,y);ctx.stroke();ctx.fillText((2-i).toFixed(0)+' D',6,y+4);}
    if(!arr.length){ctx.fillText('No sessions recorded yet',w/2-90,h/2);return;}
    const vals=arr.map(x=>x.estimatedDiopters), min=Math.min(-2,...vals),max=Math.max(2,...vals),span=max-min||1;
    const x=i=>arr.length===1?w/2:48+i*(w-75)/(arr.length-1),y=v=>24+(max-v)*(h-55)/span;
    ctx.strokeStyle='#32DDF2';ctx.lineWidth=3;ctx.beginPath();arr.forEach((s,i)=>i?ctx.lineTo(x(i),y(s.estimatedDiopters)):ctx.moveTo(x(i),y(s.estimatedDiopters)));ctx.stroke();
    arr.forEach((s,i)=>{ctx.fillStyle='#F52FCB';ctx.beginPath();ctx.arc(x(i),y(s.estimatedDiopters),5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9ba9d6';ctx.font='11px Space Mono';ctx.fillText(dateLabel(s.date).slice(0,6),Math.max(0,x(i)-25),h-8);});
  }
  function openHistory(){
    const arr=sessions().slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
    $('historyRows').innerHTML=arr.length?arr.slice().reverse().map(s=>`<tr><td>${dateLabel(s.date)}</td><td>${escapeHtml(callsign)}</td><td>${s.offsetCm>0?'+':''}${s.offsetCm.toFixed(1)} cm</td><td>${s.estimatedDiopters>0?'+':''}${s.estimatedDiopters.toFixed(1)} D</td><td>${s.direction}</td></tr>`).join(''):'<tr><td colspan="5">No sessions saved for this callsign.</td></tr>';
    drawChart(arr);setScreen(history);
  }
  function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function exportCsv(){
    const arr=sessions();if(!arr.length){alert('There are no sessions to export yet.');return;}
    const rows=[['date','callsign','target_offset_cm','approx_focus_difference_diopters','direction'],...arr.map(s=>[s.date,callsign,s.offsetCm,s.estimatedDiopters,s.direction])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`vision-${callsign.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.csv`;a.click();URL.revokeObjectURL(url);
  }
  $('startBtn').addEventListener('click',begin);callsignInput.addEventListener('keydown',e=>{if(e.key==='Enter')begin();});
  slider.addEventListener('input',updateFocus);
  document.querySelectorAll('.nudge').forEach(b=>b.addEventListener('click',()=>{slider.value=String(Math.max(-5,Math.min(5,Number(slider.value)+Number(b.dataset.step))));updateFocus();}));
  $('resetBtn').addEventListener('click',()=>{slider.value='0';updateFocus();});
  $('recordBtn').addEventListener('click',record);
  $('againBtn').addEventListener('click',()=>{slider.value='0';updateFocus();setScreen(game);});
  $('historyBtn').addEventListener('click',openHistory);$('historyBtn2').addEventListener('click',openHistory);
  $('exportBtn').addEventListener('click',exportCsv);
  $('clearBtn').addEventListener('click',()=>{if(!confirm(`Delete all vision sessions saved for ${callsign}? This cannot be undone.`))return;const d=loadAll();delete d[callsign];saveAll(d);renderMini();openHistory();});
  updateFocus();
})();