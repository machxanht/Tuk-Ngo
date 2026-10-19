import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {loadKbachCatalog} from '../race/kbach-library.mjs';
import './KbachPicker.css';

export function KbachPicker({selected,onSelect,onClose}:{selected:string;onSelect:(id:string)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [catalog,setCatalog]=useState<any>(null),[error,setError]=useState(''),[suppliedOnly,setSuppliedOnly]=useState(false),[original,setOriginal]=useState(false);
 const root=import.meta.env.BASE_URL+'assets/ghe-ngo/kbach-library/';
 useEffect(()=>{dialog.current?.showModal();let cancelled=false;loadKbachCatalog(root).then(data=>{if(!cancelled)setCatalog(data);},e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[root]);
 const current=catalog?.items.find((item:any)=>item.id===selected),items=catalog?.items.filter((item:any)=>!suppliedOnly||item.supplied)||[];
 return <dialog ref={dialog} className="kbach-picker" aria-labelledby="kbach-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="kbach-sheet">
   <header><div><h2 id="kbach-title">Thư viện kbach</h2><p>{catalog?`${catalog.items.length} bộ mũi · thân · đuôi từ ảnh gốc`:'Đang tải danh mục…'}</p></div><button autoFocus type="button" aria-label="Đóng thư viện kbach" onClick={onClose}><X size={20}/></button></header>
   <div className="kbach-filters"><button aria-pressed={!suppliedOnly} onClick={()=>setSuppliedOnly(false)}>Tất cả bộ ghe</button><button aria-pressed={suppliedOnly} onClick={()=>setSuppliedOnly(true)}>5 link bạn gửi</button></div>
   {error&&<p role="alert">Không tải được thư viện: {error}</p>}
   <div className="kbach-grid" aria-label="Chọn kbach để áp dụng lên ghe">{items.map((item:any,index:number)=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>{onSelect(item.id);onClose();}}>
    <img src={root+item.thumbnail} alt="" width="1024" height="64" loading="lazy"/>
    <span>{item.name.startsWith('Bộ ')?item.name:`${String(index+1).padStart(2,'0')} · ${item.name}`}</span><small>{item.panels.length} ảnh gốc · 8K{item.supplied?' · link đã gửi':''}</small>
   </button>)}</div>
   {current&&<details className="kbach-provenance"><summary>Nguồn của mẫu đang chọn · {current.id}</summary><p><a href={current.source} target="_blank" rel="noreferrer">Xem bài gốc của {current.uploader}</a>{current.credit&&` · Bài ghi nguồn ${current.credit}`}. Đây là mẫu thử mỹ thuật; chưa xác minh giấy phép tái sử dụng hoặc tác giả gốc của mọi bài.</p><button onClick={()=>setOriginal(!original)}>{original?'Ẩn ảnh gốc':'Đối chiếu ảnh gốc'}</button>{original&&<img src={root+current.original} alt={'Ảnh gốc phần mũi của '+current.name}/>}</details>}
   <p className="kbach-note">Giữ màu và hoa văn trong từng album. Mẫu thử không xác nhận đây là hoa văn lịch sử của đội Việt Nam đang mặc áo trên ghe.</p>
  </div>
 </dialog>;
}
