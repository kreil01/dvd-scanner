import { ExternalLink, FileText, Info, Link2, Pencil, Plus, ShoppingCart, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { newId } from "../lib/home-store";
import type { LinkItem, LinkType } from "../lib/types";

const types:{value:LinkType;label:string}[]=[
  {value:"shopping",label:"Shopping"},{value:"info",label:"Information"},{value:"video",label:"Video"},
  {value:"document",label:"Dokument"},{value:"other",label:"Sonstiges"}
];

function TypeIcon({type}:{type:LinkType}) {
  if(type==="shopping") return <ShoppingCart/>;
  if(type==="info") return <Info/>;
  if(type==="video") return <Video/>;
  if(type==="document") return <FileText/>;
  return <Link2/>;
}
function normalize(url:string){const u=url.trim();return !u?"":/^https?:\/\//i.test(u)?u:`https://${u}`;}

export function LinkEditor({links,onChange}:{links:LinkItem[];onChange:(links:LinkItem[])=>void}) {
  const [editing,setEditing]=useState<LinkItem>();
  const [adding,setAdding]=useState(false);

  function save(item:LinkItem){
    const next={...item,title:item.title.trim(),url:normalize(item.url)};
    if(!next.title||!next.url) return;
    onChange(links.some(x=>x.id===next.id)?links.map(x=>x.id===next.id?next:x):[...links,next]);
    setEditing(undefined);setAdding(false);
  }

  return <section className="link-editor">
    <div className="panel-head">
      <div><h3>Links</h3><span className="secondary">Bestellungen, Informationen, Videos oder Dokumente</span></div>
      {!adding&&!editing&&<button type="button" className="button ghost small" onClick={()=>setAdding(true)}><Plus/> Link hinzufügen</button>}
    </div>
    <div className="link-list">
      {links.map(link=><div className="link-item" key={link.id}>
        <span className="link-type-icon"><TypeIcon type={link.type}/></span>
        <div className="link-copy"><strong>{link.title}</strong><a href={link.url} target="_blank" rel="noreferrer">{link.url}</a></div>
        <div className="row-actions">
          <a className="button ghost small" href={link.url} target="_blank" rel="noreferrer"><ExternalLink/> Öffnen</a>
          <button type="button" className="button ghost small" onClick={()=>setEditing(link)}><Pencil/> Bearbeiten</button>
          <button type="button" className="button danger small" onClick={()=>onChange(links.filter(x=>x.id!==link.id))}><Trash2/> Löschen</button>
        </div>
      </div>)}
      {!links.length&&!adding&&!editing&&<p className="secondary">Noch keine Links hinterlegt.</p>}
    </div>
    {(adding||editing)&&<LinkForm initial={editing??{id:newId("link"),title:"",url:"",type:"info"}} onSave={save} onCancel={()=>{setEditing(undefined);setAdding(false);}}/>}
  </section>
}

function LinkForm({initial,onSave,onCancel}:{initial:LinkItem;onSave:(i:LinkItem)=>void;onCancel:()=>void}) {
  const [value,setValue]=useState(initial);
  return <div className="link-form">
    <label>Titel<input value={value.title} onChange={e=>setValue({...value,title:e.target.value})} placeholder="z. B. Scharniere bestellen"/></label>
    <label>URL<input type="url" value={value.url} onChange={e=>setValue({...value,url:e.target.value})} placeholder="https://..."/></label>
    <label>Typ<select value={value.type} onChange={e=>setValue({...value,type:e.target.value as LinkType})}>{types.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <div className="row-actions">
      <button type="button" className="button primary small" onClick={()=>onSave(value)}>Speichern</button>
      <button type="button" className="button ghost small" onClick={onCancel}>Abbrechen</button>
    </div>
  </div>
}

export function LinkList({links=[]}:{links?:LinkItem[]}) {
  if(!links.length) return null;
  return <section className="detail-links"><h3>Links</h3><div className="link-list">
    {links.map(link=><a className="link-view-item" key={link.id} href={link.url} target="_blank" rel="noreferrer">
      <span className="link-type-icon"><TypeIcon type={link.type}/></span>
      <span><strong>{link.title}</strong><small>{link.url}</small></span><ExternalLink/>
    </a>)}
  </div></section>
}
