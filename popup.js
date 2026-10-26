
const $=id=>document.getElementById(id);
async function refresh(){
  const s=await browser.runtime.sendMessage({type:'status'});
  $('status').textContent=s.status;
}
(async()=>{
  const saved=await browser.storage.local.get(['urls','minimum','close']);
  $('urls').value=saved.urls || [
    'https://www.youtube.com/watch?v=SX_ViT4Ra7k',
    'https://www.youtube.com/watch?v=T8y_RsF4TSw',
    'https://www.youtube.com/watch?v=h-kQw4JqCHE'
  ].join('\n');
  $('minimum').value=saved.minimum ?? 120;
  $('close').checked=saved.close ?? true;
  await refresh();
})();
$('start').onclick=async()=>{
  try {
    const urls=$('urls').value.trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!urls.length) throw Error('Enter at least one URL.');
    for(const value of urls) {
      if(!['http:','https:'].includes(new URL(value).protocol)) throw Error('Use HTTP or HTTPS URLs.');
    }
    await browser.storage.local.set({urls:$('urls').value,minimum:$('minimum').value,close:$('close').checked});
    await browser.runtime.sendMessage({type:'start',urls,minSeconds:$('minimum').value,closeTab:$('close').checked});
    await refresh();
  }catch(e){$('status').textContent=e.message;}
};
$('stop').onclick=async()=>{await browser.runtime.sendMessage({type:'stop'});await refresh();};
setInterval(()=>refresh().catch(()=>{}),1000);
