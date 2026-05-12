'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { saveProfile } from '@/lib/auth'
import {
  saveMeal, getMeals,
  addFoodLog, getFoodLog, deleteFoodLog,
  saveWaterLog, getWaterLog,
  saveWeightLog, getWeightLog, deleteWeightLog,
  addActivityLog, getActivityLog, deleteActivityLog,
  saveGroceryItems, getGroceryItems, toggleGroceryItem,
  saveRecipe, getSavedRecipes, deleteSavedRecipe,
} from '@/lib/db'
import Dashboard from './Dashboard'

// ── Photo Food Logger Component ───────────────────────────────────────────
function PhotoFoodLogger({ onPhoto, loading }: { onPhoto:(f:File)=>void, loading:boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string|null>(null)

  function handleFile(file: File|null) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onPhoto(file)
  }

  return (
    <div style={{marginBottom:'1rem'}}>
      {preview ? (
        <div style={{marginBottom:'1rem',position:'relative' as const}}>
          <img src={preview} alt="Food" style={{width:'100%',borderRadius:'var(--radius-lg)',maxHeight:'220px',objectFit:'cover',display:'block'}}/>
          {!loading&&(
            <button onClick={()=>{setPreview(null)}}
              style={{position:'absolute' as const,top:'8px',right:'8px',background:'rgba(0,0,0,.6)',border:'none',borderRadius:'50%',width:'28px',height:'28px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-x" style={{fontSize:'14px',color:'#fff'}}/>
            </button>
          )}
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1rem'}}>
          {/* Camera capture */}
          <button onClick={()=>{ const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.capture='environment'; i.onchange=()=>handleFile(i.files?.[0]||null); i.click() }}
            style={{padding:'20px 12px',background:'var(--color-primary-pale)',border:`1.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-lg)',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:'8px',cursor:'pointer',fontFamily:'var(--font-body)'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-camera" style={{fontSize:'22px',color:'#fff'}}/>
            </div>
            <div style={{fontSize:'13px',fontWeight:'600',color:'var(--color-primary)'}}>Take photo</div>
            <div style={{fontSize:'11px',color:'var(--color-primary)',opacity:.7}}>Use camera</div>
          </button>
          {/* Gallery upload */}
          <button onClick={()=>fileRef.current?.click()}
            style={{padding:'20px 12px',background:'var(--color-surface-2)',border:`1px solid var(--color-border)`,borderRadius:'var(--radius-lg)',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:'8px',cursor:'pointer',fontFamily:'var(--font-body)'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'var(--color-surface)',border:`1px solid var(--color-border)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-photo" style={{fontSize:'22px',color:'var(--color-text-muted)'}}/>
            </div>
            <div style={{fontSize:'13px',fontWeight:'600',color:'var(--color-text)'}}>Upload photo</div>
            <div style={{fontSize:'11px',color:'var(--color-text-muted)'}}>From gallery</div>
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
        onChange={e=>handleFile(e.target.files?.[0]||null)}/>
      <div style={{fontSize:'11px',color:'var(--color-text-muted)',textAlign:'center' as const,lineHeight:'1.5'}}>
        <i className="ti ti-sparkles" style={{fontSize:'12px',marginRight:'4px',color:'var(--color-primary)'}}/>
        Sage analyses your photo and estimates the nutrition
      </div>
    </div>
  )
}

// ── Barcode Scanner Component ─────────────────────────────────────────────
function BarcodeScanner({ onResult }: { onResult: (code:string)=>void }) {
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream|null>(null)

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
      const { BrowserMultiFormatReader } = await import('@zxing/library' as any).catch(()=>({ BrowserMultiFormatReader: null }))
      if (BrowserMultiFormatReader && videoRef.current) {
        const reader = new BrowserMultiFormatReader()
        reader.decodeFromVideoElement(videoRef.current, (result: any) => {
          if (result) { onResult(result.getText()); stopCamera() }
        })
      }
    } catch(e) { console.log('Camera not available') }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t=>t.stop())
    setCameraActive(false)
  }

  useEffect(()=>()=>{ streamRef.current?.getTracks().forEach(t=>t.stop()) }, [])

  return (
    <div style={{marginBottom:'1rem'}}>
      {cameraActive ? (
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{position:'relative' as const,borderRadius:'var(--radius-lg)',overflow:'hidden',background:'#000',marginBottom:'8px'}}>
            <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',display:'block',maxHeight:'220px',objectFit:'cover'}}/>
            <div style={{position:'absolute' as const,inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:'220px',height:'90px',border:'2.5px solid var(--color-primary)',borderRadius:'10px',boxShadow:'0 0 0 9999px rgba(0,0,0,.55)'}}/>
            </div>
            <div style={{position:'absolute' as const,bottom:'10px',left:0,right:0,textAlign:'center' as const}}>
              <span style={{background:'rgba(0,0,0,.65)',color:'#fff',fontSize:'11px',padding:'4px 12px',borderRadius:'20px'}}>Align barcode in the box</span>
            </div>
          </div>
          <button onClick={stopCamera} style={{width:'100%',padding:'11px',background:'transparent',border:`1px solid var(--color-border)`,borderRadius:'var(--radius-md)',fontSize:'13px',color:'var(--color-text-muted)',cursor:'pointer',fontFamily:'var(--font-body)'}}>
            Stop camera
          </button>
        </div>
      ) : (
        <button className="pressable" onClick={startCamera}
          style={{width:'100%',padding:'16px 18px',background:'var(--color-primary-pale)',border:`1.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-lg)',display:'flex',alignItems:'center',gap:'14px',cursor:'pointer',marginBottom:'1.25rem',fontFamily:'var(--font-body)'}}>
          <div style={{width:'46px',height:'46px',borderRadius:'50%',background:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="ti ti-camera" style={{fontSize:'22px',color:'#fff'}}/>
          </div>
          <div style={{textAlign:'left' as const,flex:1}}>
            <div style={{fontSize:'14px',fontWeight:'600',color:'var(--color-primary)'}}>Scan with camera</div>
            <div style={{fontSize:'12px',color:'var(--color-primary)',opacity:.7,marginTop:'2px'}}>Point at any product barcode</div>
          </div>
          <i className="ti ti-chevron-right" style={{fontSize:'16px',color:'var(--color-primary)',opacity:.6}}/>
        </button>
      )}

      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'10px'}}>Or type barcode number</div>
      <div style={{display:'flex',gap:'10px',alignItems:'stretch'}}>
        <input
          value={manualCode}
          onChange={e=>setManualCode(e.target.value.replace(/\D/g,''))}
          onKeyDown={e=>e.key==='Enter'&&manualCode.length>=6&&onResult(manualCode)}
          placeholder="20047238"
          inputMode="numeric"
          autoComplete="off"
          style={{
            flex:1, padding:'14px 16px',
            fontSize:'22px', fontWeight:'700', letterSpacing:'3px',
            borderRadius:'var(--radius-md)',
            border:`2px solid ${manualCode.length>=6?'var(--color-primary)':'var(--color-border)'}`,
            background:'var(--color-surface)',
            color:'var(--color-text)',
            fontFamily:'monospace',
            outline:'none',
            transition:'border-color .15s',
            minWidth:0,
          }}
        />
        <button
          onClick={()=>manualCode.length>=6&&onResult(manualCode)}
          disabled={manualCode.length<6}
          style={{
            width:'54px', borderRadius:'var(--radius-md)',
            background:manualCode.length>=6?'var(--color-primary)':'var(--color-border)',
            border:'none', cursor:manualCode.length>=6?'pointer':'not-allowed',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, transition:'background .15s',
          }}>
          <i className="ti ti-search" style={{fontSize:'22px',color:'#fff'}}/>
        </button>
      </div>
      {manualCode.length>0&&manualCode.length<6&&(
        <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'6px'}}>Barcodes are 6–13 digits</div>
      )}
    </div>
  )
}
// ── Meal Image Component — uses Unsplash Source (free, no API key) ─────────
function MealImage({ name, emoji, size=80 }: { name:string, emoji?:string, size?:number }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  // Unsplash Source: free, no key, just search by keyword
  const query = encodeURIComponent(name.split(' ').slice(0,3).join(' '))
  const url = `https://source.unsplash.com/${size}x${size}/?food,${query}`
  return (
    <div style={{width:`${size}px`,height:`${size}px`,borderRadius:'var(--radius-md)',overflow:'hidden',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative' as const}}>
      {!error && (
        <img src={url} alt={name} loading="lazy"
          onLoad={()=>setLoaded(true)} onError={()=>setError(true)}
          style={{width:'100%',height:'100%',objectFit:'cover',display:loaded?'block':'none'}}/>
      )}
      {(!loaded||error) && <span style={{fontSize:`${Math.round(size*0.45)}px`}}>{emoji||'🍽️'}</span>}
    </div>
  )
}

function StarRating({ value, onChange, size=18, readonly=false }: { value:number, onChange?:(r:number)=>void, size?:number, readonly?:boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{display:'flex',gap:'2px',alignItems:'center'}}>
      {[1,2,3,4,5].map(i=>(
        <span key={i}
          onClick={()=>!readonly && onChange?.(i)}
          onMouseEnter={()=>!readonly && setHover(i)}
          onMouseLeave={()=>!readonly && setHover(0)}
          style={{fontSize:`${size}px`,cursor:readonly?'default':'pointer',lineHeight:1,
            color: i<=(hover||value) ? '#f59e0b' : 'var(--border)',
            transition:'color .1s'}}>
          ★
        </span>
      ))}
    </div>
  )
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const COACH_NAME = 'Sage'
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const GL: Record<string,string> = { bulk:'Bulking', cut:'Cutting', maintain:'Balanced', energy:'Energy boost', gut:'Gut health' }
const TARGET: Record<string,number> = { bulk:2700, cut:1750, maintain:2000, energy:2000, gut:1900 }
const GOAL_ADJ: Record<string,number> = { bulk:300, cut:-400, maintain:0, energy:0, gut:0 }
const TABS = ['home','meals','grocery','tracker','health','assist','profile']
const TAB_LABELS: Record<string,string> = { home:'Home', meals:'Meals', tracker:'Tracker', grocery:'Grocery', health:'Health', assist:'Sage', profile:'Profile' }
const TAB_ICONS: Record<string,string> = { home:'ti-home', meals:'ti-salad', tracker:'ti-chart-bar', grocery:'ti-shopping-cart', health:'ti-droplet', assist:'ti-robot', profile:'ti-user' }

const MEAL_SLOTS = [
  { id:'breakfast', label:'Breakfast', icon:'ti-sun',      emoji:'🌅' },
  { id:'lunch',     label:'Lunch',     icon:'ti-sun-high', emoji:'☀️' },
  { id:'dinner',    label:'Dinner',    icon:'ti-moon',     emoji:'🌙' },
]

const COUNTRIES: Record<string,{name:string,flag:string,currency:string,stores:{id:string,name:string,color:string}[]}> = {
  HU:{name:'Hungary',flag:'🇭🇺',currency:'Ft',stores:[{id:'tesco',name:'Tesco',color:'#003DA5'},{id:'lidl',name:'Lidl',color:'#0050AA'},{id:'aldi',name:'Aldi',color:'#00539F'},{id:'spar',name:'Spar',color:'#00843D'},{id:'penny',name:'Penny',color:'#E3000F'},{id:'cba',name:'CBA',color:'#E87722'}]},
  DE:{name:'Germany',flag:'🇩🇪',currency:'€',stores:[{id:'rewe',name:'Rewe',color:'#CC0000'},{id:'edeka',name:'Edeka',color:'#FFD700'},{id:'lidl',name:'Lidl',color:'#0050AA'},{id:'aldi',name:'Aldi',color:'#00539F'},{id:'penny',name:'Penny',color:'#E3000F'}]},
  AT:{name:'Austria',flag:'🇦🇹',currency:'€',stores:[{id:'billa',name:'Billa',color:'#CC0000'},{id:'spar',name:'Spar',color:'#00843D'},{id:'hofer',name:'Hofer',color:'#00539F'},{id:'lidl',name:'Lidl',color:'#0050AA'}]},
  UK:{name:'United Kingdom',flag:'🇬🇧',currency:'£',stores:[{id:'tesco',name:'Tesco',color:'#003DA5'},{id:'sainsburys',name:"Sainsbury's",color:'#FF7500'},{id:'asda',name:'Asda',color:'#00843D'},{id:'aldi',name:'Aldi',color:'#00539F'},{id:'lidl',name:'Lidl',color:'#0050AA'}]},
  FR:{name:'France',flag:'🇫🇷',currency:'€',stores:[{id:'carrefour',name:'Carrefour',color:'#004A97'},{id:'intermarche',name:'Intermarché',color:'#CC0000'},{id:'lidl',name:'Lidl',color:'#0050AA'},{id:'aldi',name:'Aldi',color:'#00539F'}]},
  US:{name:'United States',flag:'🇺🇸',currency:'$',stores:[{id:'walmart',name:'Walmart',color:'#0071CE'},{id:'wholeFoods',name:'Whole Foods',color:'#00674B'},{id:'kroger',name:'Kroger',color:'#004990'},{id:'trader',name:"Trader Joe's",color:'#CC0000'}]},
}
const AVATARS = ['🥗','💪','🔥','⚡','🌿','🏃','🥑','👑','🌟','🎯']
const DIETS = ['vegetarian','vegan','gluten-free','dairy-free','keto','halal']
const ALLERGIES = ['nuts','shellfish','eggs','soy','fish','sesame']
const GOALS = [
  { value:'bulk',     label:'Build muscle (bulk)',  desc:'High protein, caloric surplus' },
  { value:'cut',      label:'Lose weight (cut)',    desc:'Caloric deficit, high protein' },
  { value:'maintain', label:'Stay balanced',        desc:'Balanced macros' },
  { value:'energy',   label:'Boost energy',         desc:'Low glycaemic, energising' },
  { value:'gut',      label:'Gut health',           desc:'Fibre-rich, fermented foods' },
]
const ACTIVITIES = [
  { value:'running',    label:'Running',        icon:'ti-run',               burn:10 },
  { value:'cycling',    label:'Cycling',        icon:'ti-bike',              burn:7  },
  { value:'gym',        label:'Gym / weights',  icon:'ti-barbell',           burn:6  },
  { value:'swimming',   label:'Swimming',       icon:'ti-swimming',          burn:9  },
  { value:'walking',    label:'Walking',        icon:'ti-walk',              burn:4  },
  { value:'yoga',       label:'Yoga',           icon:'ti-heart',             burn:3  },
  { value:'hiit',       label:'HIIT',           icon:'ti-flame',             burn:11 },
  { value:'tennis',     label:'Tennis',         icon:'ti-ball-tennis',       burn:8  },
  { value:'basketball', label:'Basketball',     icon:'ti-ball-basketball',   burn:8  },
  { value:'football',   label:'Football',       icon:'ti-ball-football',     burn:9  },
  { value:'hiking',     label:'Hiking',         icon:'ti-mountain',          burn:6  },
  { value:'dancing',    label:'Dancing',        icon:'ti-music',             burn:6  },
  { value:'pilates',    label:'Pilates',        icon:'ti-activity',          burn:4  },
  { value:'other',      label:'Other',          icon:'ti-activity',          burn:6  },
]
const CUISINES = [
  { value:'italian',       label:'Italian',       flag:'🇮🇹' },
  { value:'french',        label:'French',        flag:'🇫🇷' },
  { value:'indian',        label:'Indian',        flag:'🇮🇳' },
  { value:'japanese',      label:'Japanese',      flag:'🇯🇵' },
  { value:'mexican',       label:'Mexican',       flag:'🇲🇽' },
  { value:'mediterranean', label:'Mediterranean', flag:'🌊' },
  { value:'asian',         label:'Asian',         flag:'🥢' },
  { value:'american',      label:'American',      flag:'🇺🇸' },
  { value:'hungarian',     label:'Hungarian',     flag:'🇭🇺' },
  { value:'greek',         label:'Greek',         flag:'🇬🇷' },
  { value:'thai',          label:'Thai',          flag:'🇹🇭' },
  { value:'turkish',       label:'Turkish',       flag:'🇹🇷' },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function todayKey() { return dateKey(new Date()) }

function useTheme() {
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  useEffect(()=>{
    const stored = localStorage.getItem('planify-theme')
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'
    const init = (stored as 'light'|'dark') || preferred
    setTheme(init); document.documentElement.setAttribute('data-theme', init)
  },[])
  function toggle() {
    const next = theme==='light'?'dark':'light'
    setTheme(next); document.documentElement.setAttribute('data-theme',next)
    localStorage.setItem('planify-theme',next)
  }
  return { theme, toggle }
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Modal({ open, onClose, title, subtitle, children }: any) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-sheet">
        <div className="modal-handle"/>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          {subtitle&&<div className="modal-sub">{subtitle}</div>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function ToggleSwitch({ value, onChange }: { value:boolean, onChange:(v:boolean)=>void }) {
  return (
    <div className="toggle" onClick={()=>onChange(!value)}
      style={{background:value?'var(--color-primary)':'var(--color-border)'}}>
      <div className="toggle-thumb" style={{left:value?'21px':'3px'}}/>
    </div>
  )
}

function SL({ children }: { children: React.ReactNode }) {
  return <span className="sl">{children}</span>
}

function PasswordForm({ onDone }: { onDone:()=>void }) {
  const [pw,setPw]=useState(''); const [confirm,setConfirm]=useState('')
  const [loading,setLoading]=useState(false); const [err,setErr]=useState(''); const [msg,setMsg]=useState('')
  async function handle() {
    if (pw.length<8) { setErr('Password must be at least 8 characters'); return }
    if (pw!==confirm) { setErr('Passwords do not match'); return }
    setLoading(true); setErr(''); setMsg('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setErr(error.message); else { setMsg('Password updated!'); setTimeout(onDone,1500) }
    setLoading(false)
  }
  return (
    <div>
      <SL>New password</SL>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters" className="input"/>
      <SL>Confirm new password</SL>
      <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat new password" className="input"/>
      {err&&<div style={{fontSize:'13px',color:'var(--color-red)',marginBottom:'8px',textAlign:'center' as const}}>{err}</div>}
      {msg&&<div style={{fontSize:'13px',color:'var(--color-primary)',marginBottom:'8px',textAlign:'center' as const}}>{msg}</div>}
      <button className="btn-primary" onClick={handle} disabled={loading}>{loading?'Updating...':'Update password'}</button>
      <button className="btn-ghost" onClick={onDone} style={{marginTop:'8px'}}>Cancel</button>
    </div>
  )
}

function TDEEForm({ goal, currentTdee, savedStats, onComplete, onCancel }: any) {
  const [sex,setSex]=useState<'male'|'female'|null>(savedStats?.sex||null)
  const [age,setAge]=useState(savedStats?.age?String(savedStats.age):'')
  const [weight,setWeight]=useState(savedStats?.weight?String(savedStats.weight):'')
  const [height,setHeight]=useState(savedStats?.height?String(savedStats.height):'')
  const [activity,setActivity]=useState<number|null>(savedStats?.activity||null)
  const [result,setResult]=useState<any>(null)
  const AL=[{v:1.2,l:'Sedentary',d:'Desk job, little exercise'},{v:1.375,l:'Lightly active',d:'1–3 workouts/week'},{v:1.55,l:'Moderately active',d:'3–5 workouts/week'},{v:1.725,l:'Very active',d:'6–7 workouts/week'},{v:1.9,l:'Athlete',d:'Twice daily training'}]
  const GADJ: Record<string,number>={ bulk:300, cut:-400, maintain:0, energy:0, gut:0 }
  const GMAC: Record<string,{p:number,f:number}>={ bulk:{p:2.2,f:0.9}, cut:{p:2.4,f:0.8}, maintain:{p:1.8,f:0.9}, energy:{p:1.8,f:1.0}, gut:{p:1.6,f:1.0} }
  function calc() {
    const w=parseFloat(weight),h=parseFloat(height),a=parseInt(age)
    if(!w||!h||!a||!sex||!activity) return
    const bmr=sex==='male'?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161
    const tdee=Math.round(bmr*activity); const adj=GADJ[goal||'maintain']||0; const tc=tdee+adj
    const mac=GMAC[goal||'maintain']; const protein=Math.round(w*mac.p); const fat=Math.round(w*mac.f)
    const carbs=Math.round(Math.max((tc-protein*4-fat*9)/4,50))
    setResult({tdee,targetCals:tc,protein,carbs,fat,stats:{sex,age:a,weight:w,height:h,activity}})
  }
  const ready=!!(sex&&age&&weight&&height&&activity)

  if (result) return (
    <div>
      <div style={{background:'var(--color-primary)',borderRadius:'var(--radius-xl)',padding:'1.5rem',marginBottom:'14px',textAlign:'center' as const,color:'#fff'}}>
        <div style={{fontSize:'12px',opacity:.75,marginBottom:'4px'}}>New daily calorie target</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:'52px',lineHeight:1}}>{result.targetCals}</div>
        <div style={{fontSize:'12px',opacity:.65,marginTop:'4px'}}>kcal / day</div>
        {currentTdee&&<div style={{fontSize:'11px',opacity:.5,marginTop:'6px'}}>Previously: {currentTdee} kcal</div>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}}>
        {[{l:'Protein',v:result.protein+'g',c:'var(--color-primary)'},{l:'Carbs',v:result.carbs+'g',c:'var(--color-blue)'},{l:'Fat',v:result.fat+'g',c:'var(--color-amber)'}].map(m=>(
          <div key={m.l} className="card card-sm" style={{textAlign:'center' as const}}>
            <div style={{fontSize:'18px',fontWeight:'600',color:m.c}}>{m.v}</div>
            <div style={{fontSize:'10px',color:'var(--color-text-muted)',textTransform:'uppercase' as const,marginTop:'2px'}}>{m.l}</div>
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={()=>onComplete({tdee:result.targetCals,protein:result.protein,carbs:result.carbs,fat:result.fat,stats:result.stats})}>Save new targets</button>
      <button className="btn-ghost" onClick={()=>setResult(null)} style={{marginTop:'8px'}}>← Recalculate</button>
    </div>
  )

  return (
    <div>
      <SL>Biological sex</SL>
      <div style={{display:'flex',gap:'8px',marginBottom:'1rem'}}>
        {(['male','female'] as const).map(v=>(
          <div key={v} className={`pressable ${sex===v?'chip active-green':'chip'}`} onClick={()=>setSex(v)}
            style={{flex:1,justifyContent:'center',padding:'11px'}}>
            {v==='male'?'♂ Male':'♀ Female'}
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
        {[{l:'Age',p:'25',v:age,s:setAge},{l:'Weight (kg)',p:'75',v:weight,s:setWeight},{l:'Height (cm)',p:'175',v:height,s:setHeight}].map(f=>(
          <div key={f.l}>
            <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',marginBottom:'4px',textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{f.l}</div>
            <input type="number" placeholder={f.p} value={f.v} onChange={e=>f.s(e.target.value)} className="input" style={{marginBottom:0,textAlign:'center' as const,fontSize:'18px',fontWeight:'600',padding:'10px'}}/>
          </div>
        ))}
      </div>
      <SL>Activity level</SL>
      {AL.map(level=>(
        <div key={level.v} className={`activity-option${activity===level.v?' selected':''}`} onClick={()=>setActivity(level.v)}>
          <div style={{flex:1}}>
            <div style={{fontSize:'13px',fontWeight:'500',color:activity===level.v?'var(--color-primary)':'var(--color-text)'}}>{level.l}</div>
            <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>{level.d}</div>
          </div>
          <div className="radio"/>
        </div>
      ))}
      <button className="btn-primary" onClick={calc} disabled={!ready} style={{marginTop:'6px'}}>Calculate →</button>
      <button className="btn-ghost" onClick={onCancel} style={{marginTop:'8px'}}>Cancel</button>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function MainApp({ user, profile, onProfileUpdate }: any) {
  const { theme, toggle: toggleTheme } = useTheme()

  // Navigation
  const [tab, setTab] = useState('home')
  const [tabKey, setTabKey] = useState(0)
  const [profileSubPage, setProfileSubPage] = useState<string|null>(null)
  const [calViewOffset, setCalViewOffset] = useState(0)
  const [storeModalOpen, setStoreModalOpen] = useState(false)
  const [activeMealSlot, setActiveMealSlot] = useState<'breakfast'|'lunch'|'dinner'>('lunch')
  const [userCountry, setUserCountry] = useState<string>(profile?.country||'HU')
  const [userStores, setUserStores] = useState<string[]>(profile?.preferred_stores||[])
  const [groceryOptimized, setGroceryOptimized] = useState<Record<string,{store:string,price:string}>>({})
  const [groceryOptLoading, setGroceryOptLoading] = useState(false)
  const [groceryTotalEstimate, setGroceryTotalEstimate] = useState('')

  // Meal planning — date-based
  const [activeDate, setActiveDate] = useState(todayKey())
  const [meals, setMeals] = useState<Record<string,any>>({})
  const [servings, setServingsRaw] = useState<number>(()=>{
    try { return parseInt(localStorage.getItem('planify-servings')||'') || profile?.default_servings || 2 } catch { return 2 }
  })
  const [mealDays, setMealDaysRaw] = useState<number>(()=>{
    try { return parseInt(localStorage.getItem('planify-mealdays')||'') || 1 } catch { return 1 }
  })
  function setServings(v: number|(((s:number)=>number))) {
    const next = typeof v === 'function' ? v(servings) : v
    setServingsRaw(next)
    try { localStorage.setItem('planify-servings', String(next)) } catch {}
  }
  function setMealDays(v: number|(((d:number)=>number))) {
    const next = typeof v === 'function' ? v(mealDays) : v
    setMealDaysRaw(next)
    try { localStorage.setItem('planify-mealdays', String(next)) } catch {}
  }
  const [showSaved, setShowSaved] = useState(false)

  // Logs
  const [grocery, setGrocery] = useState<any[]>([])
  const [foodLog, setFoodLog] = useState<any[]>([])
  const [waterLog, setWaterLog] = useState<Record<string,number>>({})
  const [waterToday, setWaterToday] = useState(0)
  const [weightLog, setWeightLog] = useState<any[]>([])
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [savedRecipes, setSavedRecipes] = useState<any[]>([])
  const [mealRatings, setMealRatings] = useState<Record<string,{avg:number,count:number}>>({}) // community ratings
  const [myRatings, setMyRatings] = useState<Record<string,number>>({}) // user's own ratings
  const [ratingTarget, setRatingTarget] = useState<string|null>(null) // meal being rated

  // Meal suggestions
  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [mealSuggestions, setMealSuggestions] = useState<any[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [mealFilters, setMealFilters] = useState({ time:null as string|null, diff:null as string|null, cuisine:null as string|null })
  const [draftFilters, setDraftFilters] = useState({ time:null as string|null, diff:null as string|null, cuisine:null as string|null })
  const [avoidInput, setAvoidInput] = useState('')
  const [draftAvoid, setDraftAvoid] = useState('')
  const [savedToast, setSavedToast] = useState(false)

  // Tracker modals
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanError, setScanError] = useState('')
  const [photoLogOpen, setPhotoLogOpen] = useState(false)
  const [photoResult, setPhotoResult] = useState<any>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [actModalOpen, setActModalOpen] = useState(false)
  const [logResult, setLogResult] = useState<any>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [foodMealTime, setFoodMealTime] = useState('breakfast')
  const [actType, setActType] = useState<string|null>(null)
  const [actBurnPreview, setActBurnPreview] = useState<number|null>(null)
  const foodNameRef = useRef<HTMLInputElement>(null)
  const foodPortionRef = useRef<HTMLInputElement>(null)
  const actDurRef = useRef<HTMLInputElement>(null)

  // Health
  const [waterGoal] = useState(profile?.water_goal||2500)
  const [weightInput, setWeightInput] = useState('')
  const [weightGoal] = useState(profile?.weight_goal||null)

  // Coach
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const MAX_HISTORY = 30 // max messages stored per user
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Profile editing
  const [editModalOpen, setEditModalOpen] = useState<string|null>(null)
  const [editProfile, setEditProfile] = useState<any>({...profile})
  const [avatar, setAvatar] = useState(profile?.avatar||'🥗')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url||null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  // Calorie target: stored TDEE (base metabolic rate) + goal adjustment
  const baseTdee = profile?.tdee || TARGET[profile?.goal] || 2000
  const tgt = profile?.tdee
    ? Math.max(1200, baseTdee + (GOAL_ADJ[profile?.goal] || 0))
    : TARGET[profile?.goal] || 2000
  const loggedCals = foodLog.reduce((a:number,x:any)=>a+(x.calories||0),0)
  const totalIn = ((meals[activeDate]?.macros?.calories||0) + loggedCals)
  const totalBurned = activityLog.reduce((a:number,x:any)=>a+(x.burned||0),0)
  const netCals = totalIn - totalBurned
  const displayName = profile?.username || user?.email?.split('@')[0] || 'there'
  const goalReached = waterToday >= waterGoal
  const waterPct = Math.min(waterToday/waterGoal,1)
  const filledGlasses = Math.min(5,Math.round(waterPct*5))

  function switchTab(t:string) {
    if(t===tab) return
    setTab(t); setTabKey(k=>k+1)
    if(t!=='profile') setProfileSubPage(null)
    if(t==='assist'&&!historyLoaded) loadSageHistory()
  }
  function viewAllMeals() { setShowSaved(false); switchTab('meals') }

  function activeDateLabel() {
    const today = todayKey()
    const tomorrow = dateKey(new Date(Date.now()+86400000))
    if (activeDate===today) return 'Today'
    if (activeDate===tomorrow) return 'Tomorrow'
    const d = new Date(activeDate+'T12:00:00')
    return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})
  }

  function calcStreak() {
    let streak=0
    for (let i=0; i<365; i++) {
      const d=new Date(); d.setDate(d.getDate()-i)
      const val = i===0 ? waterToday : (waterLog[dateKey(d)]||0)
      if (val>=waterGoal) streak++; else break
    }
    return streak
  }
  const waterStreak = calcStreak()

  // ─── DATA LOADING ─────────────────────────────────────────────────────────

  useEffect(()=>{ loadAll() },[activeDate])
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}) },[chatHistory])

  async function loadAll() {
    await Promise.all([loadMeals(),loadGrocery(),loadFoodLog(),loadWater(),loadWeight(),loadActivity(),loadSavedRecipes()])
  }
  async function loadMeals() {
    try {
      const data = await getMeals(user.id, todayKey())
      const map: Record<string,any> = {}
      data.forEach((m:any)=>{
        const key = m.slot_key || (m.plan_date ? `${m.plan_date}_${m.meal_slot||'lunch'}` : dateKey(new Date()))
        map[key] = {...m, desc:m.description}
      })
      setMeals(map)
      const names = data.map((m:any)=>m.name).filter(Boolean)
      if (names.length) loadMealRatings(names)
    } catch(e){console.error(e)}
  }
  async function loadGrocery() { try { setGrocery(await getGroceryItems(user.id,activeDate)||[]) } catch(e){console.error(e)} }
  async function loadFoodLog() { try { setFoodLog(await getFoodLog(user.id,todayKey())||[]) } catch(e){console.error(e)} }
  async function loadWater() {
    try {
      const data=await getWaterLog(user.id,dateKey(new Date(Date.now()-365*86400000)))
      const map:Record<string,number>={};
      data.forEach((w:any)=>{map[w.logged_date]=w.amount})
      setWaterLog(map); setWaterToday(map[todayKey()]||0)
    } catch(e){console.error(e)}
  }
  async function loadWeight() { try { setWeightLog(await getWeightLog(user.id)||[]) } catch(e){console.error(e)} }
  async function loadActivity() { try { setActivityLog(await getActivityLog(user.id,todayKey())||[]) } catch(e){console.error(e)} }
  async function loadSavedRecipes() { try { setSavedRecipes(await getSavedRecipes(user.id)||[]) } catch(e){console.error(e)} }
  async function loadSageHistory() {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.from('sage_history').select('messages').eq('user_id', user.id).single()
      if (data?.messages?.length) setChatHistory(data.messages)
    } catch {} // No history yet is fine
    setHistoryLoaded(true)
  }

  async function saveSageHistory(msgs: any[]) {
    try {
      const trimmed = msgs.slice(-MAX_HISTORY) // keep last 30 messages
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('sage_history').upsert({ user_id: user.id, messages: trimmed, updated_at: new Date().toISOString() })
    } catch(e) { console.error(e) }
  }

  async function loadMealRatings(names: string[]) {
    if (!names.length) return
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.from('meal_rating_averages').select('*').in('meal_name', names)
      const map: Record<string,{avg:number,count:number}> = {}
      data?.forEach((r:any) => { map[r.meal_name] = { avg: parseFloat(r.avg_rating), count: parseInt(r.rating_count) } })
      setMealRatings(m => ({...m, ...map}))
    } catch(e) { console.error(e) }
  }

  async function submitRating(mealName: string, rating: number) {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('meal_ratings').upsert({ user_id: user.id, meal_name: mealName, rating }, { onConflict: 'user_id,meal_name' })
      setMyRatings(r => ({...r, [mealName]: rating}))
      setRatingTarget(null)
      await loadMealRatings([mealName])
    } catch(e) { console.error(e) }
  }

  // ─── MEAL ACTIONS ──────────────────────────────────────────────────────────

  async function selectMeal(meal:any) {
    try {
      for (let d=0; d<mealDays; d++) {
        const td=new Date(activeDate+'T12:00:00'); td.setDate(td.getDate()+d)
        const dk=dateKey(td)
        const slotKey=`${dk}_${activeMealSlot}`
        await saveMeal(user.id,dk,0,{...meal,servings,plan_date:dk,meal_slot:activeMealSlot,slot_key:slotKey})
      }
      await loadMeals(); setMealModalOpen(false); setMealSuggestions([])
    } catch(e){console.error(e)}
  }

  async function getSuggestions() {
    // Commit draft filters to actual filters
    setMealFilters({...draftFilters})
    setAvoidInput(draftAvoid)
    setSuggestLoading(true); setMealSuggestions([])
    try {
      const res=await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({profile,filters:{diet:profile.diet,allergies:profile.allergies,goal:profile.goal,budget:profile.budget,time:draftFilters.time,difficulty:draftFilters.diff,cuisine:draftFilters.cuisine},avoid:draftAvoid,servings,mealDays})})
      const data=await res.json(); setMealSuggestions(data.meals||[])
      if (data.meals?.length) loadMealRatings(data.meals.map((m:any)=>m.name))
    } catch(e){console.error(e)}
    setSuggestLoading(false)
  }

  async function handleSaveRecipe(meal:any) {
    try { await saveRecipe(user.id,meal); await loadSavedRecipes(); setSavedToast(true); setTimeout(()=>setSavedToast(false),2500) } catch(e){console.error(e)}
  }

  async function addToGrocery(targetDate:string) {
    const meal=meals[targetDate]; if(!meal?.ingredients) return
    const scale=servings/2
    const items=meal.ingredients.map((ing:any)=>{
      let qty=ing.qty; const m=qty.match(/^([\d.]+)(.*)/)
      if(m) qty=Math.round(parseFloat(m[1])*scale*10)/10+m[2]
      return {name:ing.name,qty,section:ing.section,checked:false}
    })
    try { await saveGroceryItems(user.id,activeDate,[...grocery.filter((g:any)=>!items.find((i:any)=>i.name===g.name)),...items]); await loadGrocery(); switchTab('grocery') } catch(e){console.error(e)}
  }

  // ─── PHOTO FOOD LOG ───────────────────────────────────────────────────────
  async function analysePhoto(file: File) {
    setPhotoLoading(true); setPhotoError(''); setPhotoResult(null)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.onerror = () => rej(new Error('Read failed'))
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/photolog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
      })
      const data = await response.json()
      if (data.error) { setPhotoError(data.error); return }
      setPhotoResult(data)
    } catch(e) { setPhotoError('Failed to analyse photo. Please try again.') }
    setPhotoLoading(false)
  }

  async function addPhotoFood() {
    if (!photoResult) return
    try {
      await addFoodLog(user.id, { date: todayKey(), mealTime: foodMealTime, name: photoResult.name, portion: photoResult.portion, calories: photoResult.calories, protein: photoResult.protein, carbs: photoResult.carbs, fat: photoResult.fat })
      await loadFoodLog()
      setPhotoLogOpen(false); setPhotoResult(null)
      setLogResult(photoResult)
    } catch(e) { console.error(e) }
  }
  async function lookupBarcode(barcode: string) {
    setScanError(''); setScanResult(null)
    try {
      // Try exact barcode first, then search by name if not found
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,nutriments,serving_size,serving_quantity,brands,quantity,nutriscore_grade`,
        { headers: { 'User-Agent': 'Planify/1.0' } }
      )
      const data = await res.json()
      if (data.status !== 1 || !data.product) {
        setScanError('Product not found in Open Food Facts database. Try typing the product name in the food search instead.')
        return
      }
      const prod = data.product
      const n = prod.nutriments || {}

      // Helper: get per-serving value first, fall back to per-100g
      const val = (key: string) => {
        const srv = n[`${key}_serving`]
        const h = n[`${key}_100g`]
        if (srv !== undefined && srv !== null) return Math.round(srv * 10) / 10
        if (h !== undefined && h !== null) return Math.round(h * 10) / 10
        return null
      }

      const result = {
        name: prod.product_name || prod.brands || 'Unknown product',
        portion: prod.serving_size || prod.quantity || '100g',
        calories:      Math.round(val('energy-kcal') || 0),
        protein:       val('proteins') ?? 0,
        carbs:         val('carbohydrates') ?? 0,
        fat:           val('fat') ?? 0,
        sugar:         val('sugars'),
        fiber:         val('fiber'),
        saturatedFat:  val('saturated-fat'),
        salt:          val('salt'),
        sodium:        val('sodium'),
        nutriscore:    prod.nutriscore_grade?.toUpperCase() || null,
      }
      setScanResult(result)
    } catch(e) {
      setScanError('Could not reach Open Food Facts. Check your internet connection.')
    }
  }

  async function addScannedFood() {
    if (!scanResult) return
    try {
      await addFoodLog(user.id, { date: todayKey(), mealTime: foodMealTime, name: scanResult.name, portion: scanResult.portion, calories: scanResult.calories, protein: scanResult.protein, carbs: scanResult.carbs, fat: scanResult.fat })
      await loadFoodLog()
      setScanResult(null); setScannerOpen(false); setScanError('')
      setLogResult(scanResult)
    } catch(e) { console.error(e) }
  }

  async function logFood() {
    const name=foodNameRef.current?.value?.trim(); const portion=foodPortionRef.current?.value?.trim()
    if(!name) return; setLogLoading(true); setLogResult(null)
    try {
      const res=await fetch('/api/foodlookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,portion})})
      const data=await res.json()
      await addFoodLog(user.id,{date:todayKey(),mealTime:foodMealTime,name,portion,...data.macros})
      await loadFoodLog(); setLogResult(data.macros)
      if(foodNameRef.current)foodNameRef.current.value=''
      if(foodPortionRef.current)foodPortionRef.current.value=''
    } catch(e){console.error(e)}
    setLogLoading(false)
  }

  // ─── WATER ─────────────────────────────────────────────────────────────────

  async function updateWater(amount:number) {
    if(goalReached&&amount>0) return
    const newAmt=Math.max(0,Math.min(waterToday+amount,waterGoal))
    setWaterToday(newAmt)
    try { await saveWaterLog(user.id,todayKey(),Math.round(newAmt),waterGoal); await loadWater() } catch(e){console.error(e)}
  }

  async function setWaterGlass(idx:number) {
    if(goalReached) return
    const filled=Math.round((waterToday/waterGoal)*5)
    const newAmt=idx<filled?Math.min((idx/5)*waterGoal,waterGoal):Math.min(((idx+1)/5)*waterGoal,waterGoal)
    setWaterToday(newAmt)
    try { await saveWaterLog(user.id,todayKey(),Math.round(newAmt),waterGoal); await loadWater() } catch(e){console.error(e)}
  }

  // ─── WEIGHT ────────────────────────────────────────────────────────────────

  async function logWeight() {
    const val=parseFloat(weightInput); if(!val||val<20||val>300) return
    try { await saveWeightLog(user.id,todayKey(),val); await loadWeight(); setWeightInput('') } catch(e){console.error(e)}
  }

  // ─── ACTIVITY ──────────────────────────────────────────────────────────────

  async function logActivity() {
    const dur=parseInt(actDurRef.current?.value||'0'); if(!actType||!dur) return
    const act=ACTIVITIES.find(a=>a.value===actType)
    const burned=Math.round((act?.burn||6)*dur)
    try {
      await addActivityLog(user.id,todayKey(),{type:actType,label:act?.label||actType,duration:dur,burned})
      await loadActivity(); setActModalOpen(false); setActType(null); setActBurnPreview(null)
      if(actDurRef.current) actDurRef.current.value=''
    } catch(e){console.error(e)}
  }

  // ─── GROCERY ───────────────────────────────────────────────────────────────

  async function toggleItem(id:string,checked:boolean) {
    try { await toggleGroceryItem(user.id,id,!checked); await loadGrocery() } catch(e){console.error(e)}
  }

  // ─── CHAT ──────────────────────────────────────────────────────────────────

  async function sendChat(text?:string) {
    const msg=(text||chatInput).trim(); if(!msg||chatLoading) return
    setChatInput('')
    const newHistory=[...chatHistory,{role:'user',content:msg}]
    setChatHistory(newHistory); setChatLoading(true)
    try {
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:newHistory.slice(-20),profile,mealSummary:Object.entries(meals).map(([dk,m]:any)=>`${dk}: ${m.name}`).join(', ')})})
      const data=await res.json()
      const updated=[...newHistory,{role:'assistant',content:data.reply}]
      setChatHistory(updated)
      saveSageHistory(updated) // persist in background
    } catch(e){console.error(e)}
    setChatLoading(false)
  }

  // ─── PROFILE ───────────────────────────────────────────────────────────────

  async function saveEditedProfile() {
    try { const u=await saveProfile(user.id,{...editProfile,avatar}); onProfileUpdate(u); setEditModalOpen(null) } catch(e){console.error(e)}
  }

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith('image/')) return
    setAvatarUploading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      // Compress to max 400px and convert to webp
      const compressed = await compressImage(file, 400)
      const path = `${user.id}/avatar.webp`
      const { error } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: 'image/webp' })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now() // cache bust
      setAvatarUrl(url)
      const u = await saveProfile(user.id, { ...profile, avatar_url: url })
      onProfileUpdate(u)
      setEditModalOpen(null)
    } catch(e) { console.error('Avatar upload failed:', e) }
    setAvatarUploading(false)
  }

  function compressImage(file: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob(b => resolve(b!), 'image/webp', 0.85)
      }
      img.src = url
    })
  }

  async function saveAccountField(field:string, value:string) {
    try { const u=await saveProfile(user.id,{...profile,[field]:value}); onProfileUpdate(u) } catch(e){console.error(e)}
  }

  // ─── TAB RENDERS ──────────────────────────────────────────────────────────

  function renderHome() {
    return (
      <Dashboard key={tabKey}
        user={user} profile={{...profile,tdee:tgt}} meals={meals}
        foodLog={foodLog} activityLog={activityLog}
        waterToday={waterToday} waterGoal={waterGoal} waterStreak={waterStreak}
        weightLog={weightLog} activeDate={activeDate} activeDateLabel={activeDateLabel()}
        avatarEmoji={profile?.avatar||avatar} avatarUrl={avatarUrl||profile?.avatar_url||null}
        onAddMeal={()=>{setDraftFilters({...mealFilters});setDraftAvoid(avoidInput);setMealModalOpen(true);setMealSuggestions([])}}
        onLogFood={()=>{setLogResult(null);setLogModalOpen(true)}}
        onLogActivity={()=>setActModalOpen(true)}
        onAddWater={updateWater} onSwitchTab={switchTab}
        onViewAllMeals={viewAllMeals} onGoToProfile={()=>switchTab('profile')}
      />
    )
  }

  function renderMeals() {
    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'1rem 1.25rem 1rem'}}>
        {/* Toggle */}
        <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
          <div className={`chip pressable ${!showSaved?'active-green':''}`} onClick={()=>setShowSaved(false)}>
            Plan
          </div>
          <div className={`chip pressable ${showSaved?'active-green':''}`} onClick={()=>setShowSaved(true)}>
            Saved {savedRecipes.length>0&&<span style={{background:'var(--color-primary)',color:'#fff',borderRadius:'50%',padding:'1px 6px',fontSize:'10px',marginLeft:'2px'}}>{savedRecipes.length}</span>}
          </div>
        </div>

        {showSaved ? (
          !savedRecipes.length ? (
            <div className="empty-state">
              <img src="/images/empty-saved.png" alt=""/>
              <div className="empty-title">No saved recipes</div>
              <div className="empty-desc">Tap the heart on any suggested meal to save it here.</div>
            </div>
          ) : savedRecipes.map((recipe:any)=>(
            <div key={recipe.id} className="recipe-card anim-scale-in" style={{marginBottom:'10px',position:'relative' as const}}>
              <button onClick={async()=>{await deleteSavedRecipe(user.id,recipe.id);await loadSavedRecipes()}}
                style={{position:'absolute' as const,top:'10px',right:'10px',background:'var(--color-red-pale)',border:`0.5px solid var(--color-red-border)`,borderRadius:'50%',width:'28px',height:'28px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-heart-filled" style={{fontSize:'14px',color:'var(--color-red)'}}/>
              </button>
              <div className="recipe-card-body" style={{paddingTop:'14px'}}>
                <div className="recipe-card-name">{recipe.name}</div>
                <div className="recipe-card-desc">{recipe.description}</div>
                {recipe.macros&&<div className="macro-pill-row">
                  {[{v:recipe.macros.calories,l:'kcal',c:'var(--color-text)'},{v:recipe.macros.protein+'g',l:'protein',c:'var(--color-primary)'},{v:recipe.macros.carbs+'g',l:'carbs',c:'var(--color-blue)'},{v:recipe.macros.fat+'g',l:'fat',c:'var(--color-amber)'}].map(m=>(
                    <div key={m.l} className="macro-pill"><span className="macro-pill-val" style={{color:m.c}}>{m.v}</span><span className="macro-pill-lbl">{m.l}</span></div>
                  ))}
                </div>}
                <button className="btn-primary" onClick={()=>{selectMeal({...recipe,desc:recipe.description});setShowSaved(false)}}>
                  Add to {activeDateLabel()} <i className="ti ti-arrow-right" style={{fontSize:'14px'}}/>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div>
            {profile?.goal&&<div style={{background:'var(--color-primary-pale)',border:`0.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-md)',padding:'10px 13px',marginBottom:'12px',fontSize:'12px',color:'var(--color-primary)',display:'flex',alignItems:'center',gap:'8px'}}>
              <i className="ti ti-check" style={{fontSize:'14px'}}/>
              Tailored to: <strong>{GL[profile.goal]}</strong>{profile.diet?.length?` · ${profile.diet[0]}`:''} · €{profile.budget}/wk{tgt?` · ${tgt} kcal`:''}
            </div>}

            {/* Cuisine filter */}
            <div style={{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'4px',marginBottom:'12px'}} className="hide-scroll">
              <div className={`chip pressable ${!mealFilters.cuisine?'active-green':''}`} onClick={()=>setMealFilters(f=>({...f,cuisine:null}))}>Any</div>
              {CUISINES.map(c=>(
                <div key={c.value} className={`chip pressable ${mealFilters.cuisine===c.value?'active-green':''}`}
                  onClick={()=>setMealFilters(f=>({...f,cuisine:f.cuisine===c.value?null:c.value}))}>
                  {c.flag} {c.label}
                </div>
              ))}
            </div>

            {/* Difficulty / time filters */}
            <div style={{display:'flex',gap:'6px',marginBottom:'14px',flexWrap:'wrap' as const}}>
              {[{id:'quick',l:'Quick',t:'time'},{id:'medium',l:'Medium',t:'time'},{id:'weekend',l:'Weekend',t:'time'},{id:'easy',l:'Easy',t:'diff'},{id:'advanced',l:'Advanced',t:'diff'}].map(f=>{
                const isOn=f.t==='time'?mealFilters.time===f.id:mealFilters.diff===f.id
                return <div key={f.id} className={`chip pressable ${isOn?f.t==='time'?'active-blue':'active-amber':''}`}
                  onClick={()=>setMealFilters(m=>f.t==='time'?{...m,time:m.time===f.id?null:f.id}:{...m,diff:m.diff===f.id?null:f.id})}>{f.l}</div>
              })}
            </div>

            {/* 3 meal slots per day */}
            <span className="sl">{activeDateLabel()}'s meals</span>
            {/* Slot tabs */}
            <div style={{display:'flex',gap:'6px',marginBottom:'12px'}}>
              {MEAL_SLOTS.map(slot=>(
                <div key={slot.id} className={`chip pressable ${activeMealSlot===slot.id?'active-green':''}`}
                  onClick={()=>setActiveMealSlot(slot.id as any)}>
                  {slot.emoji} {slot.label}
                  {meals[`${activeDate}_${slot.id}`]&&<span style={{marginLeft:'4px',width:'6px',height:'6px',borderRadius:'50%',background:'var(--color-primary)',display:'inline-block',verticalAlign:'middle'}}/>}
                </div>
              ))}
            </div>
            {/* Active slot meal */}
            {(()=>{
              const slotKey=`${activeDate}_${activeMealSlot}`
              const slotMeal=meals[slotKey]
              return slotMeal ? (
                <div className="recipe-card anim-scale-in" style={{marginBottom:'12px',position:'relative' as const}}>
                  <div className="recipe-card-img" style={{padding:0,height:'100px',overflow:'hidden'}}>
                    <MealImage name={slotMeal.name} emoji={slotMeal.emoji} size={400}/>
                    <span style={{position:'absolute' as const,top:'8px',left:'10px',background:'rgba(0,0,0,.5)',borderRadius:'20px',padding:'3px 9px',fontSize:'10px',fontWeight:'600',color:'#fff'}}>
                      {MEAL_SLOTS.find(s=>s.id===activeMealSlot)?.emoji} {MEAL_SLOTS.find(s=>s.id===activeMealSlot)?.label}
                    </span>
                    <span className="tag tag-green" style={{position:'absolute' as const,top:'8px',right:'8px'}}>Planned</span>
                  </div>
                  <div className="recipe-card-body">
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',marginBottom:'4px'}}>
                      <div className="recipe-card-name" style={{flex:1}}>{slotMeal.name}</div>
                      {/* Inline rating on planned meal */}
                      <StarRating value={myRatings[slotMeal.name]||0} size={14} onChange={r=>submitRating(slotMeal.name,r)}/>
                    </div>
                    {mealRatings[slotMeal.name]&&<div style={{fontSize:'11px',color:'var(--color-text-muted)',marginBottom:'6px'}}>
                      Community: {mealRatings[slotMeal.name].avg}★ ({mealRatings[slotMeal.name].count})
                    </div>}
                    {slotMeal.macros&&<div className="macro-pill-row">
                      {[{v:slotMeal.macros.calories,l:'kcal',c:'var(--color-text)'},{v:slotMeal.macros.protein+'g',l:'protein',c:'var(--color-primary)'},{v:slotMeal.macros.carbs+'g',l:'carbs',c:'var(--color-blue)'},{v:slotMeal.macros.fat+'g',l:'fat',c:'var(--color-amber)'}].map(m=>(
                        <div key={m.l} className="macro-pill"><span className="macro-pill-val" style={{color:m.c}}>{m.v}</span><span className="macro-pill-lbl">{m.l}</span></div>
                      ))}
                    </div>}
                    <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                      <button className="pressable" onClick={()=>{setDraftFilters({...mealFilters});setDraftAvoid(avoidInput);setMealModalOpen(true);setMealSuggestions([])}}
                        style={{flex:1,padding:'9px',borderRadius:'var(--radius-md)',border:`0.5px solid var(--color-border)`,background:'var(--color-surface)',fontSize:'12px',fontWeight:'500',color:'var(--color-text-muted)',cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',justifyContent:'center',gap:'4px'}}>
                        <i className="ti ti-refresh" style={{fontSize:'12px'}}/>Change
                      </button>
                      <button className="pressable" onClick={()=>handleSaveRecipe(slotMeal)}
                        style={{padding:'9px 12px',borderRadius:'var(--radius-md)',border:`0.5px solid var(--color-border)`,background:'var(--color-surface)',fontSize:'12px',cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'4px'}}>
                        <i className="ti ti-heart" style={{fontSize:'12px',color:'var(--color-red)'}}/>Save
                      </button>
                      <button className="pressable" onClick={()=>addToGrocery(slotKey)}
                        style={{flex:1,padding:'9px',borderRadius:'var(--radius-md)',border:'none',background:'var(--color-primary)',fontSize:'12px',fontWeight:'500',color:'#fff',cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',justifyContent:'center',gap:'4px'}}>
                        <i className="ti ti-shopping-cart" style={{fontSize:'12px'}}/>Grocery
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pressable" onClick={()=>{setDraftFilters({...mealFilters});setDraftAvoid(avoidInput);setMealModalOpen(true);setMealSuggestions([])}}
                  style={{borderRadius:'var(--radius-xl)',padding:'1.25rem',marginBottom:'12px',border:`1.5px dashed var(--color-border)`,display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'18px'}}>{MEAL_SLOTS.find(s=>s.id===activeMealSlot)?.emoji}</span>
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'500',color:'var(--color-text)'}}>Plan {MEAL_SLOTS.find(s=>s.id===activeMealSlot)?.label} for {activeDateLabel()}</div>
                    <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>AI-powered · based on your goals</div>
                  </div>
                  <i className="ti ti-arrow-right" style={{fontSize:'14px',color:'var(--color-text-muted)',marginLeft:'auto'}}/>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  function renderTracker() {
    const rc=netCals>tgt*1.1?'var(--color-red)':netCals>tgt*0.85?'var(--color-primary)':'var(--color-blue)'
    const macroProtein=profile?.protein_target||Math.round(tgt*0.3/4)
    const macroCarbs=profile?.carbs_target||Math.round(tgt*0.4/4)
    const macroFat=profile?.fat_target||Math.round(tgt*0.3/9)
    const logP=foodLog.reduce((a:number,x:any)=>a+(x.protein||0),0)
    const logC=foodLog.reduce((a:number,x:any)=>a+(x.carbs||0),0)
    const logF=foodLog.reduce((a:number,x:any)=>a+(x.fat||0),0)
    const mealCalMap: Record<string,number>={}
    const mon=new Date(); mon.setDate(mon.getDate()-mon.getDay()+1)
    for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);const dk=dateKey(d);if(meals[dk]?.macros?.calories)mealCalMap[dk]=meals[dk].macros.calories}

    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'0 1.25rem 1rem',display:'flex',flexDirection:'column',gap:'10px'}}>
        {/* Prominent summary strip */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
          {[
            {val:totalIn,   label:'Eaten',     color:'var(--color-amber)'},
            null,
            {val:totalBurned,label:'Burned',   color:'var(--color-red)'},
            null,
            {val:Math.max(tgt-netCals,0), label:'Remaining', color:rc},
          ].map((item,i)=>
            item===null
              ? <div key={i} style={{background:'var(--color-border)',alignSelf:'stretch'}}/>
              : <div key={i} style={{padding:'16px 8px',textAlign:'center' as const}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'28px',fontWeight:'600',color:item.color,lineHeight:1,letterSpacing:'-0.5px'}}>{item.val}</div>
                  <div style={{fontSize:'10px',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',marginTop:'4px',fontWeight:'600'}}>{item.label}</div>
                </div>
          )}
        </div>

        {/* Macro bars */}
        <div className="card">
          <span className="sl">Macros today</span>
          {[{l:'Protein',v:logP,t:macroProtein,c:'var(--color-primary)'},{l:'Carbs',v:logC,t:macroCarbs,c:'var(--color-blue)'},{l:'Fat',v:logF,t:macroFat,c:'var(--color-amber)'}].map(m=>{
            const w=Math.min((m.v/Math.max(m.t,1))*100,100); const over=m.v>m.t
            return (
              <div key={m.l} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                <span style={{fontSize:'11px',color:'var(--color-text-muted)',width:'44px',flexShrink:0}}>{m.l}</span>
                <div className="macro-bar-bg" style={{flex:1}}>
                  <div className="macro-bar-fill" style={{width:`${w}%`,background:over?'var(--color-red)':m.c}}/>
                </div>
                <span style={{fontSize:'11px',fontWeight:'500',color:over?'var(--color-red)':m.c,width:'64px',textAlign:'right' as const,flexShrink:0}}>{m.v}g/{m.t}g</span>
              </div>
            )
          })}
        </div>

        {/* Food log */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <div style={{fontSize:'12px',fontWeight:'600',color:'var(--color-text)',display:'flex',alignItems:'center',gap:'7px'}}>
              <i className="ti ti-notes" style={{fontSize:'14px',color:'var(--color-text-muted)'}}/>Food log
            </div>
            <button className="pressable" onClick={()=>{setLogResult(null);setLogModalOpen(true)}}
              style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontWeight:'500',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'3px'}}>
              <i className="ti ti-plus" style={{fontSize:'13px'}}/>Add food
            </button>
          </div>
          {!foodLog.length?<div style={{fontSize:'13px',color:'var(--color-text-muted)'}}>Nothing logged yet.</div>:foodLog.map((item:any)=>(
            <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`0.5px solid var(--color-border)`}}>
              <span style={{fontSize:'13px'}}>{item.name}{item.portion?` (${item.portion})`:''}</span>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'12px',fontWeight:'500',color:'var(--color-amber)'}}>{item.calories} kcal</span>
                <button className="pressable" onClick={async()=>{try{await deleteFoodLog(user.id,item.id);await loadFoodLog()}catch(e){}}}
                  style={{background:'none',border:'none',color:'var(--color-text-muted)',cursor:'pointer'}}>
                  <i className="ti ti-x" style={{fontSize:'16px'}}/>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <div style={{fontSize:'12px',fontWeight:'600',color:'var(--color-text)',display:'flex',alignItems:'center',gap:'7px'}}>
              <i className="ti ti-run" style={{fontSize:'14px',color:'var(--color-text-muted)'}}/>Activity
            </div>
            <button className="pressable" onClick={()=>setActModalOpen(true)}
              style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontWeight:'500',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'3px'}}>
              <i className="ti ti-plus" style={{fontSize:'13px'}}/>Add
            </button>
          </div>
          {!activityLog.length?<div style={{fontSize:'13px',color:'var(--color-text-muted)'}}>No activity logged.</div>:activityLog.map((item:any)=>{
            const act=ACTIVITIES.find(a=>a.value===item.type)
            return (
              <div key={item.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 0',borderBottom:`0.5px solid var(--color-border)`}}>
                <i className={`ti ${act?.icon||'ti-activity'}`} style={{fontSize:'18px',color:'var(--color-primary)',flexShrink:0}}/>
                <span style={{fontSize:'13px',flex:1}}>{item.label} · {item.duration} min</span>
                <span style={{fontSize:'12px',fontWeight:'500',color:'var(--color-red)'}}>−{item.burned} kcal</span>
                <button className="pressable" onClick={async()=>{try{await deleteActivityLog(user.id,item.id);await loadActivity()}catch(e){}}}
                  style={{background:'none',border:'none',color:'var(--color-text-muted)',cursor:'pointer'}}>
                  <i className="ti ti-x" style={{fontSize:'16px'}}/>
                </button>
              </div>
            )
          })}
        </div>

        {/* Calendar */}
        <div className="card">
          {(()=>{
            const base=new Date(); base.setDate(1); base.setMonth(base.getMonth()+calViewOffset)
            const yr=base.getFullYear(),mo=base.getMonth()
            const firstDow=new Date(yr,mo,1).getDay()
            const offset=firstDow===0?6:firstDow-1
            const daysInMo=new Date(yr,mo+1,0).getDate()
            const mLabel=base.toLocaleString('en-GB',{month:'long',year:'numeric'})
            const now2=new Date()
            const isCurrent=yr===now2.getFullYear()&&mo===now2.getMonth()
            return (
              <>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <button onClick={()=>setCalViewOffset(o=>Math.max(o-1,-2))}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'var(--color-text-muted)',padding:'2px 8px',borderRadius:'8px',lineHeight:1}}>‹</button>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em'}}>{mLabel}</div>
                  <button onClick={()=>setCalViewOffset(o=>Math.min(o+1,0))}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:isCurrent?'var(--color-border)':'var(--color-text-muted)',padding:'2px 8px',borderRadius:'8px',lineHeight:1,opacity:isCurrent?.3:1}}>›</button>
                </div>
                <div className="cal-grid" style={{marginBottom:'4px'}}>
                  {['M','T','W','T','F','S','S'].map((d,i)=><div key={i} className="cal-hdr">{d}</div>)}
                </div>
                <div className="cal-grid">
                  {Array.from({length:offset},(_,i)=><div key={`e${i}`}/>)}
                  {Array.from({length:daysInMo},(_,i)=>{
                    const day=i+1
                    const isToday=day===now2.getDate()&&isCurrent
                    const dk=`${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                    const cals=mealCalMap[dk]||0; const hasMeal=cals>0
                    const dotColor=cals>tgt*1.1?'var(--color-red)':cals>tgt*0.85?'var(--color-primary)':'var(--color-blue)'
                    return (
                      <div key={day} className={`cal-day${isToday?' today':''}`}>
                        <span className="cal-day-num">{day}</span>
                        {hasMeal&&<div className="cal-dot" style={{background:isToday?'rgba(255,255,255,.7)':dotColor}}/>}
                      </div>
                    )
                  })}
                </div>
                <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'10px',display:'flex',gap:'12px',flexWrap:'wrap' as const}}>
                  <span><span style={{display:'inline-block',width:'6px',height:'6px',borderRadius:'50%',background:'var(--color-primary)',marginRight:'4px',verticalAlign:'middle'}}/>On target</span>
                  <span><span style={{display:'inline-block',width:'6px',height:'6px',borderRadius:'50%',background:'var(--color-blue)',marginRight:'4px',verticalAlign:'middle'}}/>Under</span>
                  <span><span style={{display:'inline-block',width:'6px',height:'6px',borderRadius:'50%',background:'var(--color-red)',marginRight:'4px',verticalAlign:'middle'}}/>Over</span>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    )
  }

  function renderGrocery() {
    const groups: Record<string,any[]>={}
    grocery.forEach((item:any)=>{ if(!groups[item.section])groups[item.section]=[]; groups[item.section].push(item) })
    const selectedStoreNames = userStores.map(id=>COUNTRIES[userCountry]?.stores.find(s=>s.id===id)?.name).filter(Boolean)
    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'1rem 1.25rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontSize:'16px',fontWeight:'600',color:'var(--color-text)',display:'flex',alignItems:'center',gap:'8px'}}>
            <i className="ti ti-shopping-cart" style={{fontSize:'18px',color:'var(--color-primary)'}}/> Grocery list
          </div>
          {grocery.some((g:any)=>g.checked)&&(
            <button className="pressable" onClick={async()=>{await saveGroceryItems(user.id,activeDate,grocery.filter((g:any)=>!g.checked));await loadGrocery();setGroceryOptimized({});setGroceryTotalEstimate('')}}
              style={{fontSize:'12px',color:'var(--color-text-muted)',background:'none',border:`0.5px solid var(--color-border)`,borderRadius:'8px',padding:'4px 10px',cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'4px'}}>
              <i className="ti ti-trash" style={{fontSize:'12px'}}/>Clear done
            </button>
          )}
        </div>

        {/* Store optimize banner */}
        {grocery.length>0&&(
          <div style={{marginBottom:'12px'}}>
            {userStores.length===0 ? (
              <button onClick={()=>setStoreModalOpen(true)}
                style={{width:'100%',padding:'11px',background:'var(--color-surface-2)',border:`1px dashed var(--color-border)`,borderRadius:'var(--radius-md)',fontSize:'12px',color:'var(--color-text-muted)',cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                <i className="ti ti-map-pin" style={{fontSize:'14px'}}/>Set your country &amp; stores for smart shopping hints
              </button>
            ) : (
              <div>
                <button onClick={optimizeGrocery} disabled={groceryOptLoading}
                  style={{width:'100%',padding:'11px',background:'var(--color-primary-pale)',border:`1px solid var(--color-primary-border)`,borderRadius:'var(--radius-md)',fontSize:'13px',color:'var(--color-primary)',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:'500',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                  {groceryOptLoading
                    ? <><i className="ti ti-loader-2 ti-spin" style={{fontSize:'15px'}}/>Finding best stores...</>
                    : <><i className="ti ti-sparkles" style={{fontSize:'15px'}}/>{Object.keys(groceryOptimized).length>0?'Re-optimize':'Smart shop: '+selectedStoreNames.join(', ')}</>}
                </button>
                {groceryTotalEstimate&&<div style={{textAlign:'center' as const,fontSize:'12px',color:'var(--color-text-muted)',marginTop:'5px'}}>Estimated total: <strong>{groceryTotalEstimate}</strong></div>}
              </div>
            )}
          </div>
        )}

        {!grocery.length ? (
          <div className="empty-state">
            <img src="/images/empty-grocery.png" alt=""/>
            <div className="empty-title">Your list is empty</div>
            <div className="empty-desc">Plan a meal and tap "Add to grocery" to build your shopping list.</div>
          </div>
        ) : Object.entries(groups).map(([section,items])=>(
          <div key={section} style={{marginBottom:'1rem'}}>
            <span className="sl">{section}</span>
            {items.map((item:any)=>{
              const opt = groceryOptimized[item.name]
              const storeInfo = opt?.store ? COUNTRIES[userCountry]?.stores.find(s=>s.name===opt.store) : null
              return (
              <div key={item.id} className="pressable" onClick={()=>toggleItem(item.id,item.checked)}
                style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 13px',background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-md)',marginBottom:'6px',opacity:item.checked?.45:1,transition:'opacity .2s'}}>
                <div style={{width:'20px',height:'20px',borderRadius:'6px',border:`1.5px solid ${item.checked?'var(--color-primary)':'var(--color-border)'}`,background:item.checked?'var(--color-primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
                  {item.checked&&<i className="ti ti-check" style={{fontSize:'12px',color:'#fff'}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:'13px',textDecoration:item.checked?'line-through':'none',display:'block'}}>{item.name}</span>
                  {opt&&!item.checked&&(
                    <div style={{display:'flex',alignItems:'center',gap:'5px',marginTop:'2px'}}>
                      {storeInfo&&<span style={{fontSize:'10px',fontWeight:'600',padding:'1px 7px',borderRadius:'20px',color:'#fff',background:storeInfo.color}}>{storeInfo.name}</span>}
                      {opt.price&&<span style={{fontSize:'10px',color:'var(--color-text-muted)'}}>{opt.price}</span>}
                    </div>
                  )}
                </div>
                <span style={{fontSize:'12px',color:'var(--color-text-muted)',fontWeight:'500',flexShrink:0}}>{item.qty}</span>
              </div>
            )})}
          </div>
        ))}
      </div>
    )
  }

  function renderHealth() {
    const radius=54,stroke=8,circ=2*Math.PI*radius,dash=waterPct*circ
    const ringColor=waterPct>=1?'var(--color-cyan)':waterPct>=.6?'var(--color-blue)':'var(--color-blue)'
    const latestWeight=weightLog[weightLog.length-1]
    const prevWeight=weightLog[weightLog.length-2]
    const weightChange=latestWeight&&prevWeight?Math.round((latestWeight.value-prevWeight.value)*10)/10:null
    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'0 1.25rem 1rem',display:'flex',flexDirection:'column',gap:'10px'}}>
        {/* Streak hero */}
        <div className="anim-scale-in" style={{background:waterStreak===0?'var(--color-surface-2)':waterStreak>=7?'linear-gradient(135deg,#DC2626,#E67E22)':'linear-gradient(135deg,#E67E22,#D4833A)',borderRadius:'var(--radius-2xl)',padding:'1.25rem',textAlign:'center' as const,color:waterStreak===0?'var(--color-text-muted)':'#fff',boxShadow:waterStreak>0?'0 4px 20px rgba(230,126,34,.3)':'none'}}>
          {waterStreak>=7
            ? <img src="/images/streak-celebration.png" alt="" style={{width:'72px',height:'72px',objectFit:'contain',marginBottom:'4px'}}/>
            : <i className={`ti ti-flame${waterStreak>=1?' anim-pulse':''}`} style={{fontSize:'40px',display:'block',marginBottom:'4px'}}/>
          }
          <div style={{fontFamily:'var(--font-display)',fontSize:'48px',lineHeight:1}}>{waterStreak}</div>
          <div style={{fontSize:'13px',opacity:.8,marginTop:'4px'}}>day streak</div>
          <div style={{fontSize:'11px',opacity:.6,marginTop:'4px'}}>
            {waterStreak===0?'Hit your goal today to start!':goalReached?'Goal reached · See you tomorrow!':
              `${waterGoal>=1000?(waterGoal/1000).toFixed(1)+'L':waterGoal+'ml'} daily goal`}
          </div>
        </div>

        {/* Water ring */}
        <div className="card" style={{textAlign:'center' as const}}>
          <div style={{position:'relative',width:'130px',height:'130px',margin:'0 auto 8px'}}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke}/>
              <circle cx="65" cy="65" r={radius} fill="none" stroke={ringColor} strokeWidth={stroke}
                strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" transform="rotate(-90 65 65)"
                style={{transition:'stroke-dasharray .4s ease'}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'26px',color:'var(--color-cyan)',lineHeight:1}}>
                {waterToday>=1000?(waterToday/1000).toFixed(1)+'L':waterToday+'ml'}
              </div>
              <div style={{fontSize:'11px',color:'var(--color-text-muted)'}}>
                {goalReached?'Goal met!':`of ${waterGoal>=1000?(waterGoal/1000).toFixed(1)+'L':waterGoal+'ml'}`}
              </div>
            </div>
          </div>
          <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginBottom:'12px'}}>{Math.round(waterPct*100)}% of daily goal</div>

          {/* 5 glasses */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'7px',marginBottom:'10px'}}>
            {Array.from({length:5},(_,i)=>(
              <div key={i} className={goalReached?'':'pressable'} onClick={()=>!goalReached&&setWaterGlass(i)}
                style={{aspectRatio:'1',borderRadius:'10px',border:`1.5px solid ${i<filledGlasses?'var(--color-cyan)':'var(--color-border)'}`,background:i<filledGlasses?'var(--color-cyan-pale)':'var(--color-surface)',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'3px',cursor:goalReached?'default':'pointer'}}>
                <i className={`ti ${i<filledGlasses?'ti-droplet-filled':'ti-droplet'}`} style={{fontSize:'20px',color:i<filledGlasses?'var(--color-cyan)':'var(--color-border)'}}/>
                <span style={{fontSize:'9px',color:i<filledGlasses?'var(--color-cyan)':'var(--color-text-muted)',fontWeight:'600'}}>20%</span>
              </div>
            ))}
          </div>

          {/* Quick add */}
          <div style={{display:'flex',gap:'6px',opacity:goalReached?.4:1}}>
            {[{ml:150,label:'+150ml',sub:'espresso'},{ml:250,label:'+250ml',sub:'glass'},{ml:330,label:'+330ml',sub:'can'},{ml:500,label:'+500ml',sub:'bottle'},{ml:-250,label:'−250ml',sub:'undo'}].map(b=>(
              <button key={b.ml} onClick={()=>!goalReached&&updateWater(b.ml)} disabled={goalReached}
                style={{flex:1,padding:'7px 2px',borderRadius:'9px',border:`0.5px solid ${b.ml<0?'var(--color-border)':'var(--color-cyan-border)'}`,background:'var(--color-surface)',fontSize:'9px',fontWeight:'500',color:b.ml<0?'var(--color-text-muted)':'var(--color-cyan)',cursor:goalReached?'default':'pointer',fontFamily:'var(--font-body)',lineHeight:'1.5',textAlign:'center' as const}}>
                {b.label}<br/><span style={{fontSize:'8px',opacity:.65}}>{b.sub}</span>
              </button>
            ))}
          </div>

          {goalReached&&<div style={{marginTop:'10px',padding:'9px 12px',background:'var(--color-primary-pale)',border:`0.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-md)',fontSize:'12px',color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
            <i className="ti ti-circle-check" style={{fontSize:'15px'}}/>Goal reached · locked until tomorrow
          </div>}
        </div>

        {/* Weight tracker */}
        <div style={{fontSize:'14px',fontWeight:'600',color:'var(--color-text)',display:'flex',alignItems:'center',gap:'7px',marginTop:'4px'}}>
          <i className="ti ti-scale" style={{fontSize:'16px',color:'var(--color-primary)'}}/>Weight tracker
        </div>

        {latestWeight&&<div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:'32px',color:'var(--color-text)'}}>{latestWeight.value} <span style={{fontSize:'14px',color:'var(--color-text-muted)',fontFamily:'var(--font-body)'}}>kg</span></span>
            {weightChange!==null&&<span style={{fontSize:'12px',fontWeight:'500',padding:'4px 10px',borderRadius:'20px',background:weightChange>0?'var(--color-primary-pale)':'var(--color-red-pale)',color:weightChange>0?'var(--color-primary)':'var(--color-red)',display:'flex',alignItems:'center',gap:'3px'}}>
              <i className={`ti ${weightChange>0?'ti-arrow-up':'ti-arrow-down'}`} style={{fontSize:'12px'}}/>{Math.abs(weightChange)} kg
            </span>}
          </div>
          {weightGoal&&weightLog[0]&&<div>
            <div style={{height:'5px',background:'var(--color-surface-2)',borderRadius:'3px',overflow:'hidden',marginBottom:'4px'}}>
              <div style={{height:'100%',background:'var(--color-primary)',borderRadius:'3px',width:`${Math.min(Math.abs((latestWeight.value-weightLog[0].value)/(weightGoal-weightLog[0].value||1))*100,100)}%`,transition:'width .6s ease'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--color-text-muted)'}}>
              <span>{weightLog[0].value} kg start</span><span>{weightGoal} kg goal</span>
            </div>
          </div>}
        </div>}

        <div className="card">
          <div style={{fontSize:'12px',fontWeight:'600',color:'var(--color-text)',marginBottom:'10px'}}>Log today's weight</div>
          <div style={{display:'flex',gap:'8px'}}>
            <input type="number" step="0.1" value={weightInput} onChange={e=>setWeightInput(e.target.value)}
              placeholder={latestWeight?.value?.toString()||'75.0'}
              className="input" style={{flex:1,fontSize:'18px',fontWeight:'600',textAlign:'center' as const,marginBottom:0}}/>
            <button className="btn-primary pressable" onClick={logWeight} style={{width:'auto',padding:'10px 18px',flex:'none'}}>
              <i className="ti ti-check" style={{fontSize:'16px'}}/>Log
            </button>
          </div>
        </div>

        {weightLog.length>0&&<div className="card">
          <div style={{fontSize:'12px',fontWeight:'600',color:'var(--color-text)',marginBottom:'10px'}}>Recent entries</div>
          {[...weightLog].reverse().slice(0,7).map((entry:any,i:number,arr:any[])=>{
            const prev=arr[i+1]; const diff=prev?Math.round((entry.value-prev.value)*10)/10:null
            const d=new Date(entry.logged_date+'T12:00:00')
            return (
              <div key={entry.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:`0.5px solid var(--color-border)`}}>
                <span style={{fontSize:'12px',color:'var(--color-text-muted)'}}>{d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span>
                <span style={{fontSize:'15px',fontWeight:'600'}}>{entry.value} kg</span>
                <span style={{fontSize:'12px',fontWeight:'500',color:diff!==null?(diff>0?'var(--color-primary)':'var(--color-red)'):'var(--color-text-muted)'}}>{diff!==null?(diff>0?'+':'')+diff:'—'}</span>
                <button className="pressable" onClick={async()=>{try{await deleteWeightLog(user.id,entry.id);await loadWeight()}catch(e){}}}
                  style={{background:'none',border:'none',color:'var(--color-text-muted)',cursor:'pointer'}}>
                  <i className="ti ti-x" style={{fontSize:'16px'}}/>
                </button>
              </div>
            )
          })}
        </div>}
      </div>
    )
  }

  function renderAssist() {
    const CHIPS=[['Meal ideas','What should I eat today?'],['My macros','How are my macros looking?'],['Meal plan','Can you help me plan my meals for the week?'],['Water tips','Tips to drink more water']]

    async function clearHistory() {
      setChatHistory([])
      try {
        const { supabase } = await import('@/lib/supabase')
        await supabase.from('sage_history').upsert({ user_id: user.id, messages: [], updated_at: new Date().toISOString() })
      } catch(e) { console.error(e) }
    }

    return (
      <div key={tabKey} style={{display:'flex',flexDirection:'column',flex:1,height:'100%'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 1.25rem',borderBottom:`0.5px solid var(--color-border)`,background:'var(--color-surface)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-robot" style={{fontSize:'16px',color:'var(--color-primary)'}}/>
            </div>
            <div>
              <div style={{fontSize:'14px',fontWeight:'600',color:'var(--color-text)'}}>{COACH_NAME}</div>
              <div style={{fontSize:'11px',color:'var(--color-primary)',opacity:.7}}>Your nutrition coach</div>
            </div>
          </div>
          {chatHistory.length>0&&(
            <button onClick={clearHistory}
              style={{fontSize:'12px',color:'var(--color-text-muted)',background:'none',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-md)',padding:'5px 10px',cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'4px'}}>
              <i className="ti ti-trash" style={{fontSize:'12px'}}/>Clear
            </button>
          )}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'10px'}}>
          {!chatHistory.length&&(
            <div className="anim-fade-up" style={{alignSelf:'flex-start',maxWidth:'85%'}}>
              <div style={{background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-xl)',borderBottomLeftRadius:'4px',padding:'14px'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-primary)',marginBottom:'5px',display:'flex',alignItems:'center',gap:'5px'}}>
                  <i className="ti ti-robot" style={{fontSize:'13px'}}/>{COACH_NAME}
                </div>
                <div style={{fontSize:'13px',lineHeight:'1.6',color:'var(--color-text)'}}>
                  Hi! I'm {COACH_NAME}, your personal nutrition coach. Ask me anything about meals, macros, or your health goals.{tgt?` Your daily target is ${tgt} kcal.`:''}
                </div>
                <div className="suggest-chips">
                  {CHIPS.map(([l,q])=><div key={l} className="suggest-chip" onClick={()=>sendChat(q)}>{l}</div>)}
                </div>
              </div>
            </div>
          )}
          {chatHistory.length>4&&(
            <div style={{textAlign:'center' as const,margin:'4px 0'}}>
              <span style={{fontSize:'10px',color:'var(--color-text-muted)',background:'var(--color-surface)',padding:'3px 10px',borderRadius:'20px',border:`0.5px solid var(--color-border)`}}>
                Your conversation history · last {chatHistory.length} messages
              </span>
            </div>
          )}
          {chatHistory.map((msg:any,i:number)=>(
            <div key={i} className="anim-fade-up" style={{alignSelf:msg.role==='user'?'flex-end':'flex-start',maxWidth:'85%'}}>
              {msg.role==='assistant'&&(
                <div style={{fontSize:'10px',fontWeight:'600',color:'var(--color-primary)',marginBottom:'5px',display:'flex',alignItems:'center',gap:'4px'}}>
                  <i className="ti ti-robot" style={{fontSize:'12px'}}/>{COACH_NAME}
                </div>
              )}
              <div style={{padding:'11px 14px',borderRadius:'var(--radius-xl)',fontSize:'13px',lineHeight:'1.6',background:msg.role==='user'?'var(--color-primary)':'var(--color-surface)',color:msg.role==='user'?'#fff':'var(--color-text)',border:msg.role==='user'?'none':`0.5px solid var(--color-border)`,borderBottomRightRadius:msg.role==='user'?'4px':'var(--radius-xl)',borderBottomLeftRadius:msg.role==='user'?'var(--radius-xl)':'4px'}}>
                {msg.content}
                {msg.role==='assistant'&&i===chatHistory.length-1&&(
                  <div className="suggest-chips">
                    {CHIPS.slice(0,3).map(([l,q])=><div key={l} className="suggest-chip" onClick={()=>sendChat(q)}>{l}</div>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading&&(
            <div className="anim-fade-up" style={{alignSelf:'flex-start'}}>
              <div style={{fontSize:'10px',fontWeight:'600',color:'var(--color-primary)',marginBottom:'5px',display:'flex',alignItems:'center',gap:'4px'}}>
                <i className="ti ti-robot" style={{fontSize:'12px'}}/>{COACH_NAME}
              </div>
              <div style={{background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-xl)',borderBottomLeftRadius:'4px',padding:'14px'}}>
                <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>
        <div style={{padding:'.75rem 1.25rem 1rem',borderTop:`0.5px solid var(--color-border)`,display:'flex',gap:'8px',background:'var(--color-surface)'}}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
            placeholder={`Ask ${COACH_NAME}...`} className="input" style={{flex:1,borderRadius:'50px',marginBottom:0}}/>
          <button className="pressable" onClick={()=>sendChat()} disabled={chatLoading}
            style={{width:'40px',height:'40px',borderRadius:'50%',background:chatLoading?'var(--color-border)':'var(--color-primary)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="ti ti-send" style={{fontSize:'17px'}}/>
          </button>
        </div>
      </div>
    )
  }

  async function saveCountryStores(country:string, stores:string[]) {
    try {
      const u=await saveProfile(user.id,{...profile,country,preferred_stores:stores})
      onProfileUpdate(u); setUserCountry(country); setUserStores(stores); setStoreModalOpen(false)
    } catch(e){console.error(e)}
  }

  async function optimizeGrocery() {
    if(!grocery.length||!userStores.length) return
    setGroceryOptLoading(true)
    try {
      const storeNames=userStores.map(id=>COUNTRIES[userCountry]?.stores.find(s=>s.id===id)?.name).filter(Boolean)
      const res=await fetch('/api/grocery',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({items:grocery,country:userCountry,stores:storeNames})})
      const data=await res.json()
      if(data.items?.length) {
        const map:Record<string,{store:string,price:string}>={}
        data.items.forEach((i:any)=>{ map[i.name]={store:i.store||'',price:i.estimatedPrice||''} })
        setGroceryOptimized(map)
        setGroceryTotalEstimate(data.totalEstimate||'')
      }
    } catch(e){console.error(e)}
    setGroceryOptLoading(false)
  }

  function renderProfile() {
    if (profileSubPage==='account') return renderAccountSettings()
    if (profileSubPage==='settings') return renderAppSettings()
    if (profileSubPage==='tdee') return renderTDEEPage()
    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'0 1.25rem 1rem'}}>
        {/* Hero */}
        <div style={{textAlign:'center' as const,marginBottom:'1.75rem',paddingTop:'1rem'}}>
          <div className="pressable" onClick={()=>setEditModalOpen('avatar')}
            style={{width:'88px',height:'88px',borderRadius:'50%',background:'var(--color-primary-pale)',border:`2px solid var(--color-primary-border)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'40px',margin:'0 auto 12px',cursor:'pointer',position:'relative' as const,overflow:'hidden'}}>
            {(avatarUrl||profile?.avatar_url)
              ? <img src={avatarUrl||profile?.avatar_url} alt="Avatar" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
              : <span>{profile?.avatar||avatar}</span>
            }
            <div style={{position:'absolute' as const,bottom:0,right:0,width:'26px',height:'26px',borderRadius:'50%',background:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid var(--color-surface)`}}>
              <i className="ti ti-camera" style={{fontSize:'12px',color:'#fff'}}/>
            </div>
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'24px',color:'var(--color-text)'}}>{profile?.username||displayName}</div>
          {profile?.tdee&&<div style={{marginTop:'8px',display:'inline-flex',alignItems:'center',gap:'5px',background:'var(--color-primary-pale)',color:'var(--color-primary)',padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:'500'}}>
            <i className="ti ti-target" style={{fontSize:'12px'}}/>{tgt} kcal daily target
          </div>}
        </div>

        {/* Account */}
        <div style={{marginBottom:'1.25rem'}}>
          <span className="sl">Account</span>
          <div className="menu-row" onClick={()=>setProfileSubPage('account')}>
            <div className="menu-icon-wrap" style={{background:'var(--color-primary-pale)'}}>
              <i className="ti ti-user-circle" style={{fontSize:'20px',color:'var(--color-primary)'}}/>
            </div>
            <div className="menu-row-text">
              <div className="menu-row-title">Account settings</div>
              <div className="menu-row-sub">Email, username, phone, password</div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        {/* Nutrition */}
        <div style={{marginBottom:'1.25rem'}}>
          <span className="sl">Nutrition</span>
          <div className="menu-row" onClick={()=>setProfileSubPage('tdee')}>
            <div className="menu-icon-wrap" style={{background:'var(--color-primary-pale)'}}>
              <i className="ti ti-calculator" style={{fontSize:'20px',color:'var(--color-primary)'}}/>
            </div>
            <div className="menu-row-text">
              <div className="menu-row-title">Calorie target</div>
              <div className="menu-row-sub">{profile?.tdee?`${Math.max(1200,(profile.tdee+(GOAL_ADJ[profile?.goal]||0)))} kcal · tap to recalculate`:'Not set — tap to calculate'}</div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        {/* Diet & goals */}
        {[
          {label:'Diet & allergies',key:'diet',icon:'ti-leaf',rows:[{k:'Diet',v:profile.diet?.join(', ')||'None'},{k:'Allergies',v:profile.allergies?.join(', ')||'None'}]},
          {label:'Goals & budget',key:'goals',icon:'ti-target',rows:[{k:'Eating goal',v:profile.goal?GL[profile.goal]:'Not set'},{k:'Weekly budget',v:`€${profile.budget}`}]},
        ].map(section=>(
          <div key={section.key} style={{marginBottom:'1.25rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <span className="sl" style={{margin:0}}>{section.label}</span>
              <button className="pressable" onClick={()=>{setEditProfile({...profile});setEditModalOpen(section.key)}}
                style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontWeight:'500',fontFamily:'var(--font-body)'}}>Edit</button>
            </div>
            {section.rows.map(row=>(
              <div key={row.k} className="card card-sm" style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                <span style={{fontSize:'13px',color:'var(--color-text-muted)'}}>{row.k}</span>
                <span style={{fontSize:'13px',fontWeight:'500',color:'var(--color-primary)'}}>{row.v}</span>
              </div>
            ))}
          </div>
        ))}

        {/* App */}
        <div style={{marginBottom:'1.25rem'}}>
          <span className="sl">App</span>
          <div className="menu-row" onClick={()=>setProfileSubPage('settings')}>
            <div className="menu-icon-wrap" style={{background:'var(--color-surface-2)'}}>
              <i className="ti ti-settings" style={{fontSize:'20px',color:'var(--color-text-muted)'}}/>
            </div>
            <div className="menu-row-text">
              <div className="menu-row-title">Settings</div>
              <div className="menu-row-sub">Theme, notifications</div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        {/* About */}
        <div style={{marginBottom:'1.5rem'}}>
          <span className="sl">About</span>
          <div className="card card-sm" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
            <span style={{fontSize:'13px',fontWeight:'500'}}>App version</span>
        <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'8px',marginTop:'1.25rem'}}>Shopping</div>
        <div className="card pressable" onClick={()=>setStoreModalOpen(true)}
          style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',cursor:'pointer',marginBottom:'8px'}}>
          <div>
            <div style={{fontSize:'14px',fontWeight:'500',color:'var(--color-text)'}}>Country &amp; stores</div>
            <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'2px'}}>
              {COUNTRIES[userCountry]?.flag} {COUNTRIES[userCountry]?.name} · {userStores.length?`${userStores.length} store${userStores.length>1?'s':''} selected`:'No stores selected yet'}
            </div>
          </div>
          <i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>
        </div>

            <span style={{fontSize:'12px',background:'var(--color-primary-pale)',color:'var(--color-primary)',padding:'3px 10px',borderRadius:'20px',fontWeight:'500'}}>v1.0 beta</span>
          </div>
          <div className="card card-sm" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'13px',fontWeight:'500'}}>Privacy policy</span>
            <i className="ti ti-arrow-right" style={{fontSize:'14px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        <button className="pressable" onClick={()=>supabase.auth.signOut()}
          style={{width:'100%',padding:'13px',background:'var(--color-red)',color:'#fff',border:'none',borderRadius:'var(--radius-md)',fontSize:'15px',fontWeight:'600',cursor:'pointer',fontFamily:'var(--font-body)'}}>
          Sign out
        </button>
      </div>
    )
  }

  function renderAccountSettings() {
    return (
      <div key="acct" className="anim-fade-up" style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div className="subpage-header">
          <button className="subpage-back" onClick={()=>setProfileSubPage(null)}>
            <i className="ti ti-chevron-left" style={{fontSize:'20px'}}/>Back
          </button>
          <div className="subpage-title">Account settings</div>
          <div/>
        </div>
        <div style={{padding:'1.25rem',overflowY:'auto',flex:1}}>
          {[
            {icon:'ti-mail',label:'Email',val:user.email,sub:'Contact support to change',action:''},
            {icon:'ti-at',label:'Username',val:profile?.username||displayName,sub:'Your display name',action:'account-username'},
            {icon:'ti-phone',label:'Phone',val:profile?.phone||'Not set',sub:'Optional contact number',action:'account-phone'},
            {icon:'ti-lock',label:'Password',val:'••••••••',sub:'Change your password',action:'password'},
          ].map(row=>(
            <div key={row.label} className="menu-row" onClick={()=>row.action&&setEditModalOpen(row.action)}>
              <div className="menu-icon-wrap" style={{background:'var(--color-primary-pale)'}}>
                <i className={`ti ${row.icon}`} style={{fontSize:'18px',color:'var(--color-primary)'}}/>
              </div>
              <div className="menu-row-text">
                <div className="menu-row-title">{row.label}</div>
                <div className="menu-row-sub">{row.val}</div>
              </div>
              {row.action&&<i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderAppSettings() {
    return (
      <div key="settings" className="anim-fade-up" style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div className="subpage-header">
          <button className="subpage-back" onClick={()=>setProfileSubPage(null)}>
            <i className="ti ti-chevron-left" style={{fontSize:'20px'}}/>Back
          </button>
          <div className="subpage-title">Settings</div>
          <div/>
        </div>
        <div style={{padding:'1.25rem',overflowY:'auto',flex:1}}>
          <span className="sl">Appearance</span>
          <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <div>
              <div style={{fontSize:'13px',fontWeight:'500'}}>Dark theme</div>
              <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>Switch between light and dark mode</div>
            </div>
            <ToggleSwitch value={theme==='dark'} onChange={()=>toggleTheme()}/>
          </div>
          <span className="sl">Notifications</span>
          <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
            <div>
              <div style={{fontSize:'13px',fontWeight:'500'}}>Daily reminders</div>
              <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>Coming soon</div>
            </div>
            <ToggleSwitch value={false} onChange={()=>{}}/>
          </div>
          <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:'13px',fontWeight:'500'}}>Water reminders</div>
              <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>Coming soon</div>
            </div>
            <ToggleSwitch value={false} onChange={()=>{}}/>
          </div>
        </div>
      </div>
    )
  }

  function renderTDEEPage() {
    return (
      <div key="tdee" className="anim-fade-up" style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div className="subpage-header">
          <button className="subpage-back" onClick={()=>setProfileSubPage(null)}>
            <i className="ti ti-chevron-left" style={{fontSize:'20px'}}/>Back
          </button>
          <div className="subpage-title">Calorie target</div>
          <div/>
        </div>
        <div style={{padding:'1.25rem',overflowY:'auto',flex:1}}>
          <TDEEForm
            goal={profile?.goal} currentTdee={profile?.tdee} savedStats={profile?.body_stats}
            onComplete={async(targets:any)=>{
              try {
                const u=await saveProfile(user.id,{...profile,tdee:targets.tdee,protein_target:targets.protein,carbs_target:targets.carbs,fat_target:targets.fat,body_stats:targets.stats})
                onProfileUpdate(u); setProfileSubPage(null)
              } catch(e){console.error(e)}
            }}
            onCancel={()=>setProfileSubPage(null)}
          />
        </div>
      </div>
    )
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────

  return (
    <div className="app-shell">

      {/* Safe area top */}
      <div style={{height:'env(safe-area-inset-top,12px)',minHeight:'12px',flexShrink:0}}/>

      {/* Week calendar — meals and grocery tabs */}
      {['meals','grocery'].includes(tab)&&(()=>{
        // Find Monday of the week containing activeDate
        const ad = new Date(activeDate+'T12:00:00')
        const dow = ad.getDay() // 0=Sun
        const monday = new Date(ad)
        monday.setDate(ad.getDate() - (dow===0?6:dow-1))

        const monthLabel = monday.toLocaleDateString('en-GB',{month:'long',year:'numeric'})
        const days = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d })

        function prevWeek() {
          const d=new Date(activeDate+'T12:00:00'); d.setDate(d.getDate()-7)
          const today=new Date(); today.setHours(0,0,0,0)
          if(d>=today) setActiveDate(dateKey(d))
          else setActiveDate(todayKey())
        }
        function nextWeek() {
          const d=new Date(activeDate+'T12:00:00'); d.setDate(d.getDate()+7)
          const max=new Date(); max.setDate(max.getDate()+30)
          if(d<=max) setActiveDate(dateKey(d))
        }
        const today=todayKey()
        const canGoPrev = activeDate > today
        const maxDate = dateKey(new Date(Date.now()+30*86400000))
        const canGoNext = days[6] && dateKey(days[6]) < maxDate

        return (
          <div className="date-strip">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
              <span className="date-strip-month">{monthLabel}</span>
              <div style={{display:'flex',gap:'4px'}}>
                <button onClick={prevWeek} disabled={!canGoPrev}
                  style={{width:'26px',height:'26px',border:`0.5px solid var(--border)`,borderRadius:'8px',background:'var(--surface-2)',cursor:canGoPrev?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',opacity:canGoPrev?1:.3,fontSize:'14px',color:'var(--text-2)'}}>
                  ‹
                </button>
                <button onClick={nextWeek} disabled={!canGoNext}
                  style={{width:'26px',height:'26px',border:`0.5px solid var(--border)`,borderRadius:'8px',background:'var(--surface-2)',cursor:canGoNext?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',opacity:canGoNext?1:.3,fontSize:'14px',color:'var(--text-2)'}}>
                  ›
                </button>
              </div>
            </div>
            <div className="date-strip-row">
              {days.map((d,i)=>{
                const dk=dateKey(d)
                const isActive=dk===activeDate
                const isToday=dk===today
                const hasMeal=!!meals[dk]
                const dayNames=['Su','Mo','Tu','We','Th','Fr','Sa']
                return (
                  <div key={dk} className={`day-pill pressable ${isActive?'active':''} ${hasMeal?'has-meal':''}`}
                    onClick={()=>setActiveDate(dk)}>
                    <span className="day-name">{isToday?'Today':dayNames[d.getDay()]}</span>
                    <span className="day-num">{d.getDate()}</span>
                    <span className="day-dot"/>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Content — scrollable */}
      <div style={{flex:1,overflowY:tab==='assist'?'hidden':'auto',display:'flex',flexDirection:'column',WebkitOverflowScrolling:'touch' as any}}>
        {tab==='home'    && renderHome()}
        {tab==='meals'   && renderMeals()}
        {tab==='grocery' && renderGrocery()}
        {tab==='tracker' && renderTracker()}
        {tab==='health'  && renderHealth()}
        {tab==='assist'  && renderAssist()}
        {tab==='profile' && renderProfile()}
      </div>

      {/* Bottom nav — hidden on profile sub-pages */}
      {!(tab==='profile'&&profileSubPage)&&(
        <nav className="bottom-nav">
          {TABS.map(t=>{
            const isActive=tab===t
            return (
              <button key={t} className={`nav-btn ${isActive?'active':''}`} onClick={()=>switchTab(t)}>
                <i className={`ti ${TAB_ICONS[t]}`} style={{fontSize:'24px',color:isActive?'var(--primary)':'var(--text-3)',display:'block',lineHeight:1}}/>
                <span className="nav-label">{TAB_LABELS[t]}</span>
              </button>
            )
          })}
        </nav>
      )}

      {/* ── MEAL MODAL ── */}
      <Modal open={mealModalOpen} onClose={()=>setMealModalOpen(false)} title="Suggest a meal" subtitle={`for ${activeDateLabel()}${profile?.goal?' · '+GL[profile.goal]:''}`}>

        {/* Servings + days — always same height, hint always visible */}
        <div style={{background:'var(--surface-2)',borderRadius:'var(--radius-md)',padding:'12px',marginBottom:'1.25rem'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'8px'}}>
            <div>
              <div className="sl" style={{marginBottom:'8px'}}>Persons</div>
              <div className="stepper">
                <button className="stepper-btn" onClick={()=>setServings(s=>Math.max(1,s-1))}>−</button>
                <span className="stepper-val">{servings}</span>
                <button className="stepper-btn" onClick={()=>setServings(s=>Math.min(12,s+1))}>+</button>
              </div>
            </div>
            <div>
              <div className="sl" style={{marginBottom:'8px'}}>Days in a row</div>
              <div className="stepper">
                <button className="stepper-btn" onClick={()=>setMealDays(d=>Math.max(1,d-1))}>−</button>
                <span className="stepper-val">{mealDays}</span>
                <button className="stepper-btn" onClick={()=>setMealDays(d=>Math.min(7,d+1))}>+</button>
              </div>
            </div>
          </div>
          {/* Fixed-height hint — always rendered, just invisible when default */}
          <div style={{fontSize:'11px',color:'var(--text-2)',textAlign:'center' as const,height:'16px',visibility:(servings>1||mealDays>1)?'visible':'hidden'}}>
            Scaled for {servings} {servings===1?'person':'people'}{mealDays>1?` · ${mealDays} days in a row`:''}
          </div>
        </div>

        {/* Filters — clean dropdowns */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
          {/* Cuisine */}
          <div>
            <div className="sl" style={{marginBottom:'5px'}}>Cuisine</div>
            <div style={{position:'relative' as const}}>
              <select value={draftFilters.cuisine||''} onChange={e=>setDraftFilters(f=>({...f,cuisine:e.target.value||null}))}
                style={{width:'100%',padding:'8px 28px 8px 10px',borderRadius:'var(--radius-md)',border:`0.5px solid ${draftFilters.cuisine?'var(--primary)':'var(--border)'}`,background:draftFilters.cuisine?'var(--primary-pale)':'var(--surface)',color:draftFilters.cuisine?'var(--primary)':'var(--text)',fontSize:'12px',fontFamily:'var(--font-body)',outline:'none',appearance:'none' as const,cursor:'pointer'}}>
                <option value="">Any</option>
                {CUISINES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <i className="ti ti-chevron-down" style={{position:'absolute' as const,right:'8px',top:'50%',transform:'translateY(-50%)',fontSize:'12px',color:'var(--text-3)',pointerEvents:'none' as const}}/>
            </div>
          </div>
          {/* Time */}
          <div>
            <div className="sl" style={{marginBottom:'5px'}}>Time</div>
            <div style={{position:'relative' as const}}>
              <select value={draftFilters.time||''} onChange={e=>setDraftFilters(f=>({...f,time:e.target.value||null}))}
                style={{width:'100%',padding:'8px 28px 8px 10px',borderRadius:'var(--radius-md)',border:`0.5px solid ${draftFilters.time?'var(--blue)':'var(--border)'}`,background:draftFilters.time?'var(--blue-bg)':'var(--surface)',color:draftFilters.time?'var(--blue)':'var(--text)',fontSize:'12px',fontFamily:'var(--font-body)',outline:'none',appearance:'none' as const,cursor:'pointer'}}>
                <option value="">Any</option>
                <option value="quick">Quick &lt;30 min</option>
                <option value="medium">Medium 30–60 min</option>
                <option value="weekend">Weekend 60+ min</option>
              </select>
              <i className="ti ti-chevron-down" style={{position:'absolute' as const,right:'8px',top:'50%',transform:'translateY(-50%)',fontSize:'12px',color:'var(--text-3)',pointerEvents:'none' as const}}/>
            </div>
          </div>
          {/* Difficulty */}
          <div>
            <div className="sl" style={{marginBottom:'5px'}}>Difficulty</div>
            <div style={{position:'relative' as const}}>
              <select value={draftFilters.diff||''} onChange={e=>setDraftFilters(f=>({...f,diff:e.target.value||null}))}
                style={{width:'100%',padding:'8px 28px 8px 10px',borderRadius:'var(--radius-md)',border:`0.5px solid ${draftFilters.diff?'var(--amber)':'var(--border)'}`,background:draftFilters.diff?'var(--amber-bg)':'var(--surface)',color:draftFilters.diff?'var(--amber)':'var(--text)',fontSize:'12px',fontFamily:'var(--font-body)',outline:'none',appearance:'none' as const,cursor:'pointer'}}>
                <option value="">Any</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
              <i className="ti ti-chevron-down" style={{position:'absolute' as const,right:'8px',top:'50%',transform:'translateY(-50%)',fontSize:'12px',color:'var(--text-3)',pointerEvents:'none' as const}}/>
            </div>
          </div>
        </div>

        <input value={draftAvoid} onChange={e=>setDraftAvoid(e.target.value)} placeholder="Anything to avoid? (optional)" className="input"/>

        {/* Suggestions */}
        {mealSuggestions.map((meal:any,i:number)=>(
          <div key={i} className="recipe-card anim-scale-in" style={{marginBottom:'10px',position:'relative' as const}}>
            {/* Image header using Unsplash */}
            <div className="recipe-card-img" style={{background:'var(--primary-pale)',overflow:'hidden',padding:0,height:'120px'}}>
              <MealImage name={meal.name} emoji={meal.emoji} size={400}/>
              {meal.cuisine&&<span style={{position:'absolute' as const,top:'8px',left:'10px',background:'rgba(0,0,0,.5)',borderRadius:'20px',padding:'3px 9px',fontSize:'10px',fontWeight:'500',color:'#fff'}}>
                {CUISINES.find(c=>c.value===meal.cuisine)?.flag} {meal.cuisine}
              </span>}
              {/* Favourite button */}
              <button className="pressable" onClick={async(e)=>{e.stopPropagation();await handleSaveRecipe(meal)}}
                style={{position:'absolute' as const,top:'8px',right:'10px',background:'rgba(0,0,0,.45)',border:'none',borderRadius:'50%',width:'30px',height:'30px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-heart" style={{fontSize:'15px',color:'#fff'}}/>
              </button>
            </div>
            <div className="recipe-card-body">
              <div className="recipe-card-name">{meal.name}</div>
              <div className="recipe-card-desc">{meal.desc}</div>
              {/* Community rating + user's own rating */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                {mealRatings[meal.name]
                  ? <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                      <StarRating value={Math.round(mealRatings[meal.name].avg)} size={13} readonly/>
                      <span style={{fontSize:'11px',color:'var(--color-text-muted)'}}>{mealRatings[meal.name].avg} ({mealRatings[meal.name].count})</span>
                    </div>
                  : <div style={{fontSize:'11px',color:'var(--color-text-muted)'}}>No ratings yet</div>
                }
                {/* Inline rating — user rates directly on card */}
                <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                  <span style={{fontSize:'10px',color:'var(--color-text-muted)'}}>Rate:</span>
                  <StarRating value={myRatings[meal.name]||0} size={14} onChange={r=>submitRating(meal.name,r)}/>
                </div>
              </div>
              <div style={{display:'flex',gap:'5px',marginBottom:'9px',flexWrap:'wrap' as const}}>
                {meal.timeTag&&<span className="tag tag-slate"><i className="ti ti-clock" style={{fontSize:'10px',marginRight:'3px'}}/>{meal.timeTag}</span>}
                {meal.diffTag&&<span className="tag tag-slate">{meal.diffTag}</span>}
                {meal.macros&&<span className="tag tag-slate">{meal.macros.calories} kcal</span>}
                {meal.macros&&<span className="tag tag-green">{meal.macros.protein}g protein</span>}
              </div>
              <button className="btn-primary pressable" onClick={()=>selectMeal(meal)}>
                <i className="ti ti-calendar-plus" style={{fontSize:'15px'}}/>Add to {activeDateLabel()}
              </button>
            </div>
          </div>
        ))}

        <button className="btn-primary pressable" onClick={getSuggestions} disabled={suggestLoading} style={{marginTop:mealSuggestions.length?'4px':'0'}}>
          {suggestLoading
            ? <><i className="ti ti-loader-2 ti-spin" style={{fontSize:'16px'}}/>Thinking...</>
            : <><i className="ti ti-sparkles" style={{fontSize:'16px'}}/>{mealSuggestions.length?'Suggest again':'Suggest meals'}</>
          }
        </button>
        {/* Cancel — does NOT commit draft filters */}
        <button className="btn-ghost" onClick={()=>{ setMealModalOpen(false); setMealSuggestions([]) }} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── PHOTO LOG MODAL ── */}
      <Modal open={photoLogOpen} onClose={()=>setPhotoLogOpen(false)} title="Log food by photo" subtitle="Take a photo or upload one — Sage will identify it and estimate macros.">
        <PhotoFoodLogger onPhoto={analysePhoto} loading={photoLoading}/>
        {photoLoading&&(
          <div style={{textAlign:'center' as const,padding:'1.5rem 0',color:'var(--color-text-muted)'}}>
            <i className="ti ti-loader-2 ti-spin" style={{fontSize:'32px',color:'var(--color-primary)',display:'block',marginBottom:'10px'}}/>
            <div style={{fontSize:'14px',fontWeight:'500'}}>Analysing your food...</div>
            <div style={{fontSize:'12px',marginTop:'4px'}}>Sage is identifying the ingredients</div>
          </div>
        )}
        {photoError&&(
          <div style={{background:'var(--color-red-pale)',border:`0.5px solid var(--color-red-border)`,borderRadius:'var(--radius-md)',padding:'12px',marginBottom:'1rem',fontSize:'13px',color:'var(--color-red)',display:'flex',gap:'8px',alignItems:'flex-start'}}>
            <i className="ti ti-alert-circle" style={{fontSize:'16px',flexShrink:0,marginTop:'1px'}}/>
            <div>{photoError}<br/><span style={{fontSize:'12px',opacity:.8}}>Try a clearer photo, better lighting, or use the text search instead.</span></div>
          </div>
        )}
        {photoResult&&!photoLoading&&(
          <div className="anim-scale-in" style={{background:'var(--color-primary-pale)',border:`0.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-lg)',padding:'16px',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:'600',color:'var(--color-text)'}}>{photoResult.name}</div>
                <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'2px'}}>{photoResult.portion}</div>
              </div>
              <div style={{fontSize:'10px',padding:'3px 8px',borderRadius:'20px',fontWeight:'600',
                background:photoResult.confidence==='high'?'var(--color-primary-pale)':photoResult.confidence==='medium'?'var(--color-amber-pale)':'var(--color-red-pale)',
                color:photoResult.confidence==='high'?'var(--color-primary)':photoResult.confidence==='medium'?'var(--color-amber)':'var(--color-red)'}}>
                {photoResult.confidence} confidence
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'10px'}}>
              {[{l:'Calories',v:`${photoResult.calories}`,u:'kcal',c:'var(--color-amber)'},{l:'Protein',v:`${photoResult.protein}`,u:'g',c:'var(--color-primary)'},{l:'Carbs',v:`${photoResult.carbs}`,u:'g',c:'var(--color-blue)'},{l:'Fat',v:`${photoResult.fat}`,u:'g',c:'var(--color-amber)'}].map(m=>(
                <div key={m.l} style={{background:'var(--color-surface)',borderRadius:'var(--radius-md)',padding:'8px 4px',textAlign:'center' as const}}>
                  <div style={{fontSize:'15px',fontWeight:'700',color:m.c,lineHeight:1}}>{m.v}<span style={{fontSize:'10px',fontWeight:'400',color:'var(--color-text-muted)'}}>{m.u}</span></div>
                  <div style={{fontSize:'9px',color:'var(--color-text-muted)',marginTop:'3px',textTransform:'uppercase' as const}}>{m.l}</div>
                </div>
              ))}
            </div>
            {photoResult.notes&&(
              <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginBottom:'10px',fontStyle:'italic'}}>{photoResult.notes}</div>
            )}
            <button className="btn-primary pressable" onClick={addPhotoFood}>
              <i className="ti ti-plus" style={{fontSize:'15px'}}/>Add to food log
            </button>
            <div style={{marginTop:'10px',fontSize:'12px',color:'var(--color-text-muted)',textAlign:'center' as const}}>
              AI estimates may not be exact — adjust portions in the food log if needed.
            </div>
          </div>
        )}
        <button className="btn-ghost" onClick={()=>setPhotoLogOpen(false)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── BARCODE SCANNER MODAL ── */}
      <Modal open={scannerOpen} onClose={()=>setScannerOpen(false)} title="Scan barcode" subtitle="Enter the barcode number from the product packaging.">
        <BarcodeScanner onResult={lookupBarcode} />
        {scanError&&(
          <div style={{background:'var(--color-red-pale)',border:`0.5px solid var(--color-red-border)`,borderRadius:'var(--radius-md)',padding:'10px 13px',marginBottom:'1rem',fontSize:'13px',color:'var(--color-red)',display:'flex',alignItems:'center',gap:'8px'}}>
            <i className="ti ti-alert-circle" style={{fontSize:'16px'}}/>
            {scanError}
          </div>
        )}
        {scanResult&&(
          <div className="anim-scale-in" style={{background:'var(--color-primary-pale)',border:`0.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-lg)',padding:'16px',marginBottom:'1rem'}}>
            {/* Product header */}
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px',gap:'10px'}}>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:'600',color:'var(--color-text)',marginBottom:'2px'}}>{scanResult.name}</div>
                <div style={{fontSize:'12px',color:'var(--color-text-muted)'}}>Per {scanResult.portion}</div>
              </div>
              {scanResult.nutriscore&&(
                <div style={{width:'32px',height:'32px',borderRadius:'8px',background:{'A':'#038141','B':'#85BB2F','C':'#FFCD00','D':'#EE8100','E':'#E63312'}[scanResult.nutriscore]||'var(--color-border)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',fontSize:'16px',color:'#fff',flexShrink:0}}>
                  {scanResult.nutriscore}
                </div>
              )}
            </div>

            {/* Main macros */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'10px'}}>
              {[
                {l:'Calories',v:`${scanResult.calories}`,unit:'kcal',c:'var(--color-amber)'},
                {l:'Protein', v:`${scanResult.protein}`,unit:'g',   c:'var(--color-primary)'},
                {l:'Carbs',   v:`${scanResult.carbs}`,  unit:'g',   c:'var(--color-blue)'},
                {l:'Fat',     v:`${scanResult.fat}`,    unit:'g',   c:'var(--color-amber)'},
              ].map(m=>(
                <div key={m.l} style={{background:'var(--color-surface)',borderRadius:'var(--radius-md)',padding:'8px 4px',textAlign:'center' as const}}>
                  <div style={{fontSize:'15px',fontWeight:'700',color:m.c,lineHeight:1}}>{m.v}<span style={{fontSize:'10px',fontWeight:'400',color:'var(--color-text-muted)'}}>{m.unit}</span></div>
                  <div style={{fontSize:'9px',color:'var(--color-text-muted)',marginTop:'3px',textTransform:'uppercase' as const,letterSpacing:'.04em'}}>{m.l}</div>
                </div>
              ))}
            </div>

            {/* Extra nutrition details */}
            {(scanResult.sugar!==null||scanResult.fiber!==null||scanResult.saturatedFat!==null||scanResult.salt!==null)&&(
              <div style={{borderTop:`0.5px solid var(--color-primary-border)`,paddingTop:'10px',marginBottom:'12px'}}>
                <div style={{fontSize:'10px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:'6px'}}>More details</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px'}}>
                  {[
                    {l:'of which sugars',  v:scanResult.sugar,        show:scanResult.sugar!==null},
                    {l:'Saturated fat',    v:scanResult.saturatedFat, show:scanResult.saturatedFat!==null},
                    {l:'Fiber',            v:scanResult.fiber,        show:scanResult.fiber!==null},
                    {l:'Salt',             v:scanResult.salt,         show:scanResult.salt!==null},
                  ].filter(r=>r.show).map(r=>(
                    <div key={r.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:`0.5px solid var(--color-primary-border)`}}>
                      <span style={{fontSize:'11px',color:'var(--color-text-muted)'}}>{r.l}</span>
                      <span style={{fontSize:'12px',fontWeight:'500',color:'var(--color-text)'}}>{r.v}g</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-primary pressable" onClick={addScannedFood}>
              <i className="ti ti-plus" style={{fontSize:'15px'}}/>Add to food log
            </button>
            {/* Fallback */}
            <div style={{marginTop:'12px',padding:'10px 12px',background:'var(--color-surface)',borderRadius:'var(--radius-md)',border:`0.5px solid var(--color-border)`}}>
              <div style={{fontSize:'12px',fontWeight:'500',color:'var(--color-text)',marginBottom:'4px'}}>Not what you were looking for?</div>
              <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginBottom:'8px'}}>Barcode lookup isn't always 100% accurate. You can search by product name instead:</div>
              <button onClick={()=>{setScannerOpen(false);setLogModalOpen(true)}}
                style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:'500',display:'flex',alignItems:'center',gap:'4px',padding:0}}>
                <i className="ti ti-search" style={{fontSize:'13px'}}/>Search by name instead →
              </button>
            </div>
          </div>
        )}
        <button className="btn-ghost" onClick={()=>setScannerOpen(false)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── FOOD LOG MODAL ── */}
      <Modal open={logModalOpen} onClose={()=>setLogModalOpen(false)} title="Log food" subtitle="Search by name — Sage will look up the nutrition.">
        {/* Quick-log grid */}
        <div className="quick-log-grid" style={{marginBottom:'1.25rem',gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
          <div className="quick-log-btn pressable" onClick={()=>{setScanResult(null);setScanError('');setScannerOpen(true)}}>
            <div className="quick-log-icon" style={{background:'var(--color-primary-pale)'}}>
              <i className="ti ti-barcode" style={{fontSize:'18px',color:'var(--color-primary)'}}/>
            </div>
            <span className="quick-log-title">Scan</span>
            <span className="quick-log-sub">Barcode</span>
          </div>
          <div className="quick-log-btn pressable" onClick={()=>{setPhotoResult(null);setPhotoError('');setPhotoLogOpen(true);setLogModalOpen(false)}}>
            <div className="quick-log-icon" style={{background:'#1a2a3a'}}>
              <i className="ti ti-camera" style={{fontSize:'18px',color:'#3b82f6'}}/>
            </div>
            <span className="quick-log-title">Photo</span>
            <span className="quick-log-sub">Snap food</span>
          </div>
          <div className="quick-log-btn pressable" onClick={()=>{setLogModalOpen(false);switchTab('assist')}}>
            <div className="quick-log-icon" style={{background:'var(--color-surface-2)'}}>
              <i className="ti ti-robot" style={{fontSize:'18px',color:'var(--color-text-muted)'}}/>
            </div>
            <span className="quick-log-title">Ask Sage</span>
            <span className="quick-log-sub">Estimate</span>
          </div>
          <div className="quick-log-btn pressable" onClick={()=>{ const el=document.querySelector('.food-name-input') as HTMLInputElement; el?.focus() }}>
            <div className="quick-log-icon" style={{background:'var(--color-surface-2)'}}>
              <i className="ti ti-search" style={{fontSize:'18px',color:'var(--color-text-muted)'}}/>
            </div>
            <span className="quick-log-title">Search</span>
            <span className="quick-log-sub">By name</span>
          </div>
        </div>

        <SL>Meal time</SL>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
          {[['breakfast','ti-sun','Breakfast'],['lunch','ti-sun-high','Lunch'],['dinner','ti-moon','Dinner'],['snack','ti-apple','Snack']].map(([v,ic,l])=>(
            <div key={v} className={`chip pressable ${foodMealTime===v?'active-green':''}`} onClick={()=>setFoodMealTime(v)}
              style={{justifyContent:'center',padding:'9px'}}>
              <i className={`ti ${ic}`} style={{fontSize:'13px'}}/>{l}
            </div>
          ))}
        </div>
        <input ref={foodNameRef} placeholder="Food name (e.g. banana, oatmeal)" className="input food-name-input"/>
        <input ref={foodPortionRef} placeholder="Portion (e.g. 1 cup, 100g)" className="input"/>
        {logResult&&(
          <div className="anim-scale-in" style={{background:'var(--color-primary-pale)',border:`0.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-md)',padding:'10px 13px',marginBottom:'.75rem',fontSize:'13px',color:'var(--color-primary)',display:'flex',alignItems:'center',gap:'8px'}}>
            <i className="ti ti-circle-check" style={{fontSize:'17px'}}/>
            Added · {logResult.calories} kcal · {logResult.protein}g protein
          </div>
        )}
        <button className="btn-primary pressable" onClick={logFood} disabled={logLoading}>
          {logLoading?<><i className="ti ti-loader-2 ti-spin" style={{fontSize:'16px'}}/>Looking up...</>:<><i className="ti ti-search" style={{fontSize:'16px'}}/>Look up & add</>}
        </button>
        <button className="btn-ghost" onClick={()=>setLogModalOpen(false)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── ACTIVITY MODAL ── */}
      <Modal open={actModalOpen} onClose={()=>setActModalOpen(false)} title="Log activity">
        <SL>Activity type</SL>
        <div style={{position:'relative' as const,marginBottom:'1rem'}}>
          <select value={actType||''} onChange={e=>{
            const val=e.target.value; setActType(val||null)
            const dur=parseInt(actDurRef.current?.value||'0')
            if(val&&dur){const act=ACTIVITIES.find(a=>a.value===val);setActBurnPreview(Math.round((act?.burn||6)*dur))}
            else setActBurnPreview(null)
          }} style={{width:'100%',padding:'11px 40px 11px 14px',borderRadius:'var(--radius-md)',border:`0.5px solid ${actType?'var(--color-primary)':'var(--color-border)'}`,background:actType?'var(--color-primary-pale)':'var(--color-surface)',fontSize:'14px',color:actType?'var(--color-primary)':'var(--color-text-muted)',fontFamily:'var(--font-body)',outline:'none',appearance:'none' as const,cursor:'pointer'}}>
            <option value="">Select activity...</option>
            {ACTIVITIES.map(a=><option key={a.value} value={a.value}>{a.label} (~{a.burn} kcal/min)</option>)}
          </select>
          <i className="ti ti-chevron-down" style={{position:'absolute' as const,right:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',color:'var(--color-text-muted)',pointerEvents:'none' as const}}/>
        </div>
        <input ref={actDurRef} type="number" placeholder="Duration in minutes (e.g. 45)"
          onChange={e=>{const dur=parseInt(e.target.value||'0');if(actType&&dur){const act=ACTIVITIES.find(a=>a.value===actType);setActBurnPreview(Math.round((act?.burn||6)*dur))}else setActBurnPreview(null)}}
          className="input"/>
        {actBurnPreview!==null&&(
          <div className="anim-scale-in" style={{background:'var(--color-red-pale)',border:`0.5px solid var(--color-red-border)`,borderRadius:'var(--radius-md)',padding:'8px 12px',fontSize:'13px',color:'var(--color-red)',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'8px'}}>
            <i className="ti ti-flame" style={{fontSize:'16px'}}/>Estimated burn: ~{actBurnPreview} kcal
          </div>
        )}
        <button className="btn-primary pressable" onClick={logActivity} disabled={!actType}>
          <i className="ti ti-check" style={{fontSize:'16px'}}/>Add activity
        </button>
        <button className="btn-ghost" onClick={()=>setActModalOpen(false)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── AVATAR MODAL ── */}
      <Modal open={editModalOpen==='avatar'} onClose={()=>setEditModalOpen(null)} title="Profile photo">

        {/* Current avatar preview */}
        <div style={{textAlign:'center' as const,marginBottom:'1.25rem'}}>
          <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'var(--color-primary-pale)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'36px',overflow:'hidden',border:`2px solid var(--color-primary-border)`}}>
            {(avatarUrl||profile?.avatar_url)
              ? <img src={avatarUrl||profile?.avatar_url} alt="Current" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span>{avatar}</span>
            }
          </div>
        </div>

        {/* Photo upload option */}
        <button onClick={()=>{ const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=()=>{const f=i.files?.[0]; if(f)uploadAvatar(f)}; i.click() }}
          disabled={avatarUploading}
          style={{width:'100%',padding:'14px',background:'var(--color-primary-pale)',border:`1.5px solid var(--color-primary-border)`,borderRadius:'var(--radius-lg)',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',marginBottom:'1.25rem',fontFamily:'var(--font-body)'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {avatarUploading
              ? <i className="ti ti-loader-2 ti-spin" style={{fontSize:'18px',color:'#fff'}}/>
              : <i className="ti ti-upload" style={{fontSize:'18px',color:'#fff'}}/>
            }
          </div>
          <div style={{textAlign:'left' as const}}>
            <div style={{fontSize:'14px',fontWeight:'600',color:'var(--color-primary)'}}>{avatarUploading?'Uploading...':'Upload a photo'}</div>
            <div style={{fontSize:'11px',color:'var(--color-primary)',opacity:.7,marginTop:'2px'}}>JPG, PNG or HEIC · auto-compressed</div>
          </div>
        </button>

        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'1rem'}}>
          <div style={{flex:1,height:'0.5px',background:'var(--color-border)'}}/>
          <span style={{fontSize:'11px',color:'var(--color-text-muted)',fontWeight:'500'}}>OR CHOOSE AN EMOJI</span>
          <div style={{flex:1,height:'0.5px',background:'var(--color-border)'}}/>
        </div>

        {/* Emoji grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px',marginBottom:'1rem'}}>
          {AVATARS.map(a=>(
            <div key={a} className="pressable" onClick={()=>setAvatar(a)}
              style={{width:'52px',height:'52px',borderRadius:'50%',background:avatar===a?'var(--color-primary-pale)':'var(--color-surface-2)',border:`1.5px solid ${avatar===a?'var(--color-primary)':'var(--color-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',cursor:'pointer',margin:'0 auto',transition:'all .18s'}}>
              {a}
            </div>
          ))}
        </div>
        <button className="btn-primary pressable" onClick={async()=>{
          try {
            const u=await saveProfile(user.id,{...profile,avatar,avatar_url:null})
            setAvatarUrl(null); onProfileUpdate(u); setEditModalOpen(null)
          } catch(e){}
        }}>
          <i className="ti ti-check" style={{fontSize:'16px'}}/>Use this emoji
        </button>
        <button className="btn-ghost" onClick={()=>setEditModalOpen(null)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── USERNAME MODAL ── */}
      <Modal open={editModalOpen==='account-username'} onClose={()=>setEditModalOpen(null)} title="Change username">
        <SL>Username</SL>
        <input defaultValue={profile?.username||displayName} id="username-input" className="input" placeholder="Your display name"/>
        <button className="btn-primary pressable" onClick={async()=>{
          const val=(document.getElementById('username-input') as HTMLInputElement)?.value?.trim()
          if(val){await saveAccountField('username',val);setEditModalOpen(null)}
        }}>Save</button>
        <button className="btn-ghost" onClick={()=>setEditModalOpen(null)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── PHONE MODAL ── */}
      <Modal open={editModalOpen==='account-phone'} onClose={()=>setEditModalOpen(null)} title="Phone number">
        <SL>Phone</SL>
        <input defaultValue={profile?.phone||''} id="phone-input" className="input" placeholder="+36 30 123 4567" type="tel"/>
        <button className="btn-primary pressable" onClick={async()=>{
          const val=(document.getElementById('phone-input') as HTMLInputElement)?.value?.trim()
          await saveAccountField('phone',val||''); setEditModalOpen(null)
        }}>Save</button>
        <button className="btn-ghost" onClick={()=>setEditModalOpen(null)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── PASSWORD MODAL ── */}
      <Modal open={editModalOpen==='password'} onClose={()=>setEditModalOpen(null)} title="Change password">
        <PasswordForm onDone={()=>setEditModalOpen(null)}/>
      </Modal>

      {/* ── DIET MODAL ── */}
      <Modal open={editModalOpen==='diet'} onClose={()=>setEditModalOpen(null)} title="Diet & allergies">
        <SL>Diet preferences</SL>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
          {DIETS.map(v=>(
            <div key={v} className={`chip pressable ${editProfile.diet?.includes(v)?'active-green':''}`}
              onClick={()=>setEditProfile((p:any)=>({...p,diet:p.diet?.includes(v)?p.diet.filter((x:string)=>x!==v):[...(p.diet||[]),v]}))}
              style={{justifyContent:'center',padding:'10px'}}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </div>
          ))}
        </div>
        <SL>Allergies</SL>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1.25rem'}}>
          {ALLERGIES.map(v=>(
            <div key={v} className={`chip pressable ${editProfile.allergies?.includes(v)?'active-green':''}`}
              onClick={()=>setEditProfile((p:any)=>({...p,allergies:p.allergies?.includes(v)?p.allergies.filter((x:string)=>x!==v):[...(p.allergies||[]),v]}))}
              style={{justifyContent:'center',padding:'10px'}}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </div>
          ))}
        </div>
        <button className="btn-primary pressable" onClick={saveEditedProfile}>Save changes</button>
        <button className="btn-ghost" onClick={()=>setEditModalOpen(null)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── GOALS MODAL ── */}
      <Modal open={editModalOpen==='goals'} onClose={()=>setEditModalOpen(null)} title="Goals & budget">
        <SL>Eating goal</SL>
        {GOALS.map(g=>(
          <div key={g.value} className="pressable" onClick={()=>setEditProfile((p:any)=>({...p,goal:g.value}))}
            style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 14px',borderRadius:'var(--radius-md)',border:`0.5px solid ${editProfile.goal===g.value?'var(--color-primary-border)':'var(--color-border)'}`,background:editProfile.goal===g.value?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',marginBottom:'8px',transition:'all .18s'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:'14px',fontWeight:'500',color:editProfile.goal===g.value?'var(--color-primary)':'var(--color-text)'}}>{g.label}</div>
              <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'2px'}}>{g.desc}</div>
            </div>
            <div style={{width:'18px',height:'18px',borderRadius:'50%',border:`2px solid ${editProfile.goal===g.value?'var(--color-primary)':'var(--color-border)'}`,background:editProfile.goal===g.value?'var(--color-primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .18s'}}>
              {editProfile.goal===g.value&&<div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#fff'}}/>}
            </div>
          </div>
        ))}
        <SL>Weekly budget</SL>
        <div style={{textAlign:'center' as const,margin:'.5rem 0'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'40px',color:'var(--color-primary)'}}>€{editProfile.budget}</div>
        </div>
        <input type="range" min="10" max="200" step="5" value={editProfile.budget}
          onChange={e=>setEditProfile((p:any)=>({...p,budget:parseInt(e.target.value)}))}
          style={{width:'100%',accentColor:'var(--color-primary)',margin:'.5rem 0 1.25rem'}}/>
        <button className="btn-primary pressable" onClick={saveEditedProfile}>Save changes</button>
        <button className="btn-ghost" onClick={()=>setEditModalOpen(null)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* Saved toast */}
      {/* ── MEAL RATING MODAL ── */}
      {ratingTarget&&(
        <div style={{position:'fixed' as const,inset:0,background:'rgba(0,0,0,.6)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setRatingTarget(null)}>
          <div className="anim-slide-up" onClick={e=>e.stopPropagation()}
            style={{background:'var(--surface)',borderRadius:'var(--radius-2xl) var(--radius-2xl) 0 0',padding:'1.5rem 1.5rem 2.5rem',width:'100%',maxWidth:'420px',textAlign:'center' as const}}>
            <div style={{width:'36px',height:'4px',borderRadius:'2px',background:'var(--border)',margin:'0 auto 1.25rem'}}/>
            <div style={{fontSize:'16px',fontWeight:'600',color:'var(--text)',marginBottom:'6px'}}>How was this meal?</div>
            <div style={{fontSize:'13px',color:'var(--text-2)',marginBottom:'1.25rem'}}>{ratingTarget}</div>
            <div style={{display:'flex',justifyContent:'center',marginBottom:'1.25rem'}}>
              <StarRating value={myRatings[ratingTarget]||0} size={36}
                onChange={r=>submitRating(ratingTarget,r)}/>
            </div>
            {mealRatings[ratingTarget]&&(
              <div style={{fontSize:'12px',color:'var(--text-2)',marginBottom:'1rem'}}>
                Community: {mealRatings[ratingTarget].avg}★ from {mealRatings[ratingTarget].count} {mealRatings[ratingTarget].count===1?'rating':'ratings'}
              </div>
            )}
            <button onClick={()=>setRatingTarget(null)}
              style={{fontSize:'13px',color:'var(--text-2)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* ── COUNTRY + STORE MODAL ── */}
      <Modal open={storeModalOpen} onClose={()=>setStoreModalOpen(false)} title="Country & stores">
        {/* Country picker */}
        <div style={{marginBottom:'1.25rem'}}>
          <div className="sl" style={{marginBottom:'10px'}}>Your country</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {Object.entries(COUNTRIES).map(([code,c])=>(
              <div key={code} className="pressable" onClick={()=>{setUserCountry(code);setUserStores([])}}
                style={{padding:'10px 12px',borderRadius:'var(--radius-md)',border:`1.5px solid ${userCountry===code?'var(--color-primary)':'var(--color-border)'}`,background:userCountry===code?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px',transition:'all .15s'}}>
                <span style={{fontSize:'20px'}}>{c.flag}</span>
                <span style={{fontSize:'12px',fontWeight:'500',color:userCountry===code?'var(--color-primary)':'var(--color-text)'}}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Store picker */}
        <div style={{marginBottom:'1.25rem'}}>
          <div className="sl" style={{marginBottom:'10px'}}>
            Stores you shop at <span style={{fontWeight:'400',color:'var(--color-text-muted)'}}>(select all)</span>
          </div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:'6px'}}>
            {(COUNTRIES[userCountry]?.stores||[]).map(store=>{
              const selected=userStores.includes(store.id)
              return (
                <div key={store.id} className="pressable"
                  onClick={()=>setUserStores(s=>selected?s.filter(x=>x!==store.id):[...s,store.id])}
                  style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',borderRadius:'var(--radius-md)',border:`1.5px solid ${selected?'var(--color-primary)':'var(--color-border)'}`,background:selected?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',transition:'all .15s'}}>
                  {/* Coloured brand dot */}
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',background:store.color,flexShrink:0}}/>
                  <span style={{fontSize:'13px',fontWeight:'500',color:selected?'var(--color-primary)':'var(--color-text)',flex:1}}>{store.name}</span>
                  {selected&&<i className="ti ti-check" style={{fontSize:'16px',color:'var(--color-primary)'}}/>}
                </div>
              )
            })}
          </div>
        </div>
        <button className="btn-primary pressable" onClick={()=>saveCountryStores(userCountry,userStores)}>
          <i className="ti ti-check" style={{fontSize:'15px'}}/>Save preferences
        </button>
        <button className="btn-ghost" onClick={()=>setStoreModalOpen(false)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {savedToast&&(
        <div style={{position:'fixed' as const,top:'20px',left:'50%',transform:'translateX(-50%)',background:'var(--color-primary)',color:'#fff',padding:'10px 20px',borderRadius:'50px',fontSize:'13px',fontWeight:'500',zIndex:999,whiteSpace:'nowrap' as const,boxShadow:'0 4px 16px rgba(0,0,0,.15)',display:'flex',alignItems:'center',gap:'7px'}}>
          <i className="ti ti-heart-filled" style={{fontSize:'15px'}}/>Recipe saved!
        </div>
      )}
    </div>
  )
}