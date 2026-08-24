import { useRef } from "react";
import { CalendarDays } from "lucide-react";

function isoOffset(days: number) {
  const d = new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

export function DateField({label,value,onChange}:{label:string;value?:string;onChange:(value:string)=>void}) {
  const inputRef=useRef<HTMLInputElement>(null);
  function openCalendar() {
    const input=inputRef.current;
    if(!input) return;
    const picker=input as HTMLInputElement & {showPicker?:()=>void};
    try {
      if(picker.showPicker) picker.showPicker();
      else { input.focus(); input.click(); }
    } catch {
      input.focus();
      input.click();
    }
  }
  return (
    <div className="date-field">
      <label>{label}</label>
      <div className="date-input-wrap">
        <input ref={inputRef} type="date" value={value??""} onChange={(e)=>onChange(e.target.value)} />
        <button type="button" className="calendar-button" onClick={openCalendar} aria-label={`${label}: Kalender öffnen`} title="Kalender öffnen">
          <CalendarDays />
        </button>
      </div>
      <div className="date-quick-actions">
        <button type="button" className="button ghost small" onClick={()=>onChange(isoOffset(0))}>Heute</button>
        <button type="button" className="button ghost small" onClick={()=>onChange(isoOffset(1))}>Morgen</button>
        <button type="button" className="button ghost small" onClick={()=>onChange(isoOffset(7))}>+1 Woche</button>
        {value&&<button type="button" className="button ghost small" onClick={()=>onChange("")}>Löschen</button>}
      </div>
    </div>
  );
}
