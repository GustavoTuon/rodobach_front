import {useCallback, useEffect, useState} from 'react';

const allowed = {theme:['auto','light','dark'], density:['comfortable','compact']};
function validPreferences(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key,setting])=>allowed[key]?.includes(setting)));
}
export function appearanceKey(user) {
  const identity=user?.id != null ? `id:${user.id}` : user?.login ? `login:${user.login}` : null;
  return identity ? `rodobach:appearance:${identity}` : null;
}
function read(key, defaults) {
  try { return {...defaults,...validPreferences(key ? JSON.parse(localStorage.getItem(key) || '{}') : {})}; }
  catch { return {...defaults}; }
}

export function useAppearancePreferences(user, defaults) {
  const key=appearanceKey(user);
  const [state,setState]=useState(()=>({key,values:read(key,defaults)}));
  const values=state.key===key ? state.values : read(key,defaults);
  useEffect(()=>{
    setState({key,values:read(key,defaults)});
    const sync=event=>{if(event.key===key || event.key===null)setState({key,values:read(key,defaults)});};
    window.addEventListener('storage',sync);
    return ()=>window.removeEventListener('storage',sync);
  },[key,defaults]);
  const setPreference=useCallback((keyOrEdits,value)=>{
    const edits=validPreferences(typeof keyOrEdits==='object' ? keyOrEdits : {[keyOrEdits]:value});
    const next={...values,...edits};
    if(key) {
      try {localStorage.setItem(key,JSON.stringify(next));}
      catch {console.warn('Não foi possível salvar a preferência de aparência neste navegador.');}
    }
    setState({key,values:next});
  },[key,values]);
  return [values,setPreference];
}
