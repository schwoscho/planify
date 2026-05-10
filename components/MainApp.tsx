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
import Modal from './Modal'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GL: Record<string, string> = { bulk: 'Bulking', cut: 'Cutting', maintain: 'Balanced', energy: 'Energy boost', gut: 'Gut health' }
const TARGET: Record<string, number> = { bulk: 2700, cut: 1750, maintain: 2000, energy: 2000, gut: 1900 }

const ACTIVITIES = [
  { value: 'running', label: 'Running', icon: 'ti-run', burn: 10 },
  { value: 'cycling', label: 'Cycling', icon: 'ti-bike', burn: 7 },
  { value: 'gym', label: 'Gym / weights', icon: 'ti-barbell', burn: 6 },
  { value: 'swimming', label: 'Swimming', icon: 'ti-swimming', burn: 9 },
  { value: 'walking', label: 'Walking', icon: 'ti-walk', burn: 4 },
  { value: 'yoga', label: 'Yoga', icon: 'ti-yoga', burn: 3 },
  { value: 'hiit', label: 'HIIT', icon: 'ti-flame', burn: 11 },
  { value: 'tennis', label: 'Tennis', icon: 'ti-tennis', burn: 8 },
  { value: 'boxing', label: 'Boxing', icon: 'ti-box', burn: 10 },
  { value: 'basketball', label: 'Basketball', icon: 'ti-ball-basketball', burn: 8 },
  { value: 'football', label: 'Football', icon: 'ti-ball-football', burn: 9 },
  { value: 'hiking', label: 'Hiking', icon: 'ti-mountain', burn: 6 },
  { value: 'dancing', label: 'Dancing', icon: 'ti-music', burn: 6 },
  { value: 'rowing', label: 'Rowing', icon: 'ti-rowing', burn: 8 },
  { value: 'pilates', label: 'Pilates', icon: 'ti-stretching', burn: 4 },
  { value: 'climbing', label: 'Rock climbing', icon: 'ti-mountain', burn: 9 },
  { value: 'jump_rope', label: 'Jump rope', icon: 'ti-refresh', burn: 12 },
  { value: 'other', label: 'Other', icon: 'ti-activity', burn: 6 },
]

const CUISINES = [
  { value: 'italian', label: 'Italian', flag: '🇮🇹' },
  { value: 'french', label: 'French', flag: '🇫🇷' },
  { value: 'indian', label: 'Indian', flag: '🇮🇳' },
  { value: 'japanese', label: 'Japanese', flag: '🇯🇵' },
  { value: 'mexican', label: 'Mexican', flag: '🇲🇽' },
  { value: 'mediterranean', label: 'Mediterranean', flag: '🌊' },
  { value: 'asian', label: 'Asian', flag: '🥢' },
  { value: 'american', label: 'American', flag: '🇺🇸' },
  { value: 'hungarian', label: 'Hungarian', flag: '🇭🇺' },
  { value: 'greek', label: 'Greek', flag: '🇬🇷' },
  { value: 'thai', label: 'Thai', flag: '🇹🇭' },
  { value: 'turkish', label: 'Turkish', flag: '🇹🇷' },
]

// Feature icon sprite — 3 cols x 2 rows
// Row 0: meals, tracker, grocery
// Row 1: health, (scale), coach
const SPRITE: Record<string, [number,number]> = {
  meals:   [0, 0],
  tracker: [1, 0],
  grocery: [2, 0],
  health:  [0, 1],
  assist:  [2, 1],
}

const TABS = ['home', 'meals', 'tracker', 'grocery', 'health', 'assist', 'profile']
const TAB_LABELS: Record<string, string> = { home: 'Home', meals: 'Meals', tracker: 'Tracker', grocery: 'Grocery', health: 'Health', assist: 'Coach', profile: 'Profile' }
const AVATARS = ['🥗', '💪', '🔥', '⚡', '🌿', '🏃', '🥑', '👑', '🌟', '🎯']
const DIETS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'halal']
const DIET_ICONS: Record<string, string> = { vegetarian: '🥦', vegan: '🌱', 'gluten-free': '🌾', 'dairy-free': '🥛', keto: '🥑', halal: '☪️' }
const ALLERGIES = ['nuts', 'shellfish', 'eggs', 'soy', 'fish', 'sesame']
const ALLERGY_ICONS: Record<string, string> = { nuts: '🥜', shellfish: '🦐', eggs: '🥚', soy: '🫘', fish: '🐟', sesame: '🌰' }
const GOALS = [
  { value: 'bulk', icon: '💪', label: 'Build muscle (bulk)', desc: 'High protein, caloric surplus' },
  { value: 'cut', icon: '🔥', label: 'Lose weight (cut)', desc: 'Caloric deficit, high protein' },
  { value: 'maintain', icon: '⚖️', label: 'Stay balanced', desc: 'Balanced macros' },
  { value: 'energy', icon: '⚡', label: 'Boost energy', desc: 'Low glycaemic' },
  { value: 'gut', icon: '🌿', label: 'Gut health', desc: 'Fibre-rich foods' },
]

function getMonday() {
  const d = new Date(); const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d
}
function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function todayKey() { return dateKey(new Date()) }
function todayDayIndex() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

function useTheme() {
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  useEffect(() => {
    const stored = localStorage.getItem('planify-theme')
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initial = (stored as 'light'|'dark') || preferred
    setTheme(initial); document.documentElement.setAttribute('data-theme', initial)
  }, [])
  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next); document.documentElement.setAttribute('data-theme', next); localStorage.setItem('planify-theme', next)
  }
  return { theme, toggle }
}

// Sprite nav icon
function SpriteIcon({ tab, size=22, active=false }: { tab:string, size?:number, active?:boolean }) {
  const pos = SPRITE[tab]
  if (!pos) return null
  return (
    <div style={{
      width: size, height: size,
      backgroundImage: 'url(/images/feature-icons.png)',
      backgroundSize: '300% 200%',
      backgroundPosition: `${pos[0]*50}% ${pos[1]*100}%`,
      opacity: active ? 1 : 0.4,
      transition: 'opacity 0.2s',
      flexShrink: 0,
    }} />
  )
}

function ToggleSwitch({ value, onChange }: { value: boolean, onChange: (v:boolean)=>void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:'44px', height:'26px', borderRadius:'13px', background: value?'var(--color-primary)':'var(--color-border)', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: value?'21px':'3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'left 0.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </div>
  )
}

function SL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:'11px', fontWeight:'600', color:'var(--color-text-muted)', textTransform:'uppercase' as const, letterSpacing:'.08em', marginBottom:'8px' }}>{children}</div>
}

function TDEEInline({ goal, currentTdee, savedStats, onComplete, onCancel }: any) {
  // Pre-fill with last saved stats if available
  const [sex, setSex] = useState<'male'|'female'|null>(savedStats?.sex||null)
  const [age, setAge] = useState(savedStats?.age?String(savedStats.age):'')
  const [weight, setWeight] = useState(savedStats?.weight?String(savedStats.weight):'')
  const [height, setHeight] = useState(savedStats?.height?String(savedStats.height):'')
  const [activity, setActivity] = useState<number|null>(savedStats?.activity||null)
  const [result, setResult] = useState<any>(null)
  const AL = [
    { value:1.2,   label:'Sedentary',         desc:'Desk job, little exercise' },
    { value:1.375, label:'Lightly active',     desc:'1–3 workouts/week' },
    { value:1.55,  label:'Moderately active',  desc:'3–5 workouts/week' },
    { value:1.725, label:'Very active',        desc:'6–7 workouts/week' },
    { value:1.9,   label:'Athlete',            desc:'Twice daily training' },
  ]
  const GADJ: Record<string,number> = { bulk:300, cut:-400, maintain:0, energy:0, gut:0 }
  const GMAC: Record<string,{protein:number,fat:number}> = { bulk:{protein:2.2,fat:0.9}, cut:{protein:2.4,fat:0.8}, maintain:{protein:1.8,fat:0.9}, energy:{protein:1.8,fat:1.0}, gut:{protein:1.6,fat:1.0} }
  function calculate() {
    const w=parseFloat(weight), h=parseFloat(height), a=parseInt(age)
    if (!w||!h||!a||!sex||!activity) return
    const bmr = sex==='male' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161
    const tdee=Math.round(bmr*activity); const adj=GADJ[goal||'maintain']||0; const tc=tdee+adj
    const mac=GMAC[goal||'maintain']; const protein=Math.round(w*mac.protein); const fat=Math.round(w*mac.fat)
    const carbs=Math.round(Math.max((tc-protein*4-fat*9)/4,50))
    setResult({ tdee, targetCals:tc, protein, carbs, fat, bmr:Math.round(bmr), stats:{sex,age:a,weight:w,height:h,activity} })
  }
  if (result) return (
    <div>
      <div style={{ background:'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', borderRadius:'14px', padding:'1.25rem', marginBottom:'12px', textAlign:'center' as const, color:'#fff' }}>
        <div style={{ fontSize:'12px', opacity:.8, marginBottom:'4px' }}>New daily calorie target</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'48px', fontWeight:'600', lineHeight:1 }}>{result.targetCals}</div>
        <div style={{ fontSize:'12px', opacity:.7, marginTop:'4px' }}>kcal / day</div>
        {currentTdee && <div style={{ fontSize:'11px', opacity:.6, marginTop:'6px' }}>Previously: {currentTdee} kcal</div>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
        {[{label:'Protein',val:result.protein+'g',color:'var(--color-primary)'},{label:'Carbs',val:result.carbs+'g',color:'var(--color-blue)'},{label:'Fat',val:result.fat+'g',color:'var(--color-amber)'}].map(m => (
          <div key={m.label} style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)', borderRadius:'10px', padding:'10px', textAlign:'center' as const }}>
            <div style={{ fontSize:'18px', fontWeight:'600', color:m.color }}>{m.val}</div>
            <div style={{ fontSize:'10px', color:'var(--color-text-muted)', marginTop:'2px', textTransform:'uppercase' as const }}>{m.label}</div>
          </div>
        ))}
      </div>
      <button className="pressable" onClick={() => onComplete({tdee:result.targetCals,protein:result.protein,carbs:result.carbs,fat:result.fat,stats:result.stats})} style={{ width:'100%', padding:'13px', background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', marginBottom:'8px' }}>Save new targets</button>
      <button className="pressable" onClick={() => setResult(null)} style={{ width:'100%', padding:'10px', background:'transparent', border:'none', fontSize:'13px', color:'var(--color-text-muted)', cursor:'pointer', fontFamily:'inherit' }}>← Recalculate</button>
    </div>
  )
  return (
    <div>
      <div style={{ marginBottom:'1rem' }}>
        <div style={{ fontSize:'12px', fontWeight:'500', color:'var(--color-text-muted)', marginBottom:'6px' }}>Biological sex</div>
        <div style={{ display:'flex', gap:'8px' }}>
          {(['male','female'] as const).map(v => (
            <div key={v} className="pressable" onClick={() => setSex(v)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:`1.5px solid ${sex===v?'var(--color-primary)':'var(--color-border)'}`, background:sex===v?'var(--color-primary-pale)':'var(--color-surface)', cursor:'pointer', textAlign:'center' as const, fontSize:'13px', fontWeight:'500', color:sex===v?'var(--color-primary)':'var(--color-text-muted)', transition:'all .18s' }}>
              {v==='male'?'♂️ Male':'♀️ Female'}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'1rem' }}>
        {[{label:'Age',ph:'25',val:age,set:setAge},{label:'Weight (kg)',ph:'75',val:weight,set:setWeight},{label:'Height (cm)',ph:'175',val:height,set:setHeight}].map(f => (
          <div key={f.label}>
            <div style={{ fontSize:'11px', fontWeight:'500', color:'var(--color-text-muted)', marginBottom:'4px' }}>{f.label}</div>
            <input type="number" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} className="input" style={{ marginBottom:0, textAlign:'center' as const, fontSize:'18px', fontWeight:'600', padding:'10px' }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom:'1rem' }}>
        <div style={{ fontSize:'12px', fontWeight:'500', color:'var(--color-text-muted)', marginBottom:'8px' }}>Activity level</div>
        {AL.map(level => (
          <div key={level.value} className="pressable" onClick={() => setActivity(level.value)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'10px', border:`1.5px solid ${activity===level.value?'var(--color-primary)':'var(--color-border)'}`, background:activity===level.value?'var(--color-primary-pale)':'var(--color-surface)', cursor:'pointer', marginBottom:'6px', transition:'all .18s' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:'500', color:activity===level.value?'var(--color-primary)':'var(--color-text)' }}>{level.label}</div>
              <div style={{ fontSize:'11px', color:'var(--color-text-muted)' }}>{level.desc}</div>
            </div>
            <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${activity===level.value?'var(--color-primary)':'var(--color-border)'}`, background:activity===level.value?'var(--color-primary)':'transparent', flexShrink:0 }} />
          </div>
        ))}
      </div>
      <button className="pressable" onClick={calculate} disabled={!sex||!age||!weight||!height||!activity} style={{ width:'100%', padding:'13px', background:(!sex||!age||!weight||!height||!activity)?'var(--color-border)':'var(--color-primary)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600', cursor:(!sex||!age||!weight||!height||!activity)?'not-allowed':'pointer', fontFamily:'inherit', marginBottom:'8px' }}>Calculate →</button>
      <button className="pressable" onClick={onCancel} style={{ width:'100%', padding:'10px', background:'transparent', border:'none', fontSize:'13px', color:'var(--color-text-muted)', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
    </div>
  )
}

function PasswordChangeForm({ onDone }: { onDone: ()=>void }) {
  const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  async function handleChange() {
    if (pw.length < 8) { setErr('Password must be at least 8 characters'); return }
    if (pw !== confirm) { setErr('Passwords do not match'); return }
    setLoading(true); setErr(''); setMsg('')
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setMsg('Password updated!'); setTimeout(() => onDone(), 1500)
    } catch (e: any) { setErr(e.message||'Error updating password') }
    setLoading(false)
  }
  return (
    <div>
      <SL>New password</SL>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" className="input" style={{ marginBottom:'1rem' }} />
      <SL>Confirm new password</SL>
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" className="input" style={{ marginBottom:'1rem' }} />
      {err && <div style={{ fontSize:'13px', color:'var(--color-red)', marginBottom:'8px', textAlign:'center' as const }}>{err}</div>}
      {msg && <div style={{ fontSize:'13px', color:'var(--color-primary)', marginBottom:'8px', textAlign:'center' as const }}>{msg}</div>}
      <button className="pressable" onClick={handleChange} disabled={loading} style={{ width:'100%', padding:'13px', background:loading?'var(--color-border)':'var(--color-primary)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600', cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', marginBottom:'8px' }}>{loading?'Updating...':'Update password'}</button>
      <button className="pressable" onClick={onDone} style={{ width:'100%', padding:'10px', background:'transparent', border:'none', fontSize:'13px', color:'var(--color-text-muted)', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
    </div>
  )
}

export default function MainApp({ user, profile, onProfileUpdate }: any) {
  const { theme, toggle: toggleTheme } = useTheme()
  const COACH_NAME = 'Sage'

  const [tab, setTab] = useState('home')
  const [tabKey, setTabKey] = useState(0)
  // Date-based planning — activeDate is YYYY-MM-DD
  const [activeDate, setActiveDate] = useState(todayKey())
  const [meals, setMeals] = useState<Record<string,any>>({}) // keyed by date string
  const [servings, setServings] = useState(profile?.default_servings||2)
  const [mealDays, setMealDays] = useState(1) // how many days to repeat the meal
  const [grocery, setGrocery] = useState<any[]>([])
  const [foodLog, setFoodLog] = useState<any[]>([])
  const [waterLog, setWaterLog] = useState<Record<string,number>>({})
  const [waterToday, setWaterToday] = useState(0)
  const [weightLog, setWeightLog] = useState<any[]>([])
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [savedRecipes, setSavedRecipes] = useState<any[]>([])
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [actModalOpen, setActModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState<string|null>(null)

  const [mealSuggestions, setMealSuggestions] = useState<any[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [mealFilters, setMealFilters] = useState({ time:null as string|null, diff:null as string|null, rtype:[] as string[], cuisine:null as string|null })
  const [avoidInput, setAvoidInput] = useState('')
  const [savedToast, setSavedToast] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const [foodMealTime, setFoodMealTime] = useState('breakfast')
  const [logLoading, setLogLoading] = useState(false)
  const [logResult, setLogResult] = useState<any>(null)
  const foodNameRef = useRef<HTMLInputElement>(null)
  const foodPortionRef = useRef<HTMLInputElement>(null)

  const [actType, setActType] = useState<string|null>(null)
  const [actBurnPreview, setActBurnPreview] = useState<number|null>(null)
  const actDurRef = useRef<HTMLInputElement>(null)

  const [waterGoal] = useState(profile?.water_goal || 2500)
  const [weightInput, setWeightInput] = useState('')
  const [weightGoal] = useState(profile?.weight_goal || null)

  const [editProfile, setEditProfile] = useState<any>({ ...profile })
  const [avatar, setAvatar] = useState(profile?.avatar || '🥗')
  const [profileSubPage, setProfileSubPage] = useState<string|null>(null)
  const [calViewOffset, setCalViewOffset] = useState(0) // 0 = current month, -1 = last month
  const [editUsername, setEditUsername] = useState(profile?.username || user?.email?.split('@')[0] || '')
  const [editPhone, setEditPhone] = useState(profile?.phone || '')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMsg, setAccountMsg] = useState('')

  function activeDateLabel() {
    const d = new Date(activeDate + 'T12:00:00')
    const today = todayKey()
    const tomorrow = dateKey(new Date(Date.now() + 86400000))
    if (activeDate === today) return 'Today'
    if (activeDate === tomorrow) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
  }

  useEffect(() => { loadAll() }, [activeDate])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [chatHistory])

  async function loadAll() { await Promise.all([loadMeals(),loadGrocery(),loadFoodLog(),loadWater(),loadWeight(),loadActivity(),loadSavedRecipes()]) }
  async function loadMeals() {
    try {
      // Load meals for the next 30 days using date as key
      const data = await getMeals(user.id, todayKey())
      const map: Record<string,any> = {}
      data.forEach((m: any) => { map[m.plan_date || m.logged_date || m.day_index] = {...m, desc:m.description} })
      setMeals(map)
    } catch(e) { console.error(e) }
  }
  async function loadGrocery() { try { setGrocery(await getGroceryItems(user.id, activeDate)||[]) } catch(e){console.error(e)} }
  async function loadFoodLog() { try { setFoodLog(await getFoodLog(user.id, todayKey())||[]) } catch(e){console.error(e)} }
  async function loadWater() {
    try {
      const data=await getWaterLog(user.id,dateKey(new Date(Date.now()-365*86400000)))
      const map:Record<string,number>={}; data.forEach((w:any)=>{map[w.logged_date]=w.amount})
      setWaterLog(map); setWaterToday(map[todayKey()]||0)
    } catch(e){console.error(e)}
  }
  async function loadWeight() { try { setWeightLog(await getWeightLog(user.id)||[]) } catch(e){console.error(e)} }
  async function loadActivity() { try { setActivityLog(await getActivityLog(user.id,todayKey())||[]) } catch(e){console.error(e)} }
  async function loadSavedRecipes() { try { setSavedRecipes(await getSavedRecipes(user.id)||[]) } catch(e){console.error(e)} }

  function switchTab(t:string) { if(t===tab)return; setTab(t); setTabKey(k=>k+1); if(t!=='profile') setProfileSubPage(null) }
  function viewAllMeals() { setShowSaved(false); switchTab('meals') }

  async function selectMeal(meal: any) {
    try {
      for (let d = 0; d < mealDays; d++) {
        const targetDate = new Date(activeDate + 'T12:00:00')
        targetDate.setDate(targetDate.getDate() + d)
        const dk = dateKey(targetDate)
        await saveMeal(user.id, dk, 0, { ...meal, servings, plan_date: dk })
      }
      await loadMeals()
      setMealModalOpen(false)
      setMealSuggestions([])
    } catch(e) { console.error(e) }
  }

  async function getSuggestions() {
    setSuggestLoading(true); setMealSuggestions([])
    try {
      const res=await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        profile,
        filters:{diet:profile.diet,allergies:profile.allergies,goal:profile.goal,budget:profile.budget,recipeType:mealFilters.rtype,time:mealFilters.time,difficulty:mealFilters.diff,cuisine:mealFilters.cuisine},
        avoid:avoidInput, servings, mealDays,
      })})
      const data=await res.json(); setMealSuggestions(data.meals||[])
    } catch(e){console.error(e)}
    setSuggestLoading(false)
  }
  async function handleSaveRecipe(meal:any) { try { await saveRecipe(user.id,meal); await loadSavedRecipes(); setSavedToast(true); setTimeout(()=>setSavedToast(false),2500) } catch(e){console.error(e)} }
  async function addToGrocery(targetDate: string) {
    const meal=meals[targetDate]; if(!meal?.ingredients)return
    const scale=servings/2
    const items=meal.ingredients.map((ing:any)=>{ let qty=ing.qty; const m=qty.match(/^([\d.]+)(.*)/); if(m)qty=Math.round(parseFloat(m[1])*scale*10)/10+m[2]; return{name:ing.name,qty,section:ing.section,checked:false} })
    try { await saveGroceryItems(user.id,activeDate,[...grocery.filter((g:any)=>!items.find((i:any)=>i.name===g.name)),...items]); await loadGrocery(); switchTab('grocery') } catch(e){console.error(e)}
  }
  async function logFood() {
    const name=foodNameRef.current?.value?.trim(); const portion=foodPortionRef.current?.value?.trim()
    if(!name)return; setLogLoading(true); setLogResult(null)
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
  const goalReached=waterToday>=waterGoal
  async function updateWater(amount:number) {
    if(goalReached)return
    const n=Math.max(0,Math.min(waterToday+amount,waterGoal)); setWaterToday(n)
    try { await saveWaterLog(user.id,todayKey(),Math.round(n),waterGoal); await loadWater() } catch(e){console.error(e)}
  }
  async function setWaterGlass(idx:number) {
    if(goalReached)return
    const filled=Math.round((waterToday/waterGoal)*5)
    const n=idx<filled ? Math.min((idx/5)*waterGoal,waterGoal) : Math.min(((idx+1)/5)*waterGoal,waterGoal)
    setWaterToday(n); try { await saveWaterLog(user.id,todayKey(),Math.round(n),waterGoal); await loadWater() } catch(e){console.error(e)}
  }
  async function logWeight() {
    const val=parseFloat(weightInput); if(!val||val<20||val>300)return
    try { await saveWeightLog(user.id,todayKey(),val); await loadWeight(); setWeightInput('') } catch(e){console.error(e)}
  }
  async function logActivity() {
    const dur=parseInt(actDurRef.current?.value||'0'); if(!actType||!dur)return
    const act=ACTIVITIES.find(a=>a.value===actType); const burned=Math.round((act?.burn||6)*dur)
    try { await addActivityLog(user.id,todayKey(),{type:actType,label:act?.label||actType,duration:dur,burned}); await loadActivity(); setActModalOpen(false); setActType(null); setActBurnPreview(null); if(actDurRef.current)actDurRef.current.value='' } catch(e){console.error(e)}
  }
  async function toggleItem(id:string,checked:boolean) { try { await toggleGroceryItem(user.id,id,!checked); await loadGrocery() } catch(e){console.error(e)} }
  async function sendChat() {
    if(!chatInput.trim()||chatLoading)return
    const msg=chatInput.trim(); setChatInput('')
    const newHistory=[...chatHistory,{role:'user',content:msg}]
    setChatHistory(newHistory); setChatLoading(true)
    try {
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:newHistory,profile,mealSummary:Object.entries(meals).map(([i,m]:any)=>`${DAYS[i]}: ${m.name}`).join(', ')})})
      const data=await res.json(); setChatHistory([...newHistory,{role:'assistant',content:data.reply}])
    } catch(e){console.error(e)}
    setChatLoading(false)
  }
  async function saveEditedProfile() { try { const u=await saveProfile(user.id,{...editProfile,avatar}); onProfileUpdate(u); setEditModalOpen(null) } catch(e){console.error(e)} }
  async function saveAccountDetails() {
    setAccountSaving(true); setAccountMsg('')
    try { const u=await saveProfile(user.id,{...profile,username:editUsername,phone:editPhone}); onProfileUpdate(u); setAccountMsg('Saved!'); setTimeout(()=>setAccountMsg(''),2000) } catch(e){setAccountMsg('Error saving')}
    setAccountSaving(false)
  }

  // Computed
  const todayMeal=meals[activeDate]
  const plannedCount=Object.keys(meals).length
  const tgt=profile?.tdee||TARGET[profile?.goal]||2000
  const loggedCals=foodLog.reduce((a:number,x:any)=>a+(x.calories||0),0)
  const totalIn=(todayMeal?.macros?.calories||0)+loggedCals
  const totalBurned=activityLog.reduce((a:number,x:any)=>a+(x.burned||0),0)
  const netCals=totalIn-totalBurned
  const waterPct=Math.min(waterToday/waterGoal,1)
  const filledGlasses=Math.min(5,Math.round(waterPct*5))
  const latestWeight=weightLog[weightLog.length-1]
  const prevWeight=weightLog[weightLog.length-2]
  const weightChange=latestWeight&&prevWeight ? Math.round((latestWeight.value-prevWeight.value)*10)/10 : null
  const displayName=profile?.username||user?.email?.split('@')[0]||'there'

  function calcStreak() {
    let streak=0; const todayMet=waterToday>=waterGoal
    for(let i=todayMet?0:1;i<365;i++) {
      const d=new Date(); d.setDate(d.getDate()-i)
      const val=i===0?waterToday:(waterLog[dateKey(d)]||0)
      if(val>=waterGoal)streak++; else break
    }
    return streak
  }
  const waterStreak=calcStreak()

  // Shared styles
  const btnPrimary = (disabled=false) => ({ width:'100%', padding:'13px', background:disabled?'var(--color-border)':'var(--color-primary)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600' as const, cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'8px' })
  const btnGhost = () => ({ width:'100%', padding:'10px', background:'transparent', border:'none', fontSize:'13px', color:'var(--color-text-muted)', cursor:'pointer', fontFamily:'inherit' })

  function renderHome() {
    return <Dashboard key={tabKey} user={user} profile={{...profile,tdee:tgt}} meals={meals} foodLog={foodLog} activityLog={activityLog} waterToday={waterToday} waterGoal={waterGoal} waterStreak={waterStreak} weightLog={weightLog} activeDate={activeDate} activeDateLabel={activeDateLabel()} onAddMeal={()=>{setMealModalOpen(true);setMealSuggestions([])}} onLogFood={()=>{setLogResult(null);setLogModalOpen(true)}} onLogActivity={()=>setActModalOpen(true)} onAddWater={updateWater} onSwitchTab={switchTab} onViewAllMeals={viewAllMeals} onGoToProfile={()=>switchTab('profile')} avatarEmoji={profile?.avatar||avatar||'🥗'} />
  }

  function renderMeals() {
    return (
      <div key={tabKey} className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>
        <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
          <div className={`chip pressable ${!showSaved?'active-green':''}`} onClick={()=>setShowSaved(false)}><i className="ti ti-calendar-week" style={{fontSize:'13px',marginRight:'4px'}}/>This week</div>
          <div className={`chip pressable ${showSaved?'active-green':''}`} onClick={()=>setShowSaved(true)}>
            <i className="ti ti-heart" style={{fontSize:'13px',marginRight:'4px'}}/>Saved
            {savedRecipes.length>0&&<span style={{background:'var(--color-primary)',color:'#fff',borderRadius:'50%',padding:'1px 6px',fontSize:'10px',marginLeft:'4px'}}>{savedRecipes.length}</span>}
          </div>
        </div>
        {showSaved ? (
          !savedRecipes.length ? (
            <div className="empty-state">
              <img src="/images/empty-saved.png" alt="" style={{width:'120px',height:'auto',marginBottom:'12px',opacity:0.85}}/>
              <div className="empty-title">No saved recipes yet</div>
              <div className="empty-desc">When Planify suggests a meal you love, tap the heart to save it here.</div>
            </div>
          ) : savedRecipes.map((recipe:any)=>(
            <div key={recipe.id} className="card anim-fade-slide" style={{marginBottom:'10px',position:'relative' as const}}>
              <div style={{position:'absolute' as const,top:'12px',right:'12px'}}>❤️</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:'600',marginBottom:'4px',paddingRight:'32px'}}>{recipe.name}</div>
              <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginBottom:'8px'}}>{recipe.description}</div>
              {recipe.macros&&<div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>{[{val:recipe.macros.calories,label:'kcal',color:'var(--color-amber)'},{val:recipe.macros.protein+'g',label:'protein',color:'var(--color-primary)'},{val:recipe.macros.carbs+'g',label:'carbs',color:'var(--color-blue)'},{val:recipe.macros.fat+'g',label:'fat',color:'var(--color-purple)'}].map(m=>(<div key={m.label} className="macro-card"><div className="macro-val" style={{color:m.color}}>{m.val}</div><div className="macro-label">{m.label}</div></div>))}</div>}
              <div style={{display:'flex',gap:'8px'}}>
                <button className="pressable" onClick={async()=>{await selectMeal({...recipe,desc:recipe.description});setShowSaved(false)}} style={{flex:1,padding:'9px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:'10px',fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>Add to {activeDateLabel()} →</button>
                <button className="pressable" onClick={async()=>{await deleteSavedRecipe(user.id,recipe.id);await loadSavedRecipes()}} style={{padding:'9px 12px',background:'var(--color-red-pale)',color:'var(--color-red)',border:`1px solid var(--color-red-border)`,borderRadius:'10px',fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}><i className="ti ti-trash" style={{fontSize:'14px'}}/></button>
              </div>
            </div>
          ))
        ) : (
          <div>
            {profile?.goal&&<div className="profile-banner"><i className="ti ti-check" style={{fontSize:'16px',color:'var(--color-primary)'}}/><span className="profile-banner-text">Tailored to: <strong>{GL[profile.goal]}</strong>{profile.diet?.length?` · ${profile.diet[0]}`:''} · €{profile.budget}/wk{profile.tdee?` · ${profile.tdee} kcal`:''}</span></div>}
            <div className="overflow-x-auto flex gap-2" style={{marginBottom:'12px'}}>
              {[{id:'all',label:'All'},{id:'quick',label:'Quick',icon:'ti-bolt',type:'time'},{id:'medium',label:'Medium',icon:'ti-clock',type:'time'},{id:'weekend',label:'Weekend',icon:'ti-chef-hat',type:'time'},{id:'easy',label:'Easy',icon:'ti-mood-smile',type:'diff'},{id:'advanced',label:'Advanced',icon:'ti-certificate',type:'diff'}].map(f=>{
                const isActive=f.id==='all'?!mealFilters.time&&!mealFilters.diff:f.type==='time'?mealFilters.time===f.id:mealFilters.diff===f.id
                return <div key={f.id} className={`chip pressable ${isActive?(f.type==='diff'?'active-amber':'active-green'):''}`} onClick={()=>{ if(f.id==='all')setMealFilters(m=>({...m,time:null,diff:null})); else if(f.type==='time')setMealFilters(m=>({...m,time:m.time===f.id?null:f.id})); else setMealFilters(m=>({...m,diff:m.diff===f.id?null:f.id})) }}>{(f as any).icon&&<i className={`ti ${(f as any).icon}`} style={{fontSize:'12px',marginRight:'3px'}}/>}{f.label}</div>
              })}
            </div>
            <SL>{activeDateLabel()}'s meal</SL>
            {todayMeal ? (
              <div className="card anim-scale-in" style={{borderColor:'var(--color-primary-border)',background:'var(--color-primary-pale)',marginBottom:'10px'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:'600',marginBottom:'6px'}}>{todayMeal.name}</div>
                <div style={{marginBottom:'8px'}}>
                  {todayMeal.timeTag&&<span className="tag tag-blue">{todayMeal.timeTag}</span>}
                  {todayMeal.diffTag&&<span className="tag tag-amber" style={{marginLeft:'4px'}}>{todayMeal.diffTag}</span>}
                </div>
                <div style={{fontSize:'13px',color:'var(--color-text-muted)',lineHeight:'1.5',marginBottom:'10px'}}>{todayMeal.description}</div>
                {todayMeal.macros&&<div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>{[{val:todayMeal.macros.calories,label:'kcal',color:'var(--color-amber)'},{val:todayMeal.macros.protein+'g',label:'protein',color:'var(--color-primary)'},{val:todayMeal.macros.carbs+'g',label:'carbs',color:'var(--color-blue)'},{val:todayMeal.macros.fat+'g',label:'fat',color:'var(--color-purple)'}].map(m=>(<div key={m.label} className="macro-card"><div className="macro-val" style={{color:m.color}}>{m.val}</div><div className="macro-label">{m.label}</div></div>))}</div>}
                <div style={{display:'flex',gap:'8px'}}>
                  <button className="pressable" onClick={()=>{setMealModalOpen(true);setMealSuggestions([])}} style={{flex:1,padding:'9px',borderRadius:'10px',border:`1.5px solid var(--color-border)`,background:'var(--color-surface)',fontSize:'12px',fontWeight:'500',color:'var(--color-text-muted)',cursor:'pointer',fontFamily:'inherit'}}>Change meal</button>
                  <button className="pressable" onClick={()=>addToGrocery(activeDate)} style={{flex:1,padding:'9px',borderRadius:'10px',border:'none',background:'var(--color-primary)',fontSize:'12px',fontWeight:'500',color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>Add to grocery →</button>
                </div>
              </div>
            ) : (
              <div className="pressable" onClick={()=>{setMealModalOpen(true);setMealSuggestions([])}} style={{background:'var(--color-surface)',border:`1.5px dashed var(--color-border)`,borderRadius:'16px',padding:'1.25rem',marginBottom:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-plus" style={{fontSize:'18px',color:'var(--color-primary)'}}/></div>
                <span style={{fontSize:'14px',color:'var(--color-text-muted)'}}>Add a meal for {activeDateLabel()}</span>
              </div>
            )}
            {plannedCount<7&&<div style={{background:'var(--color-primary-pale)',borderRadius:'10px',padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px'}}><i className="ti ti-clipboard-list" style={{fontSize:'16px',color:'var(--color-primary)'}}/><span style={{fontSize:'13px',color:'var(--color-primary)'}}>{plannedCount} of 7 days planned</span></div>}
          </div>
        )}
      </div>
    )
  }

  function renderTracker() {
    const rc=netCals>tgt*1.1?'var(--color-red)':netCals>tgt*0.85?'var(--color-primary)':'var(--color-blue)'
    const macroProtein = profile?.protein_target || Math.round(tgt*0.3/4)
    const macroCarbs = profile?.carbs_target || Math.round(tgt*0.4/4)
    const macroFat = profile?.fat_target || Math.round(tgt*0.3/9)
    const loggedProtein = foodLog.reduce((a:number,x:any)=>a+(x.protein||0),0)
    const loggedCarbs = foodLog.reduce((a:number,x:any)=>a+(x.carbs||0),0)
    const loggedFat = foodLog.reduce((a:number,x:any)=>a+(x.fat||0),0)

    // Build meal cal map from current week meals
    const mealCalMap: Record<string,number> = {}
    const mon2 = getMonday()
    DAYS.forEach((_,i)=>{ const d=new Date(mon2); d.setDate(mon2.getDate()+i); if(meals[i]?.macros?.calories) mealCalMap[dateKey(d)]=meals[i].macros.calories })

    return (
      <div key={tabKey} className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>

        {/* Summary strip */}
        <div className="card" style={{background:'var(--color-primary-pale)',borderColor:'var(--color-primary-border)',display:'flex',gap:'10px',marginBottom:'10px'}}>
          {[{val:totalIn,label:'eaten',color:'var(--color-amber)'},{val:totalBurned,label:'burned',color:'var(--color-red)'},{val:Math.max(tgt-netCals,0),label:'remaining',color:rc}].map((item,i)=>(
            <div key={i} style={{flex:1,textAlign:'center' as const}}>
              <div style={{fontSize:'22px',fontWeight:'600',fontFamily:'var(--font-display)',color:item.color,lineHeight:1}}>{item.val}</div>
              <div style={{fontSize:'10px',color:'var(--color-text-muted)',marginTop:'3px',textTransform:'uppercase' as const,letterSpacing:'.05em'}}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Macro bars */}
        <div className="card" style={{marginBottom:'10px'}}>
          <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'10px'}}>Macros today</div>
          {[
            {label:'Protein',logged:loggedProtein,target:macroProtein,color:'var(--color-primary)'},
            {label:'Carbs',logged:loggedCarbs,target:macroCarbs,color:'var(--color-blue)'},
            {label:'Fat',logged:loggedFat,target:macroFat,color:'var(--color-amber)'},
          ].map(m=>{
            const barPct=Math.min((m.logged/Math.max(m.target,1))*100,100)
            const over=m.logged>m.target
            return (
              <div key={m.label} style={{marginBottom:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'12px',color:'var(--color-text-muted)'}}>{m.label}</span>
                  <span style={{fontSize:'12px',fontWeight:'500',color:over?'var(--color-red)':m.color}}>{m.logged}g <span style={{fontWeight:'400',color:'var(--color-text-muted)'}}>/ {m.target}g</span></span>
                </div>
                <div style={{height:'6px',background:'var(--color-border)',borderRadius:'3px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${barPct}%`,background:over?'var(--color-red)':m.color,borderRadius:'3px',transition:'width 0.5s ease'}}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Food log */}
        <div className="card" style={{marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <div style={{fontSize:'13px',fontWeight:'500'}}>🍴 Food log</div>
            <button className="pressable" onClick={()=>{setLogResult(null);setLogModalOpen(true)}} style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontWeight:'500',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'3px'}}><i className="ti ti-plus" style={{fontSize:'13px'}}/>Add food</button>
          </div>
          {!foodLog.length?<div style={{fontSize:'13px',color:'var(--color-text-muted)'}}>Nothing logged yet.</div>:foodLog.map((item:any)=>(
            <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`0.5px solid var(--color-border)`}}>
              <span style={{fontSize:'13px'}}>{item.name}{item.portion?` (${item.portion})`:''}</span>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'12px',fontWeight:'500',color:'var(--color-amber)'}}>{item.calories} kcal</span>
                <button className="pressable" onClick={async()=>{try{await deleteFoodLog(user.id,item.id);await loadFoodLog()}catch(e){}}} style={{background:'none',border:'none',color:'var(--color-text-muted)',cursor:'pointer'}}><i className="ti ti-x" style={{fontSize:'16px'}}/></button>
              </div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="card" style={{marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <div style={{fontSize:'13px',fontWeight:'500'}}>🏃 Activity</div>
            <button className="pressable" onClick={()=>setActModalOpen(true)} style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontWeight:'500',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'3px'}}><i className="ti ti-plus" style={{fontSize:'13px'}}/>Add</button>
          </div>
          {!activityLog.length?<div style={{fontSize:'13px',color:'var(--color-text-muted)'}}>No activity logged.</div>:activityLog.map((item:any)=>{
            const act=ACTIVITIES.find(a=>a.value===item.type)
            return (
              <div key={item.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 0',borderBottom:`0.5px solid var(--color-border)`}}>
                <i className={`ti ${act?.icon||'ti-activity'}`} style={{fontSize:'18px',color:'var(--color-primary)',flexShrink:0}}/>
                <span style={{fontSize:'13px',flex:1}}>{item.label} · {item.duration} min</span>
                <span style={{fontSize:'12px',fontWeight:'500',color:'var(--color-red)'}}>−{item.burned} kcal</span>
                <button className="pressable" onClick={async()=>{try{await deleteActivityLog(user.id,item.id);await loadActivity()}catch(e){}}} style={{background:'none',border:'none',color:'var(--color-text-muted)',cursor:'pointer'}}><i className="ti ti-x" style={{fontSize:'16px'}}/></button>
              </div>
            )
          })}
        </div>

        {/* Navigable single-month calendar */}
        <div className="card">
          {(() => {
            const base = new Date()
            base.setDate(1)
            base.setMonth(base.getMonth() + calViewOffset)
            const yr = base.getFullYear(), mo = base.getMonth()
            const firstDow = new Date(yr, mo, 1).getDay()
            const offset = firstDow === 0 ? 6 : firstDow - 1
            const daysInMo = new Date(yr, mo+1, 0).getDate()
            const mLabel = base.toLocaleString('en-GB',{month:'long',year:'numeric'})
            const now2 = new Date()
            const isCurrentMonth = yr===now2.getFullYear() && mo===now2.getMonth()
            return (
              <>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <button onClick={()=>setCalViewOffset(o=>Math.max(o-1,-2))}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:'var(--color-text-muted)',padding:'4px 8px',borderRadius:'8px',lineHeight:1}}>‹</button>
                  <div style={{fontSize:'12px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em'}}>📅 {mLabel}</div>
                  <button onClick={()=>setCalViewOffset(o=>Math.min(o+1,0))}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:isCurrentMonth?'var(--color-border)':'var(--color-text-muted)',padding:'4px 8px',borderRadius:'8px',lineHeight:1,opacity:isCurrentMonth?0.3:1}}>›</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'4px'}}>
                  {['M','T','W','T','F','S','S'].map((d,i)=>(
                    <div key={i} style={{textAlign:'center' as const,fontSize:'10px',color:'var(--color-text-muted)',fontWeight:'600',padding:'2px 0'}}>{d}</div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px'}}>
                  {Array.from({length:offset},(_,i)=>(<div key={`e${i}`} style={{aspectRatio:'1'}}/>))}
                  {Array.from({length:daysInMo},(_,i)=>{
                    const day=i+1
                    const isToday=day===now2.getDate()&&isCurrentMonth
                    const dk=`${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                    const cals=mealCalMap[dk]||0
                    const hasMeal=cals>0
                    const dotColor=cals>tgt*1.1?'var(--color-red)':cals>tgt*0.85?'var(--color-primary)':'var(--color-blue)'
                    return (
                      <div key={day} style={{aspectRatio:'1',borderRadius:'8px',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',background:isToday?'var(--color-primary)':'transparent'}}>
                        <span style={{fontSize:'11px',fontWeight:isToday?'600':'400',color:isToday?'#fff':hasMeal?'var(--color-text)':'var(--color-text-muted)',lineHeight:1}}>{day}</span>
                        {hasMeal&&!isToday&&<div style={{width:'4px',height:'4px',borderRadius:'50%',background:dotColor,marginTop:'2px'}}/>}
                        {isToday&&hasMeal&&<div style={{width:'4px',height:'4px',borderRadius:'50%',background:'rgba(255,255,255,0.7)',marginTop:'2px'}}/>}
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
    const groups:Record<string,any[]>={}
    grocery.forEach((item:any)=>{if(!groups[item.section])groups[item.section]=[];groups[item.section].push(item)})
    return (
      <div key={tabKey} className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'19px',fontWeight:'600'}}>Grocery list</div>
          {grocery.some((g:any)=>g.checked)&&<button className="pressable" onClick={async()=>{await saveGroceryItems(user.id,activeDate,grocery.filter((g:any)=>!g.checked));await loadGrocery()}} style={{fontSize:'12px',color:'var(--color-text-muted)',background:'none',border:`1px solid var(--color-border)`,borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>Clear done</button>}
        </div>
        {!grocery.length?(
          <div className="empty-state">
            <img src="/images/empty-grocery.png" alt="" style={{width:'120px',height:'auto',marginBottom:'12px',opacity:0.85}}/>
            <div className="empty-title">Your list is empty</div>
            <div className="empty-desc">Add meals and tap "Add to grocery" to build your list.</div>
          </div>
        ):Object.entries(groups).map(([section,items])=>(
          <div key={section} style={{marginBottom:'1rem'}}>
            <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'6px'}}>{section}</div>
            {items.map((item:any)=>(
              <div key={item.id} className="pressable" onClick={()=>toggleItem(item.id,item.checked)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'var(--color-surface)',border:`1px solid var(--color-border)`,borderRadius:'10px',marginBottom:'6px',opacity:item.checked?.45:1,transition:'opacity 0.2s'}}>
                <div style={{width:'20px',height:'20px',borderRadius:'6px',border:`2px solid ${item.checked?'var(--color-primary)':'var(--color-border)'}`,background:item.checked?'var(--color-primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
                  {item.checked&&<i className="ti ti-check" style={{fontSize:'12px',color:'#fff'}}/>}
                </div>
                <span style={{fontSize:'14px',flex:1,textDecoration:item.checked?'line-through':'none'}}>{item.name}</span>
                <span style={{fontSize:'13px',color:'var(--color-text-muted)',fontWeight:'500'}}>{item.qty}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  function renderHealth() {
    const radius=54,stroke=8,circ=2*Math.PI*radius,dash=waterPct*circ
    const ringColor=waterPct>=1?'var(--color-cyan)':waterPct>=.6?'var(--color-blue)':'var(--color-blue-border)'
    return (
      <div key={tabKey} className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:'17px',fontWeight:'600',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
          <i className="ti ti-droplet" style={{fontSize:'18px',color:'var(--color-cyan)'}}/>Water tracker
        </div>
        <div className="anim-scale-in" style={{background:waterStreak===0?'linear-gradient(135deg,#6b7280,#4b5563)':waterStreak>=7?'linear-gradient(135deg,#E74C3C,#E67E22)':'linear-gradient(135deg,#E67E22,#D4833A)',borderRadius:'16px',padding:'1.25rem',marginBottom:'12px',textAlign:'center' as const,color:'#fff',boxShadow:waterStreak>0?'0 4px 20px rgba(230,126,34,0.3)':'none'}}>
          {waterStreak>=7?<img src="/images/streak-celebration.png" alt="" style={{width:'72px',height:'72px',objectFit:'contain',marginBottom:'4px'}}/>:<i className={`ti ti-flame ${waterStreak>=1?'anim-pulse':''}`} style={{fontSize:'40px',display:'block',marginBottom:'4px',color:'#fff'}}/>}
          <div style={{fontFamily:'var(--font-display)',fontSize:'44px',fontWeight:'600',lineHeight:1}}>{waterStreak}</div>
          <div style={{fontSize:'14px',opacity:.85,marginTop:'4px'}}>day streak</div>
          <div style={{fontSize:'12px',opacity:.65,marginTop:'4px'}}>{waterStreak===0?'Hit your goal today to start!':goalReached?'Goal reached! See you tomorrow!':`${waterGoal>=1000?(waterGoal/1000).toFixed(1)+'L':waterGoal+'ml'} daily goal`}</div>
        </div>
        <div style={{textAlign:'center' as const,marginBottom:'12px'}}>
          <div style={{position:'relative',width:'140px',height:'140px',margin:'0 auto 8px'}}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--color-border)" strokeWidth={stroke}/>
              <circle cx="70" cy="70" r={radius} fill="none" stroke={ringColor} strokeWidth={stroke} strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" transform="rotate(-90 70 70)" style={{transition:'stroke-dasharray 0.4s ease'}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'26px',fontWeight:'600',color:'var(--color-cyan)'}}>{waterToday>=1000?(waterToday/1000).toFixed(1)+'L':waterToday+'ml'}</div>
              <div style={{fontSize:'12px',color:'var(--color-text-muted)'}}>{goalReached?'Goal met!':`of ${waterGoal>=1000?(waterGoal/1000).toFixed(1)+'L':waterGoal+'ml'}`}</div>
            </div>
          </div>
          <div style={{fontSize:'13px',color:'var(--color-text-muted)'}}>{Math.round(waterPct*100)}% of daily goal</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',marginBottom:'10px'}}>
          {Array.from({length:5},(_,i)=>(
            <div key={i} className={goalReached?'':'pressable'} onClick={()=>!goalReached&&setWaterGlass(i)} style={{aspectRatio:'1',borderRadius:'10px',border:`1.5px solid ${i<filledGlasses?'var(--color-blue)':'var(--color-blue-border)'}`,background:i<filledGlasses?'var(--color-blue-pale)':'var(--color-surface)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',transition:'all 0.2s',cursor:goalReached?'default':'pointer'}}>
              <i className={`ti ${i<filledGlasses?'ti-droplet-filled':'ti-droplet'}`} style={{fontSize:'20px',color:i<filledGlasses?'var(--color-blue)':'var(--color-blue-border)'}}/>
              <span style={{fontSize:'10px',color:i<filledGlasses?'var(--color-blue)':'var(--color-text-muted)',fontWeight:'500'}}>20%</span>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'6px',marginBottom:'12px',opacity:goalReached?0.4:1}}>
          {[{label:'+150ml',sub:'espresso',ml:150},{label:'+250ml',sub:'glass',ml:250},{label:'+330ml',sub:'can',ml:330},{label:'+500ml',sub:'bottle',ml:500},{label:'−250ml',sub:'undo',ml:-250}].map(b=>(
            <button key={b.ml} disabled={goalReached} onClick={()=>!goalReached&&updateWater(b.ml)} style={{flex:1,padding:'8px 2px',borderRadius:'10px',border:`1.5px solid ${b.ml<0?'var(--color-border)':'var(--color-blue-border)'}`,background:'var(--color-surface)',fontSize:'10px',fontWeight:'500',color:b.ml<0?'var(--color-text-muted)':'var(--color-cyan)',cursor:goalReached?'not-allowed':'pointer',fontFamily:'inherit',lineHeight:'1.5',textAlign:'center' as const}}>
              {b.label}<br/><span style={{fontSize:'9px',opacity:.7}}>{b.sub}</span>
            </button>
          ))}
        </div>
        {goalReached&&<div style={{background:'var(--color-primary-pale)',border:`1px solid var(--color-primary-border)`,borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',textAlign:'center' as const,fontSize:'13px',color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}><i className="ti ti-circle-check" style={{fontSize:'18px'}}/>Goal reached! Locked until tomorrow.</div>}
        <div style={{fontFamily:'var(--font-display)',fontSize:'17px',fontWeight:'600',margin:'1rem 0 10px',display:'flex',alignItems:'center',gap:'8px'}}>
          <i className="ti ti-scale" style={{fontSize:'18px',color:'var(--color-primary)'}}/>Weight tracker
        </div>
        {latestWeight&&(
          <div className="card" style={{marginBottom:'10px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <span style={{fontFamily:'var(--font-display)',fontSize:'32px',fontWeight:'600'}}>{latestWeight.value} <span style={{fontSize:'14px',color:'var(--color-text-muted)',fontFamily:'inherit'}}>kg</span></span>
              {weightChange!==null&&<span style={{fontSize:'13px',fontWeight:'500',padding:'4px 10px',borderRadius:'20px',background:weightChange>0?'var(--color-primary-pale)':'var(--color-red-pale)',color:weightChange>0?'var(--color-primary)':'var(--color-red)'}}>{weightChange>0?'+':''}{weightChange} kg</span>}
            </div>
            {weightGoal&&weightLog[0]&&(
              <div>
                <div style={{height:'6px',background:'var(--color-border)',borderRadius:'3px',overflow:'hidden',marginBottom:'4px'}}>
                  <div style={{height:'100%',background:'var(--color-primary)',borderRadius:'3px',transition:'width 0.6s ease',width:`${Math.min(Math.abs((latestWeight.value-weightLog[0].value)/(weightGoal-weightLog[0].value||1))*100,100)}%`}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--color-primary)',opacity:.8}}><span>{weightLog[0].value} kg start</span><span>{weightGoal} kg goal</span></div>
              </div>
            )}
          </div>
        )}
        <div className="card" style={{marginBottom:'10px'}}>
          <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'10px'}}>Log today's weight</div>
          <div style={{display:'flex',gap:'8px'}}>
            <input type="number" step="0.1" value={weightInput} onChange={e=>setWeightInput(e.target.value)} placeholder={latestWeight?.value?.toString()||'75.0'} className="input" style={{flex:1,fontSize:'18px',fontWeight:'600',textAlign:'center' as const,fontFamily:'var(--font-display)'}}/>
            <button className="pressable" onClick={logWeight} style={{padding:'10px 16px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>Log</button>
          </div>
        </div>
        {weightLog.length>0&&(
          <div className="card">
            <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'10px'}}>Recent entries</div>
            {[...weightLog].reverse().slice(0,7).map((entry:any,i:number,arr:any[])=>{
              const prev=arr[i+1]; const diff=prev?Math.round((entry.value-prev.value)*10)/10:null
              const d=new Date(entry.logged_date+'T12:00:00')
              return (
                <div key={entry.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:`0.5px solid var(--color-border)`}}>
                  <span style={{fontSize:'12px',color:'var(--color-text-muted)'}}>{d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span>
                  <span style={{fontSize:'15px',fontWeight:'600'}}>{entry.value} kg</span>
                  <span style={{fontSize:'12px',fontWeight:'500',color:diff!==null?(diff>0?'var(--color-primary)':'var(--color-red)'):'var(--color-text-muted)'}}>{diff!==null?(diff>0?'+':'')+diff:'—'}</span>
                  <button className="pressable" onClick={async()=>{try{await deleteWeightLog(user.id,entry.id);await loadWeight()}catch(e){}}} style={{background:'none',border:'none',color:'var(--color-text-muted)',cursor:'pointer'}}><i className="ti ti-x" style={{fontSize:'16px'}}/></button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderAssist() {
    return (
      <div key={tabKey} style={{display:'flex',flexDirection:'column',flex:1,height:'100%'}}>
        <div style={{flex:1,overflowY:'auto',padding:'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'10px'}}>
          {!chatHistory.length&&(
            <div className="anim-fade-slide" style={{alignSelf:'flex-start',maxWidth:'85%'}}>
              <div style={{background:'var(--color-surface)',border:`1px solid var(--color-border)`,borderRadius:'16px',borderBottomLeftRadius:'4px',padding:'14px'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-primary-light)',marginBottom:'4px'}}>{COACH_NAME}</div>
                <div style={{fontSize:'13px',lineHeight:'1.6'}}>Hi! I'm {COACH_NAME}, your personal nutrition coach. Ask me anything — meal ideas, macro advice, or anything nutrition-related!{profile?.tdee?` Your daily target is ${profile.tdee} kcal.`:''}</div>
              </div>
            </div>
          )}
          {chatHistory.map((msg:any,i:number)=>(
            <div key={i} className="anim-fade-slide" style={{alignSelf:msg.role==='user'?'flex-end':'flex-start',display:'flex',gap:'10px',alignItems:'flex-start',maxWidth:'85%'}}>
              <div style={{padding:'10px 14px',borderRadius:'16px',fontSize:'13px',lineHeight:'1.6',background:msg.role==='user'?'var(--color-primary)':'var(--color-surface)',color:msg.role==='user'?'#fff':'var(--color-text)',border:msg.role==='user'?'none':`1px solid var(--color-border)`,borderBottomRightRadius:msg.role==='user'?'4px':'16px',borderBottomLeftRadius:msg.role==='user'?'16px':'4px'}}>
                {msg.role==='assistant'&&<div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-primary-light)',marginBottom:'4px'}}>{COACH_NAME}</div>}
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading&&(
            <div className="anim-fade-slide" style={{alignSelf:'flex-start'}}>
              <div style={{background:'var(--color-surface)',border:`1px solid var(--color-border)`,borderRadius:'16px',borderBottomLeftRadius:'4px',padding:'14px'}}>
                <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>
        <div style={{padding:'.75rem 1.25rem 1rem',borderTop:`1px solid var(--color-border)`,display:'flex',gap:'8px',background:'var(--color-surface)'}}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Ask your nutrition coach..." className="input" style={{flex:1,borderRadius:'50px'}}/>
          <button className="pressable" onClick={sendChat} disabled={chatLoading} style={{width:'40px',height:'40px',borderRadius:'50%',background:chatLoading?'var(--color-border)':'var(--color-primary)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="ti ti-send" style={{fontSize:'18px'}}/>
          </button>
        </div>
      </div>
    )
  }

  function renderProfile() {
    if (profileSubPage === 'accountSettings') return renderAccountSettings()
    if (profileSubPage === 'settings') return renderAppSettings()
    if (profileSubPage === 'tdee') return renderTDEEPage()

    return (
      <div key={tabKey} className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>
        {/* Hero */}
        <div style={{textAlign:'center' as const,marginBottom:'1.75rem',paddingTop:'1rem'}}>
          <div className="pressable" onClick={()=>setEditModalOpen('avatar')}
            style={{width:'88px',height:'88px',borderRadius:'50%',background:'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'40px',margin:'0 auto 12px',boxShadow:'0 4px 20px rgba(45,106,79,0.3)',cursor:'pointer',position:'relative' as const}}>
            {profile?.avatar||avatar}
            <div style={{position:'absolute' as const,bottom:2,right:2,width:'24px',height:'24px',borderRadius:'50%',background:'var(--color-surface)',border:`1.5px solid var(--color-border)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-pencil" style={{fontSize:'11px',color:'var(--color-text-muted)'}}/>
            </div>
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'24px',fontWeight:'600',color:'var(--color-text)'}}>{profile?.username||displayName}</div>
        </div>

        {/* Account */}
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'8px'}}>Account</div>
          <div className="card pressable" onClick={()=>setProfileSubPage('accountSettings')}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-user-circle" style={{fontSize:'20px',color:'var(--color-primary)'}}/>
              </div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'500',color:'var(--color-text)'}}>Account settings</div>
                <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'1px'}}>Email, username, phone, password</div>
              </div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:'16px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        {/* Calorie target — own section */}
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'8px'}}>Nutrition</div>
          <div className="card pressable" onClick={()=>setProfileSubPage('tdee')}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-calculator" style={{fontSize:'20px',color:'var(--color-primary)'}}/>
              </div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'500',color:'var(--color-text)'}}>Calorie target</div>
                <div style={{fontSize:'12px',color:'var(--color-primary)',marginTop:'1px'}}>{profile?.tdee?`${profile.tdee} kcal · tap to recalculate`:'Not set — tap to calculate'}</div>
              </div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:'16px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        {/* Diet & goals */}
        {[
          {label:'Diet & allergies',key:'diet',rows:[{k:'Diet',v:profile.diet?.join(', ')||'None'},{k:'Allergies',v:profile.allergies?.join(', ')||'None'}]},
          {label:'Goals & budget',key:'goals',rows:[{k:'Eating goal',v:profile.goal?GL[profile.goal]:'Not set'},{k:'Weekly budget',v:`€${profile.budget}`}]},
        ].map(section=>(
          <div key={section.key} style={{marginBottom:'1.25rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em'}}>{section.label}</div>
              <button className="pressable" onClick={()=>{setEditProfile({...profile});setEditModalOpen(section.key)}}
                style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontWeight:'500',fontFamily:'inherit'}}>
                Edit
              </button>
            </div>
            {section.rows.map(row=>(
              <div key={row.k} className="card" style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',padding:'11px 14px'}}>
                <span style={{fontSize:'13px',color:'var(--color-text-muted)'}}>{row.k}</span>
                <span style={{fontSize:'13px',fontWeight:'500',color:'var(--color-primary)'}}>{row.v}</span>
              </div>
            ))}
          </div>
        ))}

        {/* App / Settings */}
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'8px'}}>App</div>
          <div className="card pressable" onClick={()=>setProfileSubPage('settings')}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'var(--color-surface)',border:`1px solid var(--color-border)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-settings" style={{fontSize:'20px',color:'var(--color-text-muted)'}}/>
              </div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'500',color:'var(--color-text)'}}>Settings</div>
                <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'1px'}}>Theme, notifications</div>
              </div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:'16px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        {/* About */}
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'8px'}}>About</div>
          <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px',padding:'13px 16px'}}>
            <span style={{fontSize:'14px',fontWeight:'500'}}>App version</span>
            <span style={{fontSize:'13px',background:'var(--color-primary-pale)',color:'var(--color-primary)',padding:'3px 10px',borderRadius:'20px',fontWeight:'500'}}>v1.0 beta</span>
          </div>
          <div className="card pressable" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 16px',cursor:'pointer'}}>
            <span style={{fontSize:'14px',fontWeight:'500'}}>Privacy policy</span>
            <i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>
          </div>
        </div>

        <button className="pressable" onClick={()=>supabase.auth.signOut()}
          style={{width:'100%',padding:'13px',background:'var(--color-red)',color:'#fff',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
          Sign out
        </button>
      </div>
    )
  }

  function renderTDEEPage() {
    return (
      <div key="tdee-page" className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'1rem 0 1.25rem',borderBottom:`1px solid var(--color-border-subtle)`,marginBottom:'1.25rem'}}>
          <button className="pressable" onClick={()=>setProfileSubPage(null)}
            style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',color:'var(--color-primary)',fontFamily:'inherit',fontWeight:'500'}}>
            <i className="ti ti-arrow-left" style={{fontSize:'18px'}}/>Back
          </button>
          <div style={{fontFamily:'var(--font-display)',fontSize:'17px',fontWeight:'600'}}>Calorie target</div>
        </div>
        <TDEEInline
          goal={profile?.goal}
          currentTdee={profile?.tdee}
          savedStats={profile?.body_stats}
          onComplete={async(targets:any)=>{
            try{
              const u=await saveProfile(user.id,{...profile,tdee:targets.tdee,protein_target:targets.protein,carbs_target:targets.carbs,fat_target:targets.fat,body_stats:targets.stats})
              onProfileUpdate(u); setProfileSubPage(null)
            }catch(e){console.error(e)}
          }}
          onCancel={()=>setProfileSubPage(null)}
        />
      </div>
    )
  }

  function renderAccountSettings() {
    return (
      <div key="account-settings" className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'1rem 0 1.25rem',borderBottom:`1px solid var(--color-border-subtle)`,marginBottom:'1.25rem'}}>
          <button className="pressable" onClick={()=>setProfileSubPage(null)}
            style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',color:'var(--color-primary)',fontFamily:'inherit',fontWeight:'500'}}>
            <i className="ti ti-arrow-left" style={{fontSize:'18px'}}/>Back
          </button>
          <div style={{fontFamily:'var(--font-display)',fontSize:'17px',fontWeight:'600'}}>Account settings</div>
        </div>
        {[
          {icon:'ti-mail',label:'Email',val:user.email,sub:'Tap to request change',action:'email'},
          {icon:'ti-at',label:'Username',val:profile?.username||displayName,sub:'Your display name',action:'account'},
          {icon:'ti-phone',label:'Phone number',val:profile?.phone||'Not set',sub:'Add a phone number',action:'account'},
          {icon:'ti-lock',label:'Password',val:'••••••••',sub:'Change your password',action:'password'},
        ].map(row=>(
          <div key={row.label} className="card pressable" onClick={()=>setEditModalOpen(row.action)}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px',padding:'14px 16px',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className={`ti ${row.icon}`} style={{fontSize:'18px',color:'var(--color-primary)'}}/>
              </div>
              <div>
                <div style={{fontSize:'13px',fontWeight:'500',color:'var(--color-text)'}}>{row.label}</div>
                <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'1px'}}>{row.val}</div>
              </div>
            </div>
            <i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>
          </div>
        ))}
      </div>
    )
  }

  function renderAppSettings() {
    return (
      <div key="app-settings" className="anim-fade-slide" style={{padding:'0 1.25rem 1rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'1rem 0 1.25rem',borderBottom:`1px solid var(--color-border-subtle)`,marginBottom:'1.25rem'}}>
          <button className="pressable" onClick={()=>setProfileSubPage(null)}
            style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',color:'var(--color-primary)',fontFamily:'inherit',fontWeight:'500'}}>
            <i className="ti ti-arrow-left" style={{fontSize:'18px'}}/>Back
          </button>
          <div style={{fontFamily:'var(--font-display)',fontSize:'17px',fontWeight:'600'}}>Settings</div>
        </div>

        <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'8px'}}>Appearance</div>
        <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',padding:'14px 16px'}}>
          <div>
            <div style={{fontSize:'14px',fontWeight:'500'}}>Dark theme</div>
            <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'2px'}}>Switch between light and dark mode</div>
          </div>
          <ToggleSwitch value={theme==='dark'} onChange={()=>toggleTheme()}/>
        </div>

        <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'8px',marginTop:'1.25rem'}}>Notifications</div>
        <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',padding:'14px 16px'}}>
          <div>
            <div style={{fontSize:'14px',fontWeight:'500'}}>Daily reminders</div>
            <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'2px'}}>Coming soon</div>
          </div>
          <ToggleSwitch value={false} onChange={()=>{}}/>
        </div>
        <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',padding:'14px 16px'}}>
          <div>
            <div style={{fontSize:'14px',fontWeight:'500'}}>Water reminders</div>
            <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'2px'}}>Coming soon</div>
          </div>
          <ToggleSwitch value={false} onChange={()=>{}}/>
        </div>

      </div>
    )
  }

  return (
    <div style={{maxWidth:'420px',margin:'0 auto',minHeight:'100vh',display:'flex',flexDirection:'column',background:'var(--color-bg)',transition:'background var(--transition-slow)'}}>

      {/* Safe-area top spacer */}
      <div style={{height:'env(safe-area-inset-top, 12px)', minHeight:'12px'}}/>

      {/* 30-day date scroller for meals/tracker/grocery */}
      {['meals','tracker','grocery'].includes(tab)&&(
        <div style={{overflowX:'auto',display:'flex',gap:'6px',padding:'.75rem 1.25rem',borderBottom:`1px solid var(--color-border-subtle)`,WebkitOverflowScrolling:'touch' as any}}>
          {Array.from({length:30},(_,i)=>{
            const d=new Date(); d.setDate(d.getDate()+i)
            const dk=dateKey(d)
            const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
            const shortName=dayNames[d.getDay()]
            const isActive=dk===activeDate
            const hasMeal=!!meals[dk]
            return (
              <div key={dk} className={`day-pill pressable ${isActive?'active':''} ${hasMeal?'has-meal':''}`}
                onClick={()=>setActiveDate(dk)}
                style={{flexShrink:0}}>
                <span className="day-name">{i===0?'Today':shortName}</span>
                <span className="day-num">{d.getDate()}</span>
                <span className="day-dot"/>
              </div>
            )
          })}
        </div>
      )}

      {/* Content */}
      <div style={{flex:1,overflowY:tab==='assist'?'hidden':'auto',display:'flex',flexDirection:'column'}}>
        {tab==='home'&&renderHome()}
        {tab==='meals'&&renderMeals()}
        {tab==='tracker'&&renderTracker()}
        {tab==='grocery'&&renderGrocery()}
        {tab==='health'&&renderHealth()}
        {tab==='assist'&&renderAssist()}
        {tab==='profile'&&renderProfile()}
      </div>

      {/* Bottom nav — hidden on profile sub-pages */}
      {!(tab==='profile' && profileSubPage) && (
      <nav className="bottom-nav">
        {TABS.map(t=>{
          const NAV_EMOJI: Record<string,string> = { home:'🏠', meals:'🥗', tracker:'📊', grocery:'🛒', health:'💧', assist:'🤖', profile:'👤' }
          const isActive = tab === t
          return (
            <button key={t} className={`nav-btn pressable ${isActive?'active':''}`} onClick={()=>switchTab(t)}>
              <span style={{fontSize:'22px',lineHeight:1,display:'block',opacity:isActive?1:0.45,transition:'opacity 0.2s'}}>{NAV_EMOJI[t]}</span>
              <span className="nav-label" style={{color:isActive?'var(--color-primary)':'var(--color-text-muted)'}}>{TAB_LABELS[t]}</span>
            </button>
          )
        })}
      </nav>
      )}

      {/* MEAL MODAL */}
      <Modal open={mealModalOpen} onClose={()=>setMealModalOpen(false)} title="Suggest a meal" subtitle={`for ${activeDateLabel()}${profile?.goal?' · '+GL[profile.goal]:''}`}>
        {/* Servings + days controls */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1.25rem',background:'var(--color-bg)',borderRadius:'12px',padding:'12px',border:`1px solid var(--color-border)`}}>
          <div>
            <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:'8px'}}>Persons</div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <button onClick={()=>setServings(s=>Math.max(1,s-1))} style={{width:'30px',height:'30px',borderRadius:'50%',border:`1px solid var(--color-border)`,background:'var(--color-surface)',cursor:'pointer',fontSize:'16px',fontWeight:'600',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text)'}}>−</button>
              <span style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:'600',minWidth:'24px',textAlign:'center' as const}}>{servings}</span>
              <button onClick={()=>setServings(s=>Math.min(12,s+1))} style={{width:'30px',height:'30px',borderRadius:'50%',border:`1px solid var(--color-border)`,background:'var(--color-surface)',cursor:'pointer',fontSize:'16px',fontWeight:'600',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text)'}}>+</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:'11px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:'8px'}}>Plan for days</div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <button onClick={()=>setMealDays(d=>Math.max(1,d-1))} style={{width:'30px',height:'30px',borderRadius:'50%',border:`1px solid var(--color-border)`,background:'var(--color-surface)',cursor:'pointer',fontSize:'16px',fontWeight:'600',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text)'}}>−</button>
              <span style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:'600',minWidth:'24px',textAlign:'center' as const}}>{mealDays}</span>
              <button onClick={()=>setMealDays(d=>Math.min(7,d+1))} style={{width:'30px',height:'30px',borderRadius:'50%',border:`1px solid var(--color-border)`,background:'var(--color-surface)',cursor:'pointer',fontSize:'16px',fontWeight:'600',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text)'}}>+</button>
            </div>
          </div>
        </div>
        {servings > 1 && <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginBottom:'12px',textAlign:'center' as const}}>Ingredients will be scaled for {servings} people{mealDays>1?`, across ${mealDays} days`:''}</div>}
        <SL>Cuisine</SL>
        <div className="overflow-x-auto" style={{display:'flex',gap:'6px',marginBottom:'1rem',paddingBottom:'2px'}}>
          <div className={`chip pressable ${!mealFilters.cuisine?'active-green':''}`} onClick={()=>setMealFilters(f=>({...f,cuisine:null}))}>Any</div>
          {CUISINES.map(c=>(<div key={c.value} className={`chip pressable ${mealFilters.cuisine===c.value?'active-green':''}`} onClick={()=>setMealFilters(f=>({...f,cuisine:f.cuisine===c.value?null:c.value}))}>{c.flag} {c.label}</div>))}
        </div>
        <SL>Recipe type</SL>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
          {[['dinner','🍽️','Dinner'],['bread','🍞','Bread & bakes'],['smoothie','🥤','Vitamin shake'],['snack','🍪','Healthy snack']].map(([v,ic,l])=>(
            <div key={v} className="pressable" onClick={()=>setMealFilters(f=>({...f,rtype:f.rtype.includes(v)?f.rtype.filter(x=>x!==v):[...f.rtype,v]}))} style={{padding:'10px',borderRadius:'10px',border:`1.5px solid ${mealFilters.rtype.includes(v)?'var(--color-primary-light)':'var(--color-border)'}`,background:mealFilters.rtype.includes(v)?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',fontSize:'13px',fontWeight:'500',color:mealFilters.rtype.includes(v)?'var(--color-primary)':'var(--color-text-muted)',textAlign:'center' as const,transition:'all 0.18s'}}>{ic} {l}</div>
          ))}
        </div>
        <SL>Time</SL>
        <div style={{display:'flex',gap:'8px',marginBottom:'1rem'}}>
          {[['quick','ti-bolt','Quick','Under 30 min'],['medium','ti-clock','Medium','30–60 min'],['weekend','ti-chef-hat','Weekend','60+ min']].map(([v,ic,l,sub])=>(
            <div key={v} className="pressable" onClick={()=>setMealFilters(f=>({...f,time:f.time===v?null:v}))} style={{flex:1,padding:'10px 4px',borderRadius:'10px',border:`1.5px solid ${mealFilters.time===v?'var(--color-blue)':'var(--color-border)'}`,background:mealFilters.time===v?'var(--color-blue-pale)':'var(--color-surface)',cursor:'pointer',textAlign:'center' as const,transition:'all 0.18s'}}>
              <i className={`ti ${ic}`} style={{fontSize:'18px',color:mealFilters.time===v?'var(--color-blue)':'var(--color-text-muted)',display:'block',marginBottom:'3px'}}/>
              <div style={{fontSize:'11px',fontWeight:'500',color:mealFilters.time===v?'var(--color-blue)':'var(--color-text-muted)'}}>{l}</div>
              <div style={{fontSize:'10px',color:'var(--color-text-muted)'}}>{sub}</div>
            </div>
          ))}
        </div>
        <SL>Difficulty</SL>
        <div style={{display:'flex',gap:'8px',marginBottom:'1rem'}}>
          {[['easy','ti-mood-smile','Easy'],['medium','ti-mood-wink','Medium'],['advanced','ti-certificate','Advanced']].map(([v,ic,l])=>(
            <div key={v} className="pressable" onClick={()=>setMealFilters(f=>({...f,diff:f.diff===v?null:v}))} style={{flex:1,padding:'10px 4px',borderRadius:'10px',border:`1.5px solid ${mealFilters.diff===v?'var(--color-amber)':'var(--color-border)'}`,background:mealFilters.diff===v?'var(--color-amber-pale)':'var(--color-surface)',cursor:'pointer',textAlign:'center' as const,transition:'all 0.18s'}}>
              <i className={`ti ${ic}`} style={{fontSize:'18px',color:mealFilters.diff===v?'var(--color-amber)':'var(--color-text-muted)',display:'block',marginBottom:'3px'}}/>
              <div style={{fontSize:'11px',fontWeight:'500',color:mealFilters.diff===v?'var(--color-amber)':'var(--color-text-muted)'}}>{l}</div>
            </div>
          ))}
        </div>
        <input value={avoidInput} onChange={e=>setAvoidInput(e.target.value)} placeholder="Anything to avoid?" className="input" style={{marginBottom:'.75rem'}}/>
        {mealSuggestions.map((meal:any,i:number)=>(
          <div key={i} className="anim-fade-slide" style={{background:'var(--color-primary-pale)',border:`1.5px solid var(--color-primary-border)`,borderRadius:'12px',padding:'12px',marginBottom:'8px',position:'relative' as const}}>
            <div className="pressable" onClick={()=>selectMeal(meal)}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'15px',fontWeight:'600',marginBottom:'3px',paddingRight:'32px'}}>{meal.name}</div>
              <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginBottom:'6px'}}>{meal.desc}</div>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap' as const}}>
                {meal.timeTag&&<span className="tag tag-blue">{meal.timeTag}</span>}
                {meal.diffTag&&<span className="tag tag-amber">{meal.diffTag}</span>}
                <span className="tag tag-amber">{meal.macros?.calories} kcal</span>
                <span className="tag tag-green">{meal.macros?.protein}g protein</span>
              </div>
              <div style={{fontSize:'11px',color:'var(--color-primary)',marginTop:'6px',opacity:.7}}>Tap to add to {activeDateLabel()}</div>
            </div>
            <button className="pressable" onClick={async(e)=>{e.stopPropagation();await handleSaveRecipe(meal)}} style={{position:'absolute' as const,top:'10px',right:'10px',background:'none',border:'none',cursor:'pointer',color:'var(--color-text-muted)'}}>
              <i className="ti ti-heart" style={{fontSize:'20px'}}/>
            </button>
          </div>
        ))}
        {mealSuggestions.length>0&&<div style={{fontSize:'12px',color:'var(--color-primary-light)',textAlign:'center' as const,marginBottom:'8px'}}>Tap to add · <i className="ti ti-heart" style={{fontSize:'13px'}}/> to save</div>}
        <button className="pressable" onClick={getSuggestions} disabled={suggestLoading} style={{...btnPrimary(suggestLoading)}}>
          <i className={`ti ${suggestLoading?'ti-loader-2':'ti-sparkles'}`} style={{fontSize:'16px'}}/>{suggestLoading?'Thinking...':mealSuggestions.length?'Suggest again':'Suggest meals'}
        </button>
        <button className="pressable" onClick={()=>setMealModalOpen(false)} style={btnGhost()}>Cancel</button>
      </Modal>

      {/* FOOD LOG MODAL */}
      <Modal open={logModalOpen} onClose={()=>setLogModalOpen(false)} title="Log food" subtitle="Add something you ate or drank today.">
        <SL>Meal time</SL>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
          {[['breakfast','ti-sun','Breakfast'],['lunch','ti-sun-high','Lunch'],['dinner-log','ti-moon','Dinner'],['snack-log','ti-apple','Snack']].map(([v,ic,l])=>(
            <div key={v} className="pressable" onClick={()=>setFoodMealTime(v)} style={{padding:'8px 10px',borderRadius:'50px',border:`1.5px solid ${foodMealTime===v?'var(--color-primary-light)':'var(--color-border)'}`,background:foodMealTime===v?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',fontSize:'12px',fontWeight:'500',color:foodMealTime===v?'var(--color-primary)':'var(--color-text-muted)',textAlign:'center' as const,transition:'all 0.18s',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
              <i className={`ti ${ic}`} style={{fontSize:'14px'}}/>{l}
            </div>
          ))}
        </div>
        <input ref={foodNameRef} placeholder="Food name (e.g. banana, oatmeal)" className="input" style={{marginBottom:'.75rem'}}/>
        <input ref={foodPortionRef} placeholder="Portion (e.g. 1 cup, 100g)" className="input" style={{marginBottom:'.75rem'}}/>
        {logResult&&<div className="anim-scale-in" style={{background:'var(--color-primary-pale)',border:`1px solid var(--color-primary-border)`,borderRadius:'8px',padding:'10px 12px',fontSize:'13px',color:'var(--color-primary)',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'8px'}}><i className="ti ti-circle-check" style={{fontSize:'18px'}}/>Added · {logResult.calories} kcal · {logResult.protein}g protein</div>}
        <button className="pressable" onClick={logFood} disabled={logLoading} style={btnPrimary(logLoading)}>
          <i className={`ti ${logLoading?'ti-loader-2':'ti-search'}`} style={{fontSize:'16px'}}/>{logLoading?'Looking up...':'Look up & add'}
        </button>
        <button className="pressable" onClick={()=>setLogModalOpen(false)} style={btnGhost()}>Cancel</button>
      </Modal>

      {/* ACTIVITY MODAL */}
      <Modal open={actModalOpen} onClose={()=>setActModalOpen(false)} title="Log activity" subtitle="Add exercise to track calories burned.">
        <SL>Activity type</SL>
        <div style={{position:'relative' as const,marginBottom:'1rem'}}>
          <select value={actType||''} onChange={e=>{const val=e.target.value;setActType(val||null);const dur=parseInt(actDurRef.current?.value||'0');if(val&&dur){const act=ACTIVITIES.find(a=>a.value===val);setActBurnPreview(Math.round((act?.burn||6)*dur))}else setActBurnPreview(null)}} style={{width:'100%',padding:'12px 40px 12px 14px',borderRadius:'12px',border:`1.5px solid ${actType?'var(--color-primary-light)':'var(--color-border)'}`,background:actType?'var(--color-primary-pale)':'var(--color-surface)',fontSize:'14px',color:actType?'var(--color-primary)':'var(--color-text-muted)',fontFamily:'inherit',outline:'none',appearance:'none' as const,cursor:'pointer'}}>
            <option value="">Select an activity...</option>
            {ACTIVITIES.map(a=><option key={a.value} value={a.value}>{a.label} (~{a.burn} kcal/min)</option>)}
          </select>
          <i className="ti ti-chevron-down" style={{position:'absolute' as const,right:'14px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',color:'var(--color-text-muted)',pointerEvents:'none' as const}}/>
        </div>
        {actType&&<div className="anim-scale-in" style={{background:'var(--color-primary-pale)',border:`1px solid var(--color-primary-border)`,borderRadius:'10px',padding:'10px 14px',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'10px'}}><i className={`ti ${ACTIVITIES.find(a=>a.value===actType)?.icon||'ti-activity'}`} style={{fontSize:'24px',color:'var(--color-primary)'}}/><div><div style={{fontSize:'13px',fontWeight:'500',color:'var(--color-primary)'}}>{ACTIVITIES.find(a=>a.value===actType)?.label}</div><div style={{fontSize:'12px',color:'var(--color-text-muted)'}}>~{ACTIVITIES.find(a=>a.value===actType)?.burn} kcal/min</div></div></div>}
        <input ref={actDurRef} type="number" placeholder="Duration in minutes (e.g. 45)" onChange={e=>{const dur=parseInt(e.target.value||'0');if(actType&&dur){const act=ACTIVITIES.find(a=>a.value===actType);setActBurnPreview(Math.round((act?.burn||6)*dur))}else setActBurnPreview(null)}} className="input" style={{marginBottom:'.75rem'}}/>
        {actBurnPreview!==null&&<div className="anim-scale-in" style={{background:'var(--color-red-pale)',border:`1px solid var(--color-red-border)`,borderRadius:'8px',padding:'8px 12px',fontSize:'13px',color:'var(--color-red)',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'8px'}}><i className="ti ti-flame" style={{fontSize:'16px'}}/>Estimated burn: ~{actBurnPreview} kcal</div>}
        <button className="pressable" onClick={logActivity} disabled={!actType} style={btnPrimary(!actType)}><i className="ti ti-check" style={{fontSize:'16px'}}/>Add activity</button>
        <button className="pressable" onClick={()=>setActModalOpen(false)} style={btnGhost()}>Cancel</button>
      </Modal>

      {/* AVATAR MODAL */}
      <Modal open={editModalOpen==='avatar'} onClose={()=>setEditModalOpen(null)} title="Choose your avatar">
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px',marginBottom:'1rem'}}>
          {AVATARS.map(a=>(<div key={a} className="pressable" onClick={()=>setAvatar(a)} style={{width:'52px',height:'52px',borderRadius:'50%',background:avatar===a?'var(--color-primary-pale)':'var(--color-bg)',border:`2px solid ${avatar===a?'var(--color-primary)':'var(--color-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',cursor:'pointer',transition:'all 0.18s',margin:'0 auto'}}>{a}</div>))}
        </div>
        <button className="pressable" onClick={async()=>{try{const u=await saveProfile(user.id,{...profile,avatar});onProfileUpdate(u);setEditModalOpen(null)}catch(e){}}} style={btnPrimary()}>Save avatar</button>
        <button className="pressable" onClick={()=>setEditModalOpen(null)} style={btnGhost()}>Cancel</button>
      </Modal>

      {/* ACCOUNT MODAL */}
      <Modal open={editModalOpen==='account'} onClose={()=>setEditModalOpen(null)} title="Account details" subtitle="Update your username and phone number.">
        <SL>Username</SL>
        <input value={editUsername} onChange={e=>setEditUsername(e.target.value)} placeholder="Your display name" className="input" style={{marginBottom:'1rem'}}/>
        <SL>Phone number</SL>
        <input value={editPhone} onChange={e=>setEditPhone(e.target.value)} placeholder="+36 XX XXX XXXX" type="tel" className="input" style={{marginBottom:'1rem'}}/>
        {accountMsg&&<div style={{fontSize:'13px',color:accountMsg==='Saved!'?'var(--color-primary)':'var(--color-red)',marginBottom:'8px',textAlign:'center' as const}}>{accountMsg}</div>}
        <button className="pressable" onClick={saveAccountDetails} disabled={accountSaving} style={btnPrimary(accountSaving)}>{accountSaving?'Saving...':'Save changes'}</button>
        <button className="pressable" onClick={()=>setEditModalOpen(null)} style={btnGhost()}>Cancel</button>
      </Modal>

      {/* EMAIL MODAL */}
      <Modal open={editModalOpen==='email'} onClose={()=>setEditModalOpen(null)} title="Change email" subtitle="Email change requires confirmation.">
        <div style={{background:'var(--color-amber-pale)',border:`1px solid var(--color-amber-border)`,borderRadius:'10px',padding:'12px 14px',marginBottom:'1rem',fontSize:'13px',color:'var(--color-amber)',display:'flex',alignItems:'flex-start',gap:'8px'}}>
          <i className="ti ti-info-circle" style={{fontSize:'16px',flexShrink:0,marginTop:'1px'}}/>
          <span>Email change with confirmation link is coming in the next update.</span>
        </div>
        <div className="card" style={{padding:'11px 14px',marginBottom:'1rem'}}><div style={{fontSize:'12px',color:'var(--color-text-muted)',marginBottom:'2px'}}>Current email</div><div style={{fontSize:'14px',fontWeight:'500'}}>{user.email}</div></div>
        <button className="pressable" onClick={()=>setEditModalOpen(null)} style={btnPrimary()}>Got it</button>
      </Modal>

      {/* PASSWORD MODAL */}
      <Modal open={editModalOpen==='password'} onClose={()=>setEditModalOpen(null)} title="Change password" subtitle="Enter a new password for your account.">
        <PasswordChangeForm onDone={()=>setEditModalOpen(null)}/>
      </Modal>

      {/* DIET MODAL */}
      <Modal open={editModalOpen==='diet'} onClose={()=>setEditModalOpen(null)} title="Diet & allergies">
        <SL>Diet</SL>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
          {DIETS.map(v=>(<div key={v} className="pressable" onClick={()=>setEditProfile((p:any)=>({...p,diet:p.diet?.includes(v)?p.diet.filter((x:string)=>x!==v):[...(p.diet||[]),v]}))} style={{padding:'12px',borderRadius:'10px',border:`1.5px solid ${editProfile.diet?.includes(v)?'var(--color-primary-light)':'var(--color-border)'}`,background:editProfile.diet?.includes(v)?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',fontSize:'13px',fontWeight:'500',color:editProfile.diet?.includes(v)?'var(--color-primary)':'var(--color-text-muted)',textAlign:'center' as const,transition:'all 0.18s'}}>{DIET_ICONS[v]} {v.charAt(0).toUpperCase()+v.slice(1)}</div>))}
        </div>
        <SL>Allergies</SL>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1.25rem'}}>
          {ALLERGIES.map(v=>(<div key={v} className="pressable" onClick={()=>setEditProfile((p:any)=>({...p,allergies:p.allergies?.includes(v)?p.allergies.filter((x:string)=>x!==v):[...(p.allergies||[]),v]}))} style={{padding:'12px',borderRadius:'10px',border:`1.5px solid ${editProfile.allergies?.includes(v)?'var(--color-primary-light)':'var(--color-border)'}`,background:editProfile.allergies?.includes(v)?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',fontSize:'13px',fontWeight:'500',color:editProfile.allergies?.includes(v)?'var(--color-primary)':'var(--color-text-muted)',textAlign:'center' as const,transition:'all 0.18s'}}>{ALLERGY_ICONS[v]} {v.charAt(0).toUpperCase()+v.slice(1)}</div>))}
        </div>
        <button className="pressable" onClick={saveEditedProfile} style={btnPrimary()}>Save changes</button>
        <button className="pressable" onClick={()=>setEditModalOpen(null)} style={btnGhost()}>Cancel</button>
      </Modal>

      {/* GOALS MODAL */}
      <Modal open={editModalOpen==='goals'} onClose={()=>setEditModalOpen(null)} title="Goals & budget">
        <SL>Eating goal</SL>
        {GOALS.map(g=>(<div key={g.value} className="pressable" onClick={()=>setEditProfile((p:any)=>({...p,goal:g.value}))} style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 14px',borderRadius:'12px',border:`1.5px solid ${editProfile.goal===g.value?'var(--color-primary-light)':'var(--color-border)'}`,background:editProfile.goal===g.value?'var(--color-primary-pale)':'var(--color-surface)',cursor:'pointer',marginBottom:'8px',transition:'all 0.18s'}}>
          <span style={{fontSize:'22px'}}>{g.icon}</span>
          <div style={{flex:1}}><div style={{fontSize:'14px',fontWeight:'500',color:editProfile.goal===g.value?'var(--color-primary)':'var(--color-text)'}}>{g.label}</div><div style={{fontSize:'12px',color:'var(--color-text-muted)',marginTop:'2px'}}>{g.desc}</div></div>
          <div style={{width:'18px',height:'18px',borderRadius:'50%',border:`2px solid ${editProfile.goal===g.value?'var(--color-primary)':'var(--color-border)'}`,background:editProfile.goal===g.value?'var(--color-primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s'}}>
            {editProfile.goal===g.value&&<div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#fff'}}/>}
          </div>
        </div>))}
        <SL>Weekly budget</SL>
        <div style={{textAlign:'center' as const,margin:'.5rem 0'}}><div style={{fontFamily:'var(--font-display)',fontSize:'40px',fontWeight:'600',color:'var(--color-primary)'}}>€{editProfile.budget}</div></div>
        <input type="range" min="10" max="200" step="5" value={editProfile.budget} onChange={e=>setEditProfile((p:any)=>({...p,budget:parseInt(e.target.value)}))} style={{width:'100%',accentColor:'var(--color-primary)',margin:'.5rem 0 1.25rem'}}/>
        <button className="pressable" onClick={saveEditedProfile} style={btnPrimary()}>Save changes</button>
        <button className="pressable" onClick={()=>setEditModalOpen(null)} style={btnGhost()}>Cancel</button>
      </Modal>

      {/* TDEE MODAL */}
      <Modal open={editModalOpen==='tdee'} onClose={()=>setEditModalOpen(null)} title="Recalculate calorie target" subtitle="Update your daily targets based on current stats.">
        <TDEEInline goal={profile?.goal} currentTdee={profile?.tdee} onComplete={async(targets:any)=>{try{const u=await saveProfile(user.id,{...profile,tdee:targets.tdee,protein_target:targets.protein,carbs_target:targets.carbs,fat_target:targets.fat});onProfileUpdate(u);setEditModalOpen(null)}catch(e){console.error(e)}}} onCancel={()=>setEditModalOpen(null)}/>
      </Modal>

      {/* SAVED TOAST */}
      {savedToast&&(
        <div style={{position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',background:'var(--color-primary)',color:'#fff',padding:'10px 20px',borderRadius:'50px',fontSize:'13px',fontWeight:'500',zIndex:999,whiteSpace:'nowrap',boxShadow:'var(--shadow-md)',animation:'fadeSlideUp 0.3s ease',display:'flex',alignItems:'center',gap:'8px'}}>
          <i className="ti ti-heart-filled" style={{fontSize:'16px'}}/>Recipe saved!
        </div>
      )}
    </div>
  )
}