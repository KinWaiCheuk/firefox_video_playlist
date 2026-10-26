
let state = {active:false, status:'Ready', epoch:0};
let serial = Promise.resolve();
function queue(fn) {
  const result = serial.then(fn);
  serial = result.catch(console.error);
  return result;
}
async function halt(status) {
  const id = state.tabId;
  state.active = false;
  state.epoch++;
  state.status = status;
  if (id != null) {
    // Unload the player to prevent a site's own next-episode autoplay.
    if (state.closeTab) await browser.tabs.remove(id).catch(()=>{});
    else await browser.tabs.update(id,{url:'about:blank'}).catch(()=>{});
  }
}
browser.runtime.onMessage.addListener((m,sender)=>queue(async()=>{
  if (m.type === 'status') return state;
  if (m.type === 'start' && !sender.tab) {
    const urls=m.urls.map(x=>new URL(x));
    if (!urls.length || urls.some(x=>!['http:','https:'].includes(x.protocol)))
      throw Error('Enter at least one HTTP or HTTPS URL.');
    if(state.active) await halt('Stopped');
    state={active:true,epoch:state.epoch+1,urls:urls.map(x=>x.href),index:0,
      minSeconds:Math.max(0,Number(m.minSeconds)||0),closeTab:!!m.closeTab,
      claim:null,status:'Opening video 1'};
    try {
      const tab=await browser.tabs.create({url:state.urls[0]});
      state.tabId=tab.id;
    } catch(e) {state.active=false;state.status=e.message;throw e;}
    return state;
  }
  if(m.type === 'stop' && !sender.tab) {await halt('Stopped');return state;}
  if(!state.active || sender.tab?.id !== state.tabId) return {active:false};
  if(m.type === 'config') return {active:true,epoch:state.epoch,
    minSeconds:state.minSeconds,claimed:state.claim};
  if(m.epoch !== state.epoch) return false;
  if(m.type === 'claim') {
    if(state.claim && state.claim !== m.token) return false;
    state.claim=m.token;
    state.status=`Playing ${state.index+1} / ${state.urls.length}`;
    return true;
  }
  if(m.type === 'blocked' && !state.claim)
    state.status='Autoplay blocked: allow audio/video for the player site, or click Play.';
  if(m.type === 'ended' && state.claim === m.token) {
    // Consume once before navigating: duplicate ended events cannot skip entries.
    state.claim=null; state.epoch++; state.index++;
    if(state.index >= state.urls.length) await halt('Playlist finished');
    else {
      state.status=`Opening video ${state.index+1} / ${state.urls.length}`;
      await browser.tabs.update(state.tabId,{url:state.urls[state.index]});
    }
  }
  return true;
}));
browser.tabs.onRemoved.addListener(id=>queue(async()=>{
  if(id===state.tabId && state.active) {
    state.active=false;state.epoch++;state.status='Playlist tab closed';
  }
}));
