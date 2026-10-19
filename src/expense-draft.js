import {useEffect,useState} from "react";

export const expenseDraftKey = (user, kind, record) => `rodobach:expense-draft:v1:${encodeURIComponent(user.id ?? user.login)}:${kind}:${record?.id || "new"}`;
export function readExpenseDraft(user, kind, record) {
  try {
    const draft=JSON.parse(localStorage.getItem(expenseDraftKey(user,kind,record)) || "null");
    if (!draft || draft.version !== (record?.version ?? null) || typeof draft.data !== "object") return null;
    return draft.data;
  } catch {return null;}
}
export function clearExpenseDraft(user,kind,record) {
  localStorage.removeItem(expenseDraftKey(user,kind,record));
}
export function useExpenseDraft(user,kind,record,data,enabled) {
  const [warning,setWarning]=useState("");
  const key=expenseDraftKey(user,kind,record);
  const serialized=JSON.stringify({version:record?.version ?? null,data});
  useEffect(()=>{
    if(!enabled)return;
    try {localStorage.setItem(key,serialized);setWarning("");}
    catch {setWarning("Não foi possível salvar o rascunho neste aparelho. Mantenha a tela aberta até enviar.");}
  },[key,serialized,enabled]);
  return warning;
}
