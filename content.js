
(()=>{
  const token=crypto.randomUUID();
  let cfg={active:false}, selected=null, claimEpoch=null, busy=false;
  const attempts=new WeakMap();
  const send=m=>browser.runtime.sendMessage(m).catch(()=>null);
  let reminder=null, reminderText=null, addressHint=null, waitingTicks=0;
  function hideReminder() {
    reminder?.remove();
    addressHint?.remove();
    reminder=null;reminderText=null;addressHint=null;
  }
  function positionReminder() {
    if(!reminder) return;
    const videos=[...document.querySelectorAll('video')].filter(v=>{
      const r=v.getBoundingClientRect();
      return r.width>0 && r.height>0 && r.bottom>0 && r.right>0 &&
        r.top<window.innerHeight && r.left<window.innerWidth;
    }).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight);
    const video=videos.includes(selected) ? selected : videos[0];
    const rect=video?.getBoundingClientRect();
    const box=reminder.getBoundingClientRect();
    const centerX=rect ? rect.left+rect.width/2 : window.innerWidth/2;
    const centerY=rect ? rect.top+rect.height/2 : window.innerHeight/2;
    // Keep the full reminder reachable even near the viewport edges.
    const x=Math.max(12+box.width/2,Math.min(centerX,window.innerWidth-12-box.width/2));
    const y=Math.max(12+box.height/2,Math.min(centerY,window.innerHeight-12-box.height/2));
    reminder.style.setProperty('left',`${x}px`,'important');
    reminder.style.setProperty('top',`${y}px`,'important');
  }
  window.addEventListener('resize',positionReminder);
  window.addEventListener('scroll',positionReminder,true);
  function showReminder(message) {
    if(!reminder) {
      reminder=document.createElement('div');
      reminder.style.cssText='position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;z-index:2147483647!important;max-width:360px!important;width:calc(100% - 48px)!important;max-height:calc(100vh - 24px)!important;overflow:auto!important;pointer-events:none!important;';
      const root=reminder.attachShadow({mode:'closed'});
      const style=document.createElement('style');
      style.textContent='section{background:#fff;color:#182438;border:2px solid #b45309;border-radius:10px;padding:16px;box-shadow:0 4px 24px #0005;font:14px/1.45 system-ui}h2{font-size:17px;margin:0 0 8px}p{margin:8px 0;overflow-wrap:anywhere}';
      const panel=document.createElement('section');
      panel.setAttribute('role','alert');
      const title=document.createElement('h2');
      title.textContent='How to use';
      reminderText=document.createElement('p');
      const instructions=document.createElement('p');
      instructions.textContent='To enable autoplay, follow the instructions in the yellow box hint above.';
      const note=document.createElement('p');
      note.textContent='After allowing autoplay, reload the plugin.';
      panel.append(title,reminderText,instructions,note);
      root.append(style,panel);
      document.documentElement.append(reminder);
    }
    reminderText.textContent=message;
    if(window===window.top && !addressHint) {
      addressHint=document.createElement('div');
      addressHint.style.cssText='position:fixed!important;top:0!important;left:clamp(12px,30vw,300px)!important;z-index:2147483647!important;max-width:340px!important;width:min(340px,calc(88vw - 12px))!important;pointer-events:none!important;';
      const root=addressHint.attachShadow({mode:'closed'});
      const style=document.createElement('style');
      style.textContent='aside{display:flex;gap:12px;align-items:center;background:#fff3cd;color:#663c00;border:3px solid #b45309;border-top:0;border-radius:0 0 12px 12px;padding:8px 14px;box-shadow:0 4px 16px #0004;font:15px/1.4 system-ui}span{font-size:48px;line-height:1}strong{display:block}';
      const cue=document.createElement('aside');
      const arrow=document.createElement('span');
      arrow.textContent='↑';
      arrow.setAttribute('aria-hidden','true');
      const text=document.createElement('div');
      const title=document.createElement('strong');
      title.textContent='Look above this page';
      const detail=document.createElement('div');
      detail.textContent='Left side of the address bar: autoplay icon → Allow Audio and Video';
      text.append(title,detail);
      cue.append(arrow,text);
      root.append(style,cue);
      document.documentElement.append(addressHint);
    }
    positionReminder();
  }
  async function reportError(e,epoch) {
    if(!cfg.active || cfg.epoch!==epoch) return;
    console.warn('Video Playlist: playback failed',e);
    showReminder(e.name==='NotAllowedError'
      ? 'Firefox blocked playback with sound. Allow autoplay for this site, then click Play in the video player.'
      : `Playback failed: ${e.name}: ${e.message}`);
    await send({type:'playbackError',epoch,token,
      blocked:e.name==='NotAllowedError',error:`${e.name}: ${e.message}`});
  }
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
      if(!next?.active) {cfg={active:false};waitingTicks=0;hideReminder();return;}
      if(cfg.epoch !== next.epoch) {selected=null;claimEpoch=null;waitingTicks=0;hideReminder();}
      const retry=cfg.retry !== next.retry;
      cfg=next;
      // Surface errors from embedded player frames in the main page as well.
      if(cfg.issue && (window===window.top || cfg.claimed===token || reminder)) showReminder(cfg.issue);
      else if(!cfg.claimed && window===window.top && ++waitingTicks>=8)
        showReminder('Video is not playing? And it is muted? Autoplay may be blocked');
      else if(!cfg.issue) hideReminder();
      if(cfg.claimed) waitingTicks=0;
      if(selected && selected.isConnected && !selected.paused && !retry) {
        if(selected.muted || selected.volume===0) {
          if(!cfg.issue) await send({type:'playbackError',epoch:cfg.epoch,token,
            blocked:false,error:'The player is muted. Allow autoplay in Firefox’s site controls, then unmute the video player.'});
          return;
        }
        if(cfg.issue) await send({type:'claim',epoch:cfg.epoch,token});
        return;
      }
      if(selected?.isConnected && !retry) {
        if(!selected.ended && !cfg.issue) await send({type:'playbackError',epoch:cfg.epoch,token,
          blocked:false,error:'The player is paused. Click Play in the player or Retry playback.'});
        return;
      }
      if(cfg.claimed && cfg.claimed!==token) return;
      const videos=[...document.querySelectorAll('video')].filter(candidate)
        .sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight);
      const v=selected?.isConnected ? selected : videos[0];
      if(!v) return;
      v.loop=false;
      // Audible playback requires the site's Firefox autoplay permission.
      if(!selected || retry) {
        v.muted=false;
        if(v.volume===0) v.volume=1;
      }
      if(v.paused && !v.ended) {
        const attempt=`${cfg.epoch}:${cfg.retry}`;
        if(attempts.get(v) !== attempt) {
          attempts.set(v,attempt);
          const epoch=cfg.epoch;
          try {await v.play();}
          catch(e){await reportError(e,epoch);return;}
        } else return;
      }
      if(v.paused || v.ended) return;
      const epoch=cfg.epoch;
      const ok=await send({type:'claim',epoch,token});
      if(!ok) return;
      if(selected===v && claimEpoch===epoch) return;
      selected=v;claimEpoch=epoch;
      v.addEventListener('ended',()=>{
        if(selected===v && claimEpoch===epoch)
          send({type:'ended',epoch,token});
      },{once:true});
    } finally {busy=false;}
  }
  setInterval(tick,200);
  tick();
})();
