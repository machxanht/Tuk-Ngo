import {useId,useMemo,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,Search,X} from 'lucide-react';
import {searchTeams} from '../race/team-search.mjs';
import './BoatPicker.css';

const COPY={
 vi:{search:'Tìm tên ghe',hint:'Tên Việt, Khmer hoặc tỉnh…',empty:'Không tìm thấy ghe',clear:'Xóa tìm kiếm',previous:'Trang trước',next:'Trang sau',selected:'Đang chọn',page:'Trang'},
 km:{search:'ស្វែងរកឈ្មោះទូក',hint:'ឈ្មោះទូក ឬ ខេត្ត…',empty:'រកមិនឃើញទូក',clear:'លុបការស្វែងរក',previous:'ទំព័រមុន',next:'ទំព័របន្ទាប់',selected:'បានជ្រើសរើស',page:'ទំព័រ'},
 en:{search:'Find a boat',hint:'Boat name or province…',empty:'No boats found',clear:'Clear search',previous:'Previous page',next:'Next page',selected:'Selected',page:'Page'},
};
type Team={id:string;name?:string;nameVi:string;nameKm?:string;teamNumberKm?:string;province?:string;jersey?:string};
export function BoatPicker({roster,selected,onSelect,language,label,disabled=false,compact=false}:{roster:Team[];selected:string;onSelect:(id:string)=>void;language:'vi'|'km'|'en';label:string;disabled?:boolean;compact?:boolean}){
 const c=COPY[language],id=useId(),[query,setQuery]=useState(''),[page,setPage]=useState(0),pageSize=compact?4:8;
 const matches=useMemo(()=>searchTeams(roster,query),[roster,query]),pages=Math.max(1,Math.ceil(matches.length/pageSize)),current=Math.min(page,pages-1);
 const chosen=roster.find(t=>t.id===selected),name=(t:Team)=>language==='km'&&t.nameKm?t.nameKm+(t.teamNumberKm?' '+t.teamNumberKm:''):t.nameVi;
 return <div className={'team-browser'+(compact?' team-browser-compact':'')} role="group" aria-labelledby={id} aria-disabled={disabled}>
  <div className="team-browser-heading"><strong id={id}>{label}</strong><span aria-live="polite">{matches.length.toLocaleString(language)} / {roster.length.toLocaleString(language)}</span></div>
  <label className="team-search"><Search size={17} aria-hidden="true"/><span className="team-sr-only">{c.search} · {label}</span><input type="search" value={query} disabled={disabled} placeholder={c.hint} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>{query&&<button type="button" aria-label={c.clear} disabled={disabled} onClick={()=>{setQuery('');setPage(0);}}><X size={16} aria-hidden="true"/></button>}</label>
  {chosen&&<div className="team-current"><span>{c.selected}</span><b>{name(chosen)}</b></div>}
  <div className="team-choices" aria-label={label}>{matches.slice(current*pageSize,(current+1)*pageSize).map((t:Team)=><button type="button" key={t.id} disabled={disabled} aria-pressed={t.id===selected} data-team-id={t.id} className="team-choice" onClick={()=>onSelect(t.id)}><span className="team-colour" style={{background:t.jersey||'#00684b'}} aria-hidden="true"/><span><b>{name(t)}</b>{language!=='km'&&t.nameKm&&<small lang="km">{t.nameKm}{t.teamNumberKm?' '+t.teamNumberKm:''}</small>}</span>{t.id===selected&&<Check size={17} aria-hidden="true"/>}</button>)}</div>
  {!matches.length&&<p className="team-empty" role="status">{c.empty}</p>}
  {pages>1&&<nav className="team-pages" aria-label={label}><button type="button" aria-label={c.previous} disabled={disabled||current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={18} aria-hidden="true"/></button><span>{c.page} {current+1} / {pages}</span><button type="button" aria-label={c.next} disabled={disabled||current===pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={18} aria-hidden="true"/></button></nav>}
 </div>;
}
