import {useId,useRef,useState} from 'react';
import {Download,Upload} from 'lucide-react';
import {PROFILE_COPY} from '../race/online-language';

export function ProfileTransfer({client,language,disabled=false}:any){
 const c=PROFILE_COPY[language] as typeof PROFILE_COPY.vi,id=useId(),file=useRef<HTMLInputElement>(null);
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function transfer(selected?:File){
  if(busy||disabled)return;setBusy(true);setMessage('');
  try{
   if(selected){if(selected.size>4096)throw Error('profile-file');const applied=await client.importProfile(new Uint8Array(await selected.arrayBuffer()),password);if(applied){setMessage(c.imported);setPassword('');}}
   else {const bytes=await client.exportProfile(password),url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download='tukngo-profile.tuk';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage(c.exported);setPassword('');}
  }catch(error){setMessage(error instanceof Error&&error.message==='profile-password'?c.passwordError:c.fileError);}
  finally{setBusy(false);if(file.current)file.current.value='';}
 }
 return <details className="profile-transfer"><summary>{c.title}</summary><p>{c.hint}</p><label htmlFor={id}>{c.password}<input id={id} type="password" minLength={8} maxLength={256} autoComplete="off" value={password} disabled={busy||disabled} onChange={e=>setPassword(e.target.value)}/></label><div><button disabled={busy||disabled||password.length<8} onClick={()=>void transfer()}><Download size={16}/>{c.save}</button><button disabled={busy||disabled||password.length<8} onClick={()=>file.current?.click()}><Upload size={16}/>{c.restore}</button></div><input ref={file} type="file" accept=".tuk" hidden aria-label={c.restore} onChange={e=>{if(e.target.files?.[0])void transfer(e.target.files[0]);}}/><p role="status">{busy?c.working:message}</p></details>;
}
