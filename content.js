
(()=>{
  const token=crypto.randomUUID();
  let cfg={active:false}, selected=null, claimEpoch=null, busy=false;
  const attempts=new WeakMap();
  const send=m=>browser.runtime.sendMessage(m).catch(()=>null);
  function candidate(v) {
    const rect=v.getBoundingClientRect();
    return v.isConnected && rect.width>0 && rect.height>0 &&
      Number.isFinite(v.duration) && v.duration >= cfg.minSeconds;
  }
  async function tick() {
    if(busy) return;
    busy=true;
    try {
      const next=await send({type:'config'});
      if(!next?.active) return;
      if(cfg.epoch !== next.epoch) {selected=null;claimEpoch=null;}
      cfg=next;
      if(selected && selected.isConnected) return;
      if(cfg.claimed && cfg.claimed!==token) return;
      const videos=[...document.querySelectorAll('video')].filter(candidate)
        .sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight);
      const v=videos[0];
      if(!v) return;
      v.loop=false;
      if(v.paused && !v.ended) {
        if(attempts.get(v) !== cfg.epoch) {
          attempts.set(v,cfg.epoch);
          try {await v.play();}
          catch {await send({type:'blocked',epoch:cfg.epoch});return;}
        } else return;
      }
      if(v.paused || v.ended) return;
      const epoch=cfg.epoch;
      const ok=await send({type:'claim',epoch,token});
      if(!ok) return;
      selected=v;claimEpoch=epoch;
      v.addEventListener('ended',()=>{
        if(selected===v && claimEpoch===epoch)
          send({type:'ended',epoch,token});
      },{once:true});
    } finally {busy=false;}
  }
  setInterval(tick,1000);
  tick();
})();
