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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const COACH_NAME = 'Sage'
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const GL: Record<string,string> = { bulk:'Bulking', cut:'Cutting', maintain:'Balanced', energy:'Energy boost', gut:'Gut health' }
const TARGET: Record<string,number> = { bulk:2700, cut:1750, maintain:2000, energy:2000, gut:1900 }
const TABS = ['home','meals','tracker','grocery','health','assist','profile']
const TAB_LABELS: Record<string,string> = { home:'Home', meals:'Meals', tracker:'Tracker', grocery:'Grocery', health:'Health', assist:'Coach', profile:'Profile' }
const TAB_ICONS: Record<string,string> = { home:'ti-home', meals:'ti-salad', tracker:'ti-chart-bar', grocery:'ti-shopping-cart', health:'ti-droplet', assist:'ti-robot', profile:'ti-user' }
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

  // Meal planning — date-based
  const [activeDate, setActiveDate] = useState(todayKey())
  const [meals, setMeals] = useState<Record<string,any>>({})
  const [servings, setServings] = useState(profile?.default_servings||2)
  const [mealDays, setMealDays] = useState(1)
  const [showSaved, setShowSaved] = useState(false)

  // Logs
  const [grocery, setGrocery] = useState<any[]>([])
  const [foodLog, setFoodLog] = useState<any[]>([])
  const [waterLog, setWaterLog] = useState<Record<string,number>>({})
  const [waterToday, setWaterToday] = useState(0)
  const [weightLog, setWeightLog] = useState<any[]>([])
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [savedRecipes, setSavedRecipes] = useState<any[]>([])

  // Meal suggestions
  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [mealSuggestions, setMealSuggestions] = useState<any[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [mealFilters, setMealFilters] = useState({ time:null as string|null, diff:null as string|null, cuisine:null as string|null })
  const [avoidInput, setAvoidInput] = useState('')
  const [savedToast, setSavedToast] = useState(false)

  // Tracker modals
  const [logModalOpen, setLogModalOpen] = useState(false)
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
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Profile editing
  const [editModalOpen, setEditModalOpen] = useState<string|null>(null)
  const [editProfile, setEditProfile] = useState<any>({...profile})
  const [avatar, setAvatar] = useState(profile?.avatar||'🥗')

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  const tgt = profile?.tdee || TARGET[profile?.goal] || 2000
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
      data.forEach((m:any)=>{ map[m.plan_date||m.logged_date||dateKey(new Date())]={...m,desc:m.description} })
      setMeals(map)
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

  // ─── MEAL ACTIONS ──────────────────────────────────────────────────────────

  async function selectMeal(meal:any) {
    try {
      for (let d=0; d<mealDays; d++) {
        const td=new Date(activeDate+'T12:00:00'); td.setDate(td.getDate()+d)
        const dk=dateKey(td)
        await saveMeal(user.id,dk,0,{...meal,servings,plan_date:dk})
      }
      await loadMeals(); setMealModalOpen(false); setMealSuggestions([])
    } catch(e){console.error(e)}
  }

  async function getSuggestions() {
    setSuggestLoading(true); setMealSuggestions([])
    try {
      const res=await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({profile,filters:{diet:profile.diet,allergies:profile.allergies,goal:profile.goal,budget:profile.budget,time:mealFilters.time,difficulty:mealFilters.diff,cuisine:mealFilters.cuisine},avoid:avoidInput,servings,mealDays})})
      const data=await res.json(); setMealSuggestions(data.meals||[])
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

  // ─── FOOD LOG ──────────────────────────────────────────────────────────────

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
        body:JSON.stringify({messages:newHistory,profile,mealSummary:Object.entries(meals).map(([dk,m]:any)=>`${dk}: ${m.name}`).join(', ')})})
      const data=await res.json()
      setChatHistory([...newHistory,{role:'assistant',content:data.reply}])
    } catch(e){console.error(e)}
    setChatLoading(false)
  }

  // ─── PROFILE ───────────────────────────────────────────────────────────────

  async function saveEditedProfile() {
    try { const u=await saveProfile(user.id,{...editProfile,avatar}); onProfileUpdate(u); setEditModalOpen(null) } catch(e){console.error(e)}
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
        avatarEmoji={profile?.avatar||avatar||'🥗'}
        onAddMeal={()=>{setMealModalOpen(true);setMealSuggestions([])}}
        onLogFood={()=>{setLogResult(null);setLogModalOpen(true)}}
        onLogActivity={()=>setActModalOpen(true)}
        onAddWater={updateWater} onSwitchTab={switchTab}
        onViewAllMeals={viewAllMeals} onGoToProfile={()=>switchTab('profile')}
      />
    )
  }

  function renderMeals() {
    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'0 1.25rem 1rem'}}>
        {/* Toggle */}
        <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
          <div className={`chip pressable ${!showSaved?'active-green':''}`} onClick={()=>setShowSaved(false)}>
            <i className="ti ti-calendar-week" style={{fontSize:'12px'}}/>This week
          </div>
          <div className={`chip pressable ${showSaved?'active-green':''}`} onClick={()=>setShowSaved(true)}>
            <i className="ti ti-heart" style={{fontSize:'12px'}}/>Saved
            {savedRecipes.length>0&&<span style={{background:'var(--color-primary)',color:'#fff',borderRadius:'50%',padding:'1px 6px',fontSize:'10px'}}>{savedRecipes.length}</span>}
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
              Tailored to: <strong>{GL[profile.goal]}</strong>{profile.diet?.length?` · ${profile.diet[0]}`:''} · €{profile.budget}/wk{profile.tdee?` · ${profile.tdee} kcal`:''}
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

            {/* Day's current meal */}
            <span className="sl">{activeDateLabel()}'s meal</span>
            {meals[activeDate] ? (
              <div className="recipe-card anim-scale-in" style={{marginBottom:'12px'}}>
                <div className="recipe-card-body">
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'3px'}}>
                    <div className="recipe-card-name">{meals[activeDate].name}</div>
                    <span className="tag tag-green">Planned</span>
                  </div>
                  <div className="recipe-card-desc">{meals[activeDate].description}</div>
                  {meals[activeDate].macros&&<div className="macro-pill-row">
                    {[{v:meals[activeDate].macros.calories,l:'kcal',c:'var(--color-text)'},{v:meals[activeDate].macros.protein+'g',l:'protein',c:'var(--color-primary)'},{v:meals[activeDate].macros.carbs+'g',l:'carbs',c:'var(--color-blue)'},{v:meals[activeDate].macros.fat+'g',l:'fat',c:'var(--color-amber)'}].map(m=>(
                      <div key={m.l} className="macro-pill"><span className="macro-pill-val" style={{color:m.c}}>{m.v}</span><span className="macro-pill-lbl">{m.l}</span></div>
                    ))}
                  </div>}
                  <div style={{display:'flex',gap:'8px'}}>
                    <button className="pressable" onClick={()=>{setMealModalOpen(true);setMealSuggestions([])}}
                      style={{flex:1,padding:'9px',borderRadius:'var(--radius-md)',border:`0.5px solid var(--color-border)`,background:'var(--color-surface)',fontSize:'12px',fontWeight:'500',color:'var(--color-text-muted)',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                      <i className="ti ti-refresh" style={{fontSize:'12px',marginRight:'4px'}}/>Change
                    </button>
                    <button className="pressable" onClick={()=>addToGrocery(activeDate)}
                      style={{flex:1,padding:'9px',borderRadius:'var(--radius-md)',border:'none',background:'var(--color-primary)',fontSize:'12px',fontWeight:'500',color:'#fff',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                      <i className="ti ti-shopping-cart" style={{fontSize:'12px',marginRight:'4px'}}/>Grocery
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pressable" onClick={()=>{setMealModalOpen(true);setMealSuggestions([])}}
                style={{borderRadius:'var(--radius-xl)',padding:'1.25rem',marginBottom:'12px',border:`1.5px dashed var(--color-border)`,display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="ti ti-sparkles" style={{fontSize:'16px',color:'var(--color-primary)'}}/>
                </div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'500',color:'var(--color-text)'}}>Suggest a meal for {activeDateLabel()}</div>
                  <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>AI-powered · based on your goals</div>
                </div>
                <i className="ti ti-arrow-right" style={{fontSize:'14px',color:'var(--color-text-muted)',marginLeft:'auto'}}/>
              </div>
            )}
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
        {/* Strip */}
        <div className="card" style={{background:'var(--color-primary-pale)',borderColor:'var(--color-primary-border)',display:'flex',gap:'10px'}}>
          {[{val:totalIn,label:'eaten',color:'var(--color-amber)'},{val:totalBurned,label:'burned',color:'var(--color-red)'},{val:Math.max(tgt-netCals,0),label:'remaining',color:rc}].map((item,i)=>(
            <div key={i} style={{flex:1,textAlign:'center' as const}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'22px',color:item.color,lineHeight:1}}>{item.val}</div>
              <div style={{fontSize:'9px',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.06em',marginTop:'3px'}}>{item.label}</div>
            </div>
          ))}
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
    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'0 1.25rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontSize:'16px',fontWeight:'600',color:'var(--color-text)',display:'flex',alignItems:'center',gap:'8px'}}>
            <i className="ti ti-shopping-cart" style={{fontSize:'18px',color:'var(--color-primary)'}}/>Grocery list
          </div>
          {grocery.some((g:any)=>g.checked)&&(
            <button className="pressable" onClick={async()=>{await saveGroceryItems(user.id,activeDate,grocery.filter((g:any)=>!g.checked));await loadGrocery()}}
              style={{fontSize:'12px',color:'var(--color-text-muted)',background:'none',border:`0.5px solid var(--color-border)`,borderRadius:'8px',padding:'4px 10px',cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'4px'}}>
              <i className="ti ti-trash" style={{fontSize:'12px'}}/>Clear done
            </button>
          )}
        </div>
        {!grocery.length ? (
          <div className="empty-state">
            <img src="/images/empty-grocery.png" alt=""/>
            <div className="empty-title">Your list is empty</div>
            <div className="empty-desc">Plan a meal and tap "Add to grocery" to build your shopping list.</div>
          </div>
        ) : Object.entries(groups).map(([section,items])=>(
          <div key={section} style={{marginBottom:'1rem'}}>
            <span className="sl">{section}</span>
            {items.map((item:any)=>(
              <div key={item.id} className="pressable" onClick={()=>toggleItem(item.id,item.checked)}
                style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 13px',background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-md)',marginBottom:'6px',opacity:item.checked?.45:1,transition:'opacity .2s'}}>
                <div style={{width:'20px',height:'20px',borderRadius:'6px',border:`1.5px solid ${item.checked?'var(--color-primary)':'var(--color-border)'}`,background:item.checked?'var(--color-primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
                  {item.checked&&<i className="ti ti-check" style={{fontSize:'12px',color:'#fff'}}/>}
                </div>
                <span style={{fontSize:'13px',flex:1,textDecoration:item.checked?'line-through':'none'}}>{item.name}</span>
                <span style={{fontSize:'12px',color:'var(--color-text-muted)',fontWeight:'500'}}>{item.qty}</span>
              </div>
            ))}
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
    return (
      <div key={tabKey} style={{display:'flex',flexDirection:'column',flex:1,height:'100%'}}>
        <div style={{flex:1,overflowY:'auto',padding:'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'10px'}}>
          {!chatHistory.length&&(
            <div className="anim-fade-up" style={{alignSelf:'flex-start',maxWidth:'85%'}}>
              <div style={{background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-xl)',borderBottomLeftRadius:'4px',padding:'14px'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-primary)',marginBottom:'5px',display:'flex',alignItems:'center',gap:'5px'}}>
                  <i className="ti ti-robot" style={{fontSize:'13px'}}/>{COACH_NAME}
                </div>
                <div style={{fontSize:'13px',lineHeight:'1.6',color:'var(--color-text)'}}>
                  Hi! I'm {COACH_NAME}, your personal nutrition coach. Ask me anything about meals, macros, or your health goals.{profile?.tdee?` Your daily target is ${profile.tdee} kcal.`:''}
                </div>
                <div className="suggest-chips">
                  {CHIPS.map(([l,q])=><div key={l} className="suggest-chip" onClick={()=>sendChat(q)}>{l}</div>)}
                </div>
              </div>
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

  function renderProfile() {
    if (profileSubPage==='account') return renderAccountSettings()
    if (profileSubPage==='settings') return renderAppSettings()
    if (profileSubPage==='tdee') return renderTDEEPage()
    return (
      <div key={tabKey} className="anim-fade-up" style={{padding:'0 1.25rem 1rem'}}>
        {/* Hero */}
        <div style={{textAlign:'center' as const,marginBottom:'1.75rem',paddingTop:'1rem'}}>
          <div className="pressable" onClick={()=>setEditModalOpen('avatar')}
            style={{width:'88px',height:'88px',borderRadius:'50%',background:'var(--color-primary-pale)',border:`2px solid var(--color-primary-border)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'40px',margin:'0 auto 12px',cursor:'pointer',position:'relative' as const}}>
            {profile?.avatar||avatar}
            <div style={{position:'absolute' as const,bottom:0,right:0,width:'24px',height:'24px',borderRadius:'50%',background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-pencil" style={{fontSize:'11px',color:'var(--color-text-muted)'}}/>
            </div>
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'24px',color:'var(--color-text)'}}>{profile?.username||displayName}</div>
          {profile?.tdee&&<div style={{marginTop:'8px',display:'inline-flex',alignItems:'center',gap:'5px',background:'var(--color-primary-pale)',color:'var(--color-primary)',padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:'500'}}>
            <i className="ti ti-target" style={{fontSize:'12px'}}/>{profile.tdee} kcal daily target
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
              <div className="menu-row-sub">{profile?.tdee?`${profile.tdee} kcal · tap to recalculate`:'Not set — tap to calculate'}</div>
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
            <i className="ti ti-arrow-left" style={{fontSize:'18px'}}/>Back
          </button>
          <div className="subpage-title">Account settings</div>
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
            <i className="ti ti-arrow-left" style={{fontSize:'18px'}}/>Back
          </button>
          <div className="subpage-title">Settings</div>
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
            <i className="ti ti-arrow-left" style={{fontSize:'18px'}}/>Back
          </button>
          <div className="subpage-title">Calorie target</div>
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
    <div style={{maxWidth:'420px',margin:'0 auto',minHeight:'100dvh',display:'flex',flexDirection:'column',background:'var(--color-bg)',transition:'background .3s ease'}}>

      {/* Safe area top */}
      <div style={{height:'env(safe-area-inset-top,12px)',minHeight:'12px',flexShrink:0}}/>

      {/* 30-day date scroller */}
      {['meals','tracker','grocery'].includes(tab)&&(
        <div style={{display:'flex',gap:'6px',padding:'.75rem 1.25rem',borderBottom:`0.5px solid var(--color-border-subtle)`,overflowX:'auto',WebkitOverflowScrolling:'touch' as any}} className="hide-scroll">
          {Array.from({length:30},(_,i)=>{
            const d=new Date(); d.setDate(d.getDate()+i)
            const dk=dateKey(d)
            const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
            const isActive=dk===activeDate
            const hasMeal=!!meals[dk]
            return (
              <div key={dk} className={`day-pill pressable ${isActive?'active':''} ${hasMeal?'has-meal':''}`}
                onClick={()=>setActiveDate(dk)} style={{flexShrink:0}}>
                <span className="day-name">{i===0?'Today':dayNames[d.getDay()]}</span>
                <span className="day-num">{d.getDate()}</span>
                <span className="day-dot"/>
              </div>
            )
          })}
        </div>
      )}

      {/* Content */}
      <div style={{flex:1,overflowY:tab==='assist'?'hidden':'auto',display:'flex',flexDirection:'column'}}>
        {tab==='home'    && renderHome()}
        {tab==='meals'   && renderMeals()}
        {tab==='tracker' && renderTracker()}
        {tab==='grocery' && renderGrocery()}
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
                <i className={`ti ${TAB_ICONS[t]} nav-icon`}/>
                <span className="nav-label">{TAB_LABELS[t]}</span>
              </button>
            )
          })}
        </nav>
      )}

      {/* ── MEAL MODAL ── */}
      <Modal open={mealModalOpen} onClose={()=>setMealModalOpen(false)} title="Suggest a meal" subtitle={`for ${activeDateLabel()}${profile?.goal?' · '+GL[profile.goal]:''}`}>

        {/* Servings + days */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1.25rem',background:'var(--color-surface-2)',borderRadius:'var(--radius-md)',padding:'12px'}}>
          <div>
            <div style={{fontSize:'10px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:'8px'}}>Persons</div>
            <div className="stepper">
              <button className="stepper-btn" onClick={()=>setServings(s=>Math.max(1,s-1))}>−</button>
              <span className="stepper-val">{servings}</span>
              <button className="stepper-btn" onClick={()=>setServings(s=>Math.min(12,s+1))}>+</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:'10px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:'8px'}}>Days</div>
            <div className="stepper">
              <button className="stepper-btn" onClick={()=>setMealDays(d=>Math.max(1,d-1))}>−</button>
              <span className="stepper-val">{mealDays}</span>
              <button className="stepper-btn" onClick={()=>setMealDays(d=>Math.min(7,d+1))}>+</button>
            </div>
          </div>
        </div>
        {(servings>1||mealDays>1)&&<div style={{fontSize:'11px',color:'var(--color-text-muted)',marginBottom:'12px',textAlign:'center' as const}}>
          Scaled for {servings} {servings===1?'person':'people'}{mealDays>1?`, ${mealDays} days in a row`:''}
        </div>}

        {/* Cuisine */}
        <SL>Cuisine</SL>
        <div style={{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'4px',marginBottom:'1rem'}} className="hide-scroll">
          <div className={`chip pressable ${!mealFilters.cuisine?'active-green':''}`} onClick={()=>setMealFilters(f=>({...f,cuisine:null}))}>Any</div>
          {CUISINES.map(c=>(
            <div key={c.value} className={`chip pressable ${mealFilters.cuisine===c.value?'active-green':''}`}
              onClick={()=>setMealFilters(f=>({...f,cuisine:f.cuisine===c.value?null:c.value}))}>
              {c.flag} {c.label}
            </div>
          ))}
        </div>

        {/* Time */}
        <SL>Time to cook</SL>
        <div style={{display:'flex',gap:'8px',marginBottom:'1rem'}}>
          {[['quick','ti-bolt','Quick','Under 30 min'],['medium','ti-clock','Medium','30–60 min'],['weekend','ti-chef-hat','Weekend','60+ min']].map(([v,ic,l,sub])=>(
            <div key={v} className="pressable" onClick={()=>setMealFilters(f=>({...f,time:f.time===v?null:v}))}
              style={{flex:1,padding:'10px 4px',borderRadius:'var(--radius-md)',border:`0.5px solid ${mealFilters.time===v?'var(--color-blue)':'var(--color-border)'}`,background:mealFilters.time===v?'var(--color-blue-pale)':'var(--color-surface)',cursor:'pointer',textAlign:'center' as const}}>
              <i className={`ti ${ic}`} style={{fontSize:'18px',color:mealFilters.time===v?'var(--color-blue)':'var(--color-text-muted)',display:'block',marginBottom:'3px'}}/>
              <div style={{fontSize:'11px',fontWeight:'500',color:mealFilters.time===v?'var(--color-blue)':'var(--color-text-muted)'}}>{l}</div>
              <div style={{fontSize:'10px',color:'var(--color-text-muted)'}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Difficulty */}
        <SL>Difficulty</SL>
        <div style={{display:'flex',gap:'8px',marginBottom:'1rem'}}>
          {[['easy','ti-mood-smile','Easy'],['medium','ti-mood-wink','Medium'],['advanced','ti-certificate','Advanced']].map(([v,ic,l])=>(
            <div key={v} className="pressable" onClick={()=>setMealFilters(f=>({...f,diff:f.diff===v?null:v}))}
              style={{flex:1,padding:'10px 4px',borderRadius:'var(--radius-md)',border:`0.5px solid ${mealFilters.diff===v?'var(--color-amber)':'var(--color-border)'}`,background:mealFilters.diff===v?'var(--color-amber-pale)':'var(--color-surface)',cursor:'pointer',textAlign:'center' as const}}>
              <i className={`ti ${ic}`} style={{fontSize:'18px',color:mealFilters.diff===v?'var(--color-amber)':'var(--color-text-muted)',display:'block',marginBottom:'3px'}}/>
              <div style={{fontSize:'11px',fontWeight:'500',color:mealFilters.diff===v?'var(--color-amber)':'var(--color-text-muted)'}}>{l}</div>
            </div>
          ))}
        </div>

        <input value={avoidInput} onChange={e=>setAvoidInput(e.target.value)} placeholder="Anything to avoid?" className="input"/>

        {/* Suggestions */}
        {mealSuggestions.map((meal:any,i:number)=>(
          <div key={i} className="recipe-card anim-scale-in" style={{marginBottom:'10px',position:'relative' as const}}>
            <div className="recipe-card-img" style={{background:'var(--color-primary-pale)'}}>
              <span style={{fontSize:'38px'}}>{meal.emoji||'🍽️'}</span>
              {meal.cuisine&&<span style={{position:'absolute' as const,top:'8px',left:'10px',background:'rgba(0,0,0,.35)',borderRadius:'20px',padding:'3px 9px',fontSize:'10px',fontWeight:'500',color:'#fff'}}>
                {CUISINES.find(c=>c.value===meal.cuisine)?.flag} {meal.cuisine}
              </span>}
              <button className="pressable" onClick={async(e)=>{e.stopPropagation();await handleSaveRecipe(meal)}}
                style={{position:'absolute' as const,top:'8px',right:'10px',background:'rgba(0,0,0,.35)',border:'none',borderRadius:'50%',width:'28px',height:'28px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-heart" style={{fontSize:'14px',color:'#fff'}}/>
              </button>
            </div>
            <div className="recipe-card-body">
              <div className="recipe-card-name">{meal.name}</div>
              <div className="recipe-card-desc">{meal.desc}</div>
              <div style={{display:'flex',gap:'5px',marginBottom:'9px',flexWrap:'wrap' as const}}>
                {meal.timeTag&&<span className="tag tag-slate"><i className="ti ti-clock" style={{fontSize:'10px',marginRight:'3px'}}/>{meal.timeTag}</span>}
                {meal.diffTag&&<span className="tag tag-slate">{meal.diffTag}</span>}
                {meal.macros&&<span className="tag tag-slate">{meal.macros.calories} kcal</span>}
                {meal.macros&&<span className="tag tag-green">{meal.macros.protein}g protein</span>}
              </div>
              <button className="btn-primary pressable" onClick={()=>selectMeal(meal)}>
                <i className="ti ti-calendar-plus" style={{fontSize:'15px'}}/>
                Add to {activeDateLabel()}
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
        <button className="btn-ghost" onClick={()=>setMealModalOpen(false)} style={{marginTop:'8px'}}>Cancel</button>
      </Modal>

      {/* ── FOOD LOG MODAL ── */}
      <Modal open={logModalOpen} onClose={()=>setLogModalOpen(false)} title="Log food" subtitle="Search by name — Sage will look up the nutrition.">
        {/* Quick-log grid */}
        <div className="quick-log-grid" style={{marginBottom:'1.25rem'}}>
          <div className="quick-log-btn pressable">
            <div className="quick-log-icon" style={{background:'var(--color-primary-pale)'}}>
              <i className="ti ti-barcode" style={{fontSize:'18px',color:'var(--color-primary)'}}/>
            </div>
            <span className="quick-log-title">Scan barcode</span>
            <span className="quick-log-sub">Coming soon</span>
          </div>
          <div className="quick-log-btn pressable" onClick={()=>{setLogModalOpen(false);setTab('assist')}}>
            <div className="quick-log-icon" style={{background:'var(--color-surface-2)'}}>
              <i className="ti ti-robot" style={{fontSize:'18px',color:'var(--color-text-muted)'}}/>
            </div>
            <span className="quick-log-title">Ask {COACH_NAME}</span>
            <span className="quick-log-sub">Estimate calories</span>
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
        <input ref={foodNameRef} placeholder="Food name (e.g. banana, oatmeal)" className="input"/>
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
      <Modal open={editModalOpen==='avatar'} onClose={()=>setEditModalOpen(null)} title="Choose your avatar">
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px',marginBottom:'1rem'}}>
          {AVATARS.map(a=>(
            <div key={a} className="pressable" onClick={()=>setAvatar(a)}
              style={{width:'52px',height:'52px',borderRadius:'50%',background:avatar===a?'var(--color-primary-pale)':'var(--color-surface-2)',border:`1.5px solid ${avatar===a?'var(--color-primary)':'var(--color-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',cursor:'pointer',margin:'0 auto',transition:'all .18s'}}>
              {a}
            </div>
          ))}
        </div>
        <button className="btn-primary pressable" onClick={async()=>{try{const u=await saveProfile(user.id,{...profile,avatar});onProfileUpdate(u);setEditModalOpen(null)}catch(e){}}}>
          <i className="ti ti-check" style={{fontSize:'16px'}}/>Save avatar
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
      {savedToast&&(
        <div style={{position:'fixed' as const,top:'20px',left:'50%',transform:'translateX(-50%)',background:'var(--color-primary)',color:'#fff',padding:'10px 20px',borderRadius:'50px',fontSize:'13px',fontWeight:'500',zIndex:999,whiteSpace:'nowrap' as const,boxShadow:'0 4px 16px rgba(0,0,0,.15)',display:'flex',alignItems:'center',gap:'7px'}}>
          <i className="ti ti-heart-filled" style={{fontSize:'15px'}}/>Recipe saved!
        </div>
      )}
    </div>
  )
}