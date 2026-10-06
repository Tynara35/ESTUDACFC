(() => {
  const install=document.querySelector('#install'),download=document.querySelector('#offline'),status=document.querySelector('#offline-status');
  let prompt,abort;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;install.hidden=false;});
  window.addEventListener('appinstalled',()=>{install.hidden=true;prompt=null;});
  install.onclick=async()=>{if(!prompt)return;await prompt.prompt();await prompt.userChoice;prompt=null;install.hidden=true;};
  if(!('serviceWorker' in navigator)){download.disabled=true;status.textContent='Offline indisponível neste navegador.';return;}
  navigator.serviceWorker.register('./sw.js').catch(()=>{status.textContent='Não foi possível ativar o modo offline.';});
  download.onclick=async()=>{
    if(abort){abort.abort();return;}
    abort=new AbortController();download.textContent='Cancelar download';
    try{
      await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
      const urls=[...new Set(window.BANK.flatMap(q=>q.images))];
      let done=0,next=0;
      await Promise.all(Array.from({length:4},async()=>{
        while(next<urls.length){
          const path=urls[next++];
          const response=await fetch(path,{signal:abort.signal});
          if(!response.ok)throw new Error('Download incompleto');
          await response.arrayBuffer();done++;status.textContent=`${done}/${urls.length} enunciados`;
        }
      }));
      status.textContent='Questões disponíveis offline.';
    }catch(e){abort.abort();status.textContent=e.name==='AbortError'?'Download pausado. Você pode retomar.':'Download incompleto. Tente novamente.';}
    finally{abort=null;download.textContent='Baixar questões offline';}
  };
})();
