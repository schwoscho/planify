'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { saveProfile } from '@/lib/auth'
import {
  saveMeal, getMeals, deleteMeal,
  addFoodLog, getFoodLog, deleteFoodLog,
  saveWaterLog, getWaterLog,
  saveWeightLog, getWeightLog, deleteWeightLog,
  addActivityLog, getActivityLog, deleteActivityLog,
  saveGroceryItems, getGroceryItems, toggleGroceryItem,
} from '@/lib/db'
import Dashboard from './Dashboard'
import Modal from './Modal'

// ── CONSTANTS ──
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GL: Record<string, string> = { bulk: 'Bulking 💪', cut: 'Cutting 🔥', maintain: 'Balanced ⚖️', energy: 'Energy ⚡', gut: 'Gut health 🌿' }
const TARGET: Record<string, number> = { bulk: 2700, cut: 1750, maintain: 2000, energy: 2000, gut: 1900 }
const ACT_BURNS: Record<string, number> = { running: 10, cycling: 7, gym: 6, swimming: 9, walking: 4, yoga: 3, hiit: 11, other: 6 }
const ACT_ICONS: Record<string, string> = { running: '🏃', cycling: '🚴', gym: '🏋️', swimming: '🏊', walking: '🚶', yoga: '🧘', hiit: '🔥', other: '⚡' }
const ACT_LABELS: Record<string, string> = { running: 'Running', cycling: 'Cycling', gym: 'Gym / weights', swimming: 'Swimming', walking: 'Walking', yoga: 'Yoga', hiit: 'HIIT', other: 'Activity' }
const TABS = ['home', 'meals', 'tracker', 'grocery', 'health', 'assist', 'profile']
const TAB_ICONS: Record<string, string> = { home: '🏠', meals: '🥗', tracker: '📊', grocery: '🛒', health: '💧', assist: '🤖', profile: '👤' }
const TAB_LABELS: Record<string, string> = { home: 'Home', meals: 'Meals', tracker: 'Tracker', grocery: 'Grocery', health: 'Health', assist: 'Coach', profile: 'Profile' }
const AVATARS = ['🥗', '💪', '🔥', '⚡', '🌿', '🏃', '🥑', '👑', '🌟', '🎯']

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayKey() { return dateKey(new Date()) }
function todayDayIndex() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

// ── THEME HOOK ──
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const stored = localStorage.getItem('planify-theme')
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initial = (stored as 'light' | 'dark') || preferred
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])
  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('planify-theme', next)
  }
  return { theme, toggle }
}

// ── TOGGLE SWITCH ──
function ToggleSwitch({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} className="pressable"
      style={{ width: '44px', height: '26px', borderRadius: '13px', background: value ? 'var(--color-primary)' : 'var(--color-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: value ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </div>
  )
}

// ── SECTION LABEL ──
function SL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>{children}</div>
}

export default function MainApp({ user, profile, onProfileUpdate }: any) {
  const monday = getMonday()
  const weekStart = dateKey(monday)
  const { theme, toggle: toggleTheme } = useTheme()

  // ── STATE ──
  const [tab, setTab] = useState('home')
  const [tabKey, setTabKey] = useState(0)
  const [activeDay, setActiveDay] = useState(todayDayIndex())
  const [meals, setMeals] = useState<Record<number, any>>({})
  const [grocery, setGrocery] = useState<any[]>([])
  const [foodLog, setFoodLog] = useState<any[]>([])
  const [waterLog, setWaterLog] = useState<Record<string, number>>({})
  const [waterToday, setWaterToday] = useState(0)
  const [weightLog, setWeightLog] = useState<any[]>([])
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Modal states — all stable, never remount
  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [actModalOpen, setActModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState<string | null>(null)

  // Meal modal state
  const [mealSuggestions, setMealSuggestions] = useState<any[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [mealFilters, setMealFilters] = useState({ time: null as string | null, diff: null as string | null, rtype: [] as string[], prefs: [] as string[] })
  const avoidRef = useRef('')
  const [avoidInput, setAvoidInput] = useState('')

  // Food log modal state — using refs to prevent re-render keyboard close
  const [foodMealTime, setFoodMealTime] = useState('breakfast')
  const [logLoading, setLogLoading] = useState(false)
  const [logResult, setLogResult] = useState<any>(null)
  const foodNameRef = useRef<HTMLInputElement>(null)
  const foodPortionRef = useRef<HTMLInputElement>(null)

  // Activity modal state
  const [actType, setActType] = useState<string | null>(null)
  const actDurRef = useRef<HTMLInputElement>(null)
  const [actBurnPreview, setActBurnPreview] = useState<number | null>(null)

  // Health state
  const [waterGoal, setWaterGoal] = useState(profile?.water_goal || 2500)
  const [weightInput, setWeightInput] = useState('')
  const [weightGoal, setWeightGoal] = useState(profile?.weight_goal || 75)

  // Profile state
  const [editProfile, setEditProfile] = useState<any>({ ...profile })
  const [avatar, setAvatar] = useState(profile?.avatar || '🥗')

  // ── LOAD DATA ──
  useEffect(() => { loadAll() }, [activeDay])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  async function loadAll() {
    await Promise.all([loadMeals(), loadGrocery(), loadFoodLog(), loadWater(), loadWeight(), loadActivity()])
  }
  async function loadMeals() {
    try { const data = await getMeals(user.id, weekStart); const map: Record<number, any> = {}; data.forEach((m: any) => { map[m.day_index] = { ...m, desc: m.description } }); setMeals(map) } catch (e) { console.error(e) }
  }
  async function loadGrocery() {
    try { setGrocery(await getGroceryItems(user.id, weekStart) || []) } catch (e) { console.error(e) }
  }
  async function loadFoodLog() {
    try { setFoodLog(await getFoodLog(user.id, todayKey()) || []) } catch (e) { console.error(e) }
  }
  async function loadWater() {
    try {
      const data = await getWaterLog(user.id, dateKey(new Date(Date.now() - 13 * 86400000)))
      const map: Record<string, number> = {}
      data.forEach((w: any) => { map[w.logged_date] = w.amount })
      setWaterLog(map)
      // Check if today's stored date matches local today
      const storedToday = map[todayKey()] || 0
      setWaterToday(storedToday)
    } catch (e) { console.error(e) }
  }
  async function loadWeight() {
    try { setWeightLog(await getWeightLog(user.id) || []) } catch (e) { console.error(e) }
  }
  async function loadActivity() {
    try { setActivityLog(await getActivityLog(user.id, todayKey()) || []) } catch (e) { console.error(e) }
  }

  // ── TAB SWITCHING ──
  function switchTab(newTab: string) {
    if (newTab === tab) return
    setTab(newTab)
    setTabKey(k => k + 1)
  }

  // ── MEALS ──
  async function getSuggestions() {
    setSuggestLoading(true)
    setMealSuggestions([])
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, filters: { diet: profile.diet, allergies: profile.allergies, goal: profile.goal, budget: profile.budget, recipeType: mealFilters.rtype, time: mealFilters.time, difficulty: mealFilters.diff, prefs: mealFilters.prefs }, avoid: avoidInput }),
      })
      const data = await res.json()
      setMealSuggestions(data.meals || [])
    } catch (e) { console.error(e) }
    setSuggestLoading(false)
  }

  async function selectMeal(meal: any) {
    try { await saveMeal(user.id, weekStart, activeDay, meal); await loadMeals(); setMealModalOpen(false); setMealSuggestions([]) } catch (e) { console.error(e) }
  }

  async function addToGrocery(dayIndex: number) {
    const meal = meals[dayIndex]
    if (!meal?.ingredients) return
    const scale = (meal.servings || 2) / 2
    const items = meal.ingredients.map((ing: any) => {
      let qty = ing.qty; const m = qty.match(/^([\d.]+)(.*)/); if (m) qty = Math.round(parseFloat(m[1]) * scale * 10) / 10 + m[2]
      return { name: ing.name, qty, section: ing.section, checked: false }
    })
    try { await saveGroceryItems(user.id, weekStart, [...grocery.filter((g: any) => !items.find((i: any) => i.name === g.name)), ...items]); await loadGrocery(); switchTab('grocery') } catch (e) { console.error(e) }
  }

  // ── FOOD LOG ──
  async function logFood() {
    const name = foodNameRef.current?.value?.trim()
    const portion = foodPortionRef.current?.value?.trim()
    if (!name) return
    setLogLoading(true)
    setLogResult(null)
    try {
      const res = await fetch('/api/foodlookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, portion }) })
      const data = await res.json()
      await addFoodLog(user.id, { date: todayKey(), mealTime: foodMealTime, name, portion, ...data.macros })
      await loadFoodLog()
      setLogResult(data.macros)
      if (foodNameRef.current) foodNameRef.current.value = ''
      if (foodPortionRef.current) foodPortionRef.current.value = ''
    } catch (e) { console.error(e) }
    setLogLoading(false)
  }

  // ── WATER ──
  const goalReached = waterToday >= waterGoal

  async function updateWater(amount: number) {
    if (goalReached && amount > 0) return // locked when goal reached
    if (goalReached && amount < 0) return // also lock removing when goal reached
    const newAmount = Math.max(0, Math.min(waterToday + amount, waterGoal))
    setWaterToday(newAmount)
    try { await saveWaterLog(user.id, todayKey(), Math.round(newAmount), waterGoal); await loadWater() } catch (e) { console.error(e) }
  }

  async function setWaterGlass(idx: number) {
    if (goalReached) return // locked
    const filled = Math.round((waterToday / waterGoal) * 5)
    const newAmount = Math.min(idx < filled ? (idx / 5) * waterGoal : ((idx + 1) / 5) * waterGoal, waterGoal)
    setWaterToday(newAmount)
    try { await saveWaterLog(user.id, todayKey(), Math.round(newAmount), waterGoal); await loadWater() } catch (e) { console.error(e) }
  }

  // ── WEIGHT ──
  async function logWeight() {
    const val = parseFloat(weightInput)
    if (!val || val < 20 || val > 300) return
    try { await saveWeightLog(user.id, todayKey(), val); await loadWeight(); setWeightInput('') } catch (e) { console.error(e) }
  }

  // ── ACTIVITY ──
  async function logActivity() {
    const dur = parseInt(actDurRef.current?.value || '0')
    if (!actType || !dur) return
    const burned = Math.round((ACT_BURNS[actType] || 6) * dur)
    try {
      await addActivityLog(user.id, todayKey(), { type: actType, label: ACT_LABELS[actType], duration: dur, burned })
      await loadActivity()
      setActModalOpen(false)
      setActType(null)
      if (actDurRef.current) actDurRef.current.value = ''
      setActBurnPreview(null)
    } catch (e) { console.error(e) }
  }

  // ── GROCERY ──
  async function toggleItem(id: string, checked: boolean) {
    try { await toggleGroceryItem(user.id, id, !checked); await loadGrocery() } catch (e) { console.error(e) }
  }

  // ── CHAT ──
  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    const newHistory = [...chatHistory, { role: 'user', content: msg }]
    setChatHistory(newHistory)
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newHistory, profile, mealSummary: Object.entries(meals).map(([i, m]: any) => `${DAYS[i]}: ${m.name}`).join(', ') }) })
      const data = await res.json()
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply }])
    } catch (e) { console.error(e) }
    setChatLoading(false)
  }

  // ── PROFILE ──
  async function saveEditedProfile() {
    try { const updated = await saveProfile(user.id, { ...editProfile, avatar }); onProfileUpdate(updated); setEditModalOpen(null) } catch (e) { console.error(e) }
  }

  // ── COMPUTED ──
  const todayMeal = meals[activeDay]
  const plannedCount = Object.keys(meals).length
  const tgt = TARGET[profile?.goal] || 2000
  const mealCals = todayMeal?.macros?.calories || 0
  const loggedCals = foodLog.reduce((a: number, x: any) => a + (x.calories || 0), 0)
  const totalIn = mealCals + loggedCals
  const totalBurned = activityLog.reduce((a: number, x: any) => a + (x.burned || 0), 0)
  const netCals = totalIn - totalBurned
  const waterPct = Math.min(waterToday / waterGoal, 1)
  const filledGlasses = Math.min(5, Math.round(waterPct * 5))
  const latestWeight = weightLog[weightLog.length - 1]
  const prevWeight = weightLog[weightLog.length - 2]
  const weightChange = latestWeight && prevWeight ? Math.round((latestWeight.value - prevWeight.value) * 10) / 10 : null

  function calcStreak() {
    let streak = 0
    const todayMet = waterToday >= waterGoal
    for (let i = todayMet ? 0 : 1; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const val = i === 0 ? waterToday : (waterLog[dateKey(d)] || 0)
      if (val >= waterGoal) streak++
      else break
    }
    return streak
  }
  const waterStreak = calcStreak()
  const displayName = user?.email?.split('@')[0] || 'there'

  // ── RENDER TABS ──
  function renderHome() {
    return (
      <Dashboard
        key={tabKey}
        user={user}
        profile={profile}
        meals={meals}
        foodLog={foodLog}
        activityLog={activityLog}
        waterToday={waterToday}
        waterGoal={waterGoal}
        waterStreak={waterStreak}
        weightLog={weightLog}
        activeDay={activeDay}
        onAddMeal={() => setMealModalOpen(true)}
        onLogFood={() => { setLogResult(null); setLogModalOpen(true) }}
        onLogActivity={() => setActModalOpen(true)}
        onAddWater={updateWater}
        onSwitchTab={switchTab}
      />
    )
  }

  function renderMeals() {
    return (
      <div key={tabKey} className="anim-fade-slide" style={{ padding: '0 1.25rem 1rem' }}>
        {profile?.goal && (
          <div className="profile-banner">
            <span style={{ fontSize: '16px' }}>✓</span>
            <span className="profile-banner-text">Tailored to: <strong>{GL[profile.goal]}</strong>{profile.diet?.length ? ` · ${profile.diet[0]}` : ''} · €{profile.budget}/wk</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="overflow-x-auto flex gap-2" style={{ marginBottom: '12px' }}>
          {[{ id: 'all', label: 'All' }, { id: 'quick', label: '⚡ Quick', type: 'time' }, { id: 'medium', label: '🕐 Medium', type: 'time' }, { id: 'weekend', label: '👨‍🍳 Weekend', type: 'time' }, { id: 'easy', label: '😊 Easy', type: 'diff' }, { id: 'medium-d', label: '🤔 Medium', type: 'diff' }, { id: 'advanced', label: '🎓 Advanced', type: 'diff' }].map(f => {
            const isActive = f.id === 'all' ? !mealFilters.time && !mealFilters.diff : f.type === 'time' ? mealFilters.time === f.id : mealFilters.diff === f.id.replace('-d', '')
            return (
              <div key={f.id} className={`chip pressable ${isActive ? (f.type === 'diff' ? 'active-amber' : 'active-green') : ''}`}
                onClick={() => {
                  if (f.id === 'all') setMealFilters(m => ({ ...m, time: null, diff: null }))
                  else if (f.type === 'time') setMealFilters(m => ({ ...m, time: m.time === f.id ? null : f.id }))
                  else setMealFilters(m => ({ ...m, diff: m.diff === f.id.replace('-d', '') ? null : f.id.replace('-d', '') }))
                }}>
                {f.label}
              </div>
            )
          })}
        </div>

        <SL>{DAYS[activeDay]}'s meal</SL>

        {todayMeal ? (
          <div className="card anim-scale-in" style={{ borderColor: 'var(--color-primary-border)', background: 'var(--color-primary-pale)', marginBottom: '10px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '600', marginBottom: '6px' }}>{todayMeal.name}</div>
            <div style={{ marginBottom: '8px' }}>
              {todayMeal.timeTag && <span className="tag tag-blue">{todayMeal.timeTag}</span>}
              {todayMeal.diffTag && <span className="tag tag-amber" style={{ marginLeft: '4px' }}>{todayMeal.diffTag}</span>}
              {(todayMeal.tags || []).map((t: string) => <span key={t} className="tag tag-green" style={{ marginLeft: '4px' }}>{t}</span>)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5', marginBottom: '10px' }}>{todayMeal.description}</div>
            {todayMeal.macros && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                {[{ val: todayMeal.macros.calories, label: 'kcal', color: 'var(--color-amber)' }, { val: todayMeal.macros.protein + 'g', label: 'protein', color: 'var(--color-primary)' }, { val: todayMeal.macros.carbs + 'g', label: 'carbs', color: 'var(--color-blue)' }, { val: todayMeal.macros.fat + 'g', label: 'fat', color: 'var(--color-purple)' }].map(m => (
                  <div key={m.label} className="macro-card"><div className="macro-val" style={{ color: m.color }}>{m.val}</div><div className="macro-label">{m.label}</div></div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="pressable" onClick={() => { setMealModalOpen(true); setMealSuggestions([]) }} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: `1.5px solid var(--color-border)`, background: 'var(--color-surface)', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Change meal</button>
              <button className="pressable" onClick={() => addToGrocery(activeDay)} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', fontSize: '12px', fontWeight: '500', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Add to grocery →</button>
            </div>
          </div>
        ) : (
          <div className="pressable" onClick={() => { setMealModalOpen(true); setMealSuggestions([]) }}
            style={{ background: 'var(--color-surface)', border: `1.5px dashed var(--color-border)`, borderRadius: '16px', padding: '1.25rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'var(--color-primary)' }}>+</div>
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Add a meal for {DAYS[activeDay]}</span>
          </div>
        )}

        {plannedCount < 7 && (
          <div style={{ background: 'var(--color-primary-pale)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📋</span>
            <span style={{ fontSize: '13px', color: 'var(--color-primary)' }}>{plannedCount} of 7 days planned</span>
          </div>
        )}
      </div>
    )
  }

  function renderTracker() {
    const radius = 28, circ = 2 * Math.PI * radius
    const pct = Math.min(netCals / tgt, 1)
    const rc = netCals > tgt * 1.1 ? 'var(--color-red)' : netCals > tgt * 0.85 ? 'var(--color-primary)' : 'var(--color-blue)'
    return (
      <div key={tabKey} className="anim-fade-slide" style={{ padding: '0 1.25rem 1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: '600', marginBottom: '10px' }}>Today's tracker</div>
        <div className="card" style={{ background: 'var(--color-primary-pale)', borderColor: 'var(--color-primary-border)', display: 'flex', gap: '10px', marginBottom: '10px' }}>
          {[{ val: totalIn, label: 'calories in', color: 'var(--color-amber)' }, { val: totalBurned, label: 'burned', color: 'var(--color-red)' }, { val: netCals, label: 'net kcal', color: rc }].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', fontFamily: 'var(--font-display)', color: item.color }}>{item.val}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
            <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle cx="36" cy="36" r={radius} fill="none" stroke={rc} strokeWidth="6" strokeDasharray={`${(pct * circ).toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" transform="rotate(-90 36 36)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            <text x="36" y="41" textAnchor="middle" fontSize="13" fontWeight="600" fill={rc} fontFamily="sans-serif">{Math.round(pct * 100)}%</text>
          </svg>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>vs daily target</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{netCals} kcal · target {tgt} kcal</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{profile?.goal ? GL[profile.goal] : 'Set a goal'}</div>
          </div>
        </div>
        {/* Food log */}
        <div className="card" style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Food log</div>
            <button className="pressable" onClick={() => { setLogResult(null); setLogModalOpen(true) }} style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', fontFamily: 'inherit' }}>+ Add food</button>
          </div>
          {!foodLog.length ? <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Nothing logged yet.</div> : foodLog.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `0.5px solid var(--color-border)` }}>
              <span style={{ fontSize: '13px' }}>{item.name}{item.portion ? ` (${item.portion})` : ''}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-amber)' }}>{item.calories} kcal</span>
                <button className="pressable" onClick={async () => { try { await deleteFoodLog(user.id, item.id); await loadFoodLog() } catch(e){} }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
              </div>
            </div>
          ))}
        </div>
        {/* Activity */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Activity</div>
            <button className="pressable" onClick={() => setActModalOpen(true)} style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', fontFamily: 'inherit' }}>+ Add</button>
          </div>
          {!activityLog.length ? <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No activity logged.</div> : activityLog.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: `0.5px solid var(--color-border)` }}>
              <span style={{ fontSize: '18px' }}>{ACT_ICONS[item.type] || '⚡'}</span>
              <span style={{ fontSize: '13px', flex: 1 }}>{item.label} · {item.duration} min</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-red)' }}>−{item.burned} kcal</span>
              <button className="pressable" onClick={async () => { try { await deleteActivityLog(user.id, item.id); await loadActivity() } catch(e){} }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderGrocery() {
    const groups: Record<string, any[]> = {}
    grocery.forEach((item: any) => { if (!groups[item.section]) groups[item.section] = []; groups[item.section].push(item) })
    return (
      <div key={tabKey} className="anim-fade-slide" style={{ padding: '0 1.25rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: '600' }}>Grocery list</div>
          {grocery.some((g: any) => g.checked) && (
            <button className="pressable" onClick={async () => { await saveGroceryItems(user.id, weekStart, grocery.filter((g: any) => !g.checked)); await loadGrocery() }} style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: `1px solid var(--color-border)`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Clear done</button>
          )}
        </div>
        {!grocery.length ? (
          <div className="empty-state"><div className="empty-icon">🛒</div><div className="empty-title">Your list is empty</div><div className="empty-desc">Add meals and tap "Add to grocery"</div></div>
        ) : Object.entries(groups).map(([section, items]) => (
          <div key={section} style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>{section}</div>
            {items.map((item: any) => (
              <div key={item.id} className="pressable" onClick={() => toggleItem(item.id, item.checked)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--color-surface)', border: `1px solid var(--color-border)`, borderRadius: '10px', marginBottom: '6px', opacity: item.checked ? .45 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${item.checked ? 'var(--color-primary)' : 'var(--color-border)'}`, background: item.checked ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                  {item.checked && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                </div>
                <span style={{ fontSize: '14px', flex: 1, textDecoration: item.checked ? 'line-through' : 'none', transition: 'all 0.2s' }}>{item.name}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>{item.qty}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  function renderHealth() {
    const radius = 54, stroke = 8, circ = 2 * Math.PI * radius
    const dash = waterPct * circ
    const ringColor = waterPct >= 1 ? 'var(--color-cyan)' : waterPct >= .6 ? 'var(--color-blue)' : 'var(--color-blue-border)'
    const streak = waterStreak

    return (
      <div key={tabKey} className="anim-fade-slide" style={{ padding: '0 1.25rem 1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>💧 Water tracker</div>

        {/* Streak */}
        <div className="anim-scale-in" style={{ background: streak === 0 ? 'linear-gradient(135deg,#6b7280,#4b5563)' : streak >= 7 ? 'linear-gradient(135deg,#E74C3C,#E67E22)' : 'linear-gradient(135deg,#E67E22,#D4833A)', borderRadius: '16px', padding: '1.25rem', marginBottom: '12px', textAlign: 'center' as const, color: '#fff', boxShadow: streak > 0 ? '0 4px 20px rgba(230,126,34,0.3)' : 'none' }}>
          <div className={streak >= 1 ? 'anim-pulse' : ''} style={{ fontSize: '40px', marginBottom: '4px' }}>{streak >= 1 ? '🔥' : '💤'}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '44px', fontWeight: '600', lineHeight: 1 }}>{streak}</div>
          <div style={{ fontSize: '14px', opacity: .85, marginTop: '4px' }}>day streak</div>
          <div style={{ fontSize: '12px', opacity: .65, marginTop: '4px' }}>
            {streak === 0 ? 'Hit your goal today to start!' : goalReached ? '🎉 Goal reached! See you tomorrow!' : `${waterGoal >= 1000 ? (waterGoal / 1000).toFixed(1) + 'L' : waterGoal + 'ml'} daily goal`}
          </div>
        </div>

        {/* Ring */}
        <div style={{ textAlign: 'center' as const, marginBottom: '12px' }}>
          <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 8px' }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
              <circle cx="70" cy="70" r={radius} fill="none" stroke={ringColor} strokeWidth={stroke} strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 0.4s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '600', color: 'var(--color-cyan)' }}>{waterToday >= 1000 ? (waterToday / 1000).toFixed(1) + 'L' : waterToday + 'ml'}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{goalReached ? '✅ Goal met!' : `of ${waterGoal >= 1000 ? (waterGoal / 1000).toFixed(1) + 'L' : waterGoal + 'ml'}`}</div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{Math.round(waterPct * 100)}% of daily goal</div>
        </div>

        {/* 5 glasses (each = 20%) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginBottom: '10px' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={goalReached ? '' : 'pressable'} onClick={() => !goalReached && setWaterGlass(i)}
              style={{ aspectRatio: '1', borderRadius: '10px', border: `1.5px solid ${i < filledGlasses ? 'var(--color-blue)' : 'var(--color-blue-border)'}`, background: i < filledGlasses ? 'var(--color-blue-pale)' : 'var(--color-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '20px', gap: '3px', transition: 'all 0.2s', opacity: goalReached ? 0.8 : 1 }}>
              {i < filledGlasses ? '💧' : <span style={{ color: 'var(--color-blue-border)', fontSize: '18px' }}>○</span>}
              <span style={{ fontSize: '10px', color: i < filledGlasses ? 'var(--color-blue)' : 'var(--color-text-muted)', fontWeight: '500' }}>20%</span>
            </div>
          ))}
        </div>

        {/* Quick add — disabled when goal reached */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', opacity: goalReached ? 0.4 : 1 }}>
          {[{ label: '+150ml', sub: 'espresso', ml: 150 }, { label: '+250ml', sub: 'glass', ml: 250 }, { label: '+330ml', sub: 'can', ml: 330 }, { label: '+500ml', sub: 'bottle', ml: 500 }, { label: '−250ml', sub: 'undo', ml: -250 }].map(b => (
            <button key={b.ml} className={goalReached ? '' : 'pressable'} onClick={() => !goalReached && updateWater(b.ml)} disabled={goalReached}
              style={{ flex: 1, padding: '8px 2px', borderRadius: '10px', border: `1.5px solid ${b.ml < 0 ? 'var(--color-border)' : 'var(--color-blue-border)'}`, background: 'var(--color-surface)', fontSize: '10px', fontWeight: '500', color: b.ml < 0 ? 'var(--color-text-muted)' : 'var(--color-cyan)', cursor: goalReached ? 'not-allowed' : 'pointer', fontFamily: 'inherit', lineHeight: '1.5', textAlign: 'center' as const }}>
              {b.label}<br /><span style={{ fontSize: '9px', opacity: .7 }}>{b.sub}</span>
            </button>
          ))}
        </div>

        {goalReached && (
          <div className="anim-scale-in" style={{ background: 'var(--color-primary-pale)', border: `1px solid var(--color-primary-border)`, borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', textAlign: 'center' as const, fontSize: '13px', color: 'var(--color-primary)' }}>
            🎉 Goal reached! Water logging locked until tomorrow midnight.
          </div>
        )}

        {/* Weight tracker */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '600', margin: '1rem 0 10px' }}>⚖️ Weight tracker</div>

        {latestWeight && (
          <div className="card" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '600' }}>{latestWeight.value} <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>kg</span></span>
              {weightChange !== null && <span style={{ fontSize: '13px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px', background: weightChange > 0 ? 'var(--color-primary-pale)' : 'var(--color-red-pale)', color: weightChange > 0 ? 'var(--color-primary)' : 'var(--color-red)' }}>{weightChange > 0 ? '+' : ''}{weightChange} kg</span>}
            </div>
            {weightGoal && weightLog[0] && (
              <div>
                <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ height: '100%', background: 'var(--color-primary)', borderRadius: '3px', transition: 'width 0.6s ease', width: `${Math.min(Math.abs((latestWeight.value - weightLog[0].value) / (weightGoal - weightLog[0].value || 1)) * 100, 100)}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-primary)', opacity: .8 }}>
                  <span>{weightLog[0].value} kg start</span><span>{weightGoal} kg goal</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card" style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px' }}>Log today's weight</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="number" step="0.1" value={weightInput} onChange={e => setWeightInput(e.target.value)}
              placeholder={latestWeight?.value?.toString() || '75.0'}
              className="input" style={{ flex: 1, fontSize: '18px', fontWeight: '600', textAlign: 'center' as const, fontFamily: 'var(--font-display)' }} />
            <button className="pressable" onClick={logWeight} style={{ padding: '10px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Log</button>
          </div>
        </div>

        {weightLog.length > 0 && (
          <div className="card">
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px' }}>Recent entries</div>
            {[...weightLog].reverse().slice(0, 7).map((entry: any, i: number, arr: any[]) => {
              const prev = arr[i + 1]; const diff = prev ? Math.round((entry.value - prev.value) * 10) / 10 : null
              const d = new Date(entry.logged_date + 'T12:00:00')
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `0.5px solid var(--color-border)` }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>{entry.value} kg</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: diff !== null ? (diff > 0 ? 'var(--color-primary)' : 'var(--color-red)') : 'var(--color-text-muted)' }}>{diff !== null ? (diff > 0 ? '+' : '') + diff : '—'}</span>
                  <button className="pressable" onClick={async () => { try { await deleteWeightLog(user.id, entry.id); await loadWeight() } catch(e){} }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
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
      <div key={tabKey} style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!chatHistory.length && (
            <div className="anim-fade-slide" style={{ background: 'var(--color-surface)', border: `1px solid var(--color-border)`, borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '14px', alignSelf: 'flex-start', maxWidth: '85%', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-pale)', border: `1px solid var(--color-primary-border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-primary-light)', marginBottom: '4px' }}>Planify Coach</div>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>Hi! I'm your personal nutrition coach 🥗 Ask me anything — meal ideas, macro advice, whether a food fits your goal, or anything nutrition-related!</div>
              </div>
            </div>
          )}
          {chatHistory.map((msg: any, i: number) => (
            <div key={i} className="anim-fade-slide" style={{ maxWidth: '85%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-pale)', border: `1px solid var(--color-primary-border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
              )}
              <div style={{ padding: '10px 14px', borderRadius: '16px', fontSize: '13px', lineHeight: '1.6', background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)', color: msg.role === 'user' ? '#fff' : 'var(--color-text)', border: msg.role === 'user' ? 'none' : `1px solid var(--color-border)`, borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px', borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px' }}>
                {msg.role === 'assistant' && <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-primary-light)', marginBottom: '4px' }}>Planify Coach</div>}
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="anim-fade-slide" style={{ alignSelf: 'flex-start', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-pale)', border: `1px solid var(--color-primary-border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
              <div style={{ background: 'var(--color-surface)', border: `1px solid var(--color-border)`, borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '14px' }}>
                <div className="loading-dots"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ padding: '.75rem 1.25rem 1rem', borderTop: `1px solid var(--color-border)`, display: 'flex', gap: '8px', background: 'var(--color-surface)' }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
            placeholder="Ask your nutrition coach..." className="input" style={{ flex: 1, borderRadius: '50px' }} />
          <button className="pressable" onClick={sendChat} disabled={chatLoading}
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: chatLoading ? 'var(--color-border)' : 'var(--color-primary)', color: '#fff', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
        </div>
      </div>
    )
  }

  function renderProfile() {
    const currentAvatar = profile?.avatar || avatar || '🥗'
    return (
      <div key={tabKey} className="anim-fade-slide" style={{ padding: '0 1.25rem 1rem' }}>
        {/* Avatar + name */}
        <div style={{ textAlign: 'center' as const, marginBottom: '1.5rem' }}>
          <div className="pressable" onClick={() => setEditModalOpen('avatar')}
            style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 10px', boxShadow: '0 4px 16px rgba(45,106,79,0.3)', cursor: 'pointer', position: 'relative' }}>
            {currentAvatar}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-surface)', border: `1.5px solid var(--color-border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✏️</div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600', color: 'var(--color-text)' }}>{displayName}</div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{user.email}</div>
        </div>

        {/* Account */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Account</div>
          {[{ k: 'Email', v: user.email }, { k: 'Member since', v: new Date(user.created_at || Date.now()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }].map(row => (
            <div key={row.k} className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '11px 14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{row.k}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>{row.v}</span>
            </div>
          ))}
        </div>

        {/* Diet & goals */}
        {[
          { label: 'Diet & allergies', key: 'diet', rows: [{ k: 'Diet', v: profile.diet?.join(', ') || 'None' }, { k: 'Allergies', v: profile.allergies?.join(', ') || 'None' }] },
          { label: 'Goals & budget', key: 'goals', rows: [{ k: 'Eating goal', v: profile.goal ? GL[profile.goal] : 'Not set' }, { k: 'Weekly budget', v: `€${profile.budget}` }] },
        ].map(section => (
          <div key={section.key} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{section.label}</div>
              <button className="pressable" onClick={() => { setEditProfile({ ...profile }); setEditModalOpen(section.key) }} style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', fontFamily: 'inherit' }}>Edit →</button>
            </div>
            {section.rows.map(row => (
              <div key={row.k} className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '11px 14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{row.k}</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-primary)' }}>{row.v}</span>
              </div>
            ))}
          </div>
        ))}

        {/* Settings */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Settings</div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '12px 14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>Dark theme</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '1px' }}>Switch between light and dark</div>
            </div>
            <ToggleSwitch value={theme === 'dark'} onChange={() => toggleTheme()} />
          </div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '12px 14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>Notifications</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '1px' }}>Coming soon</div>
            </div>
            <ToggleSwitch value={false} onChange={() => {}} />
          </div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>App version</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '1px' }}>Planify v1.0.0 (beta)</div>
            </div>
            <span style={{ fontSize: '12px', background: 'var(--color-primary-pale)', color: 'var(--color-primary)', padding: '3px 10px', borderRadius: '20px', fontWeight: '500' }}>Beta</span>
          </div>
        </div>

        <button className="pressable" onClick={() => supabase.auth.signOut()}
          style={{ width: '100%', padding: '13px', background: 'var(--color-red)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>
    )
  }

  // ── MODALS (always mounted, never remount) ──
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

  // ── MAIN RENDER ──
  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', transition: 'background var(--transition-slow)' }}>

      {/* Minimal header */}
      <div style={{ padding: '1rem 1.25rem .75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid var(--color-border-subtle)` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)' }}>
          Plan<span style={{ fontStyle: 'italic', fontWeight: '300' }}>ify</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Notification bell placeholder */}
          <div className="pressable" style={{ width: '34px', height: '34px', borderRadius: '50%', border: `1.5px solid var(--color-border)`, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>🔔</div>
          {/* Avatar */}
          <div className="pressable" onClick={() => switchTab('profile')}
            style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(45,106,79,0.25)' }}>
            {profile?.avatar || avatar || '🥗'}
          </div>
        </div>
      </div>

      {/* Day strip — only for meals/tracker/grocery */}
      {['meals', 'tracker', 'grocery'].includes(tab) && (
        <div className="overflow-x-auto" style={{ display: 'flex', gap: '6px', padding: '.75rem 1.25rem', borderBottom: `1px solid var(--color-border-subtle)` }}>
          {DAYS.map((d, i) => {
            const date = new Date(monday); date.setDate(monday.getDate() + i)
            return (
              <div key={i} className={`day-pill pressable ${i === activeDay ? 'active' : ''} ${meals[i] ? 'has-meal' : ''}`} onClick={() => setActiveDay(i)}>
                <span className="day-name">{d}</span>
                <span className="day-num">{date.getDate()}</span>
                <span className="day-dot" />
              </div>
            )
          })}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: tab === 'assist' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {tab === 'home' && renderHome()}
        {tab === 'meals' && renderMeals()}
        {tab === 'tracker' && renderTracker()}
        {tab === 'grocery' && renderGrocery()}
        {tab === 'health' && renderHealth()}
        {tab === 'assist' && renderAssist()}
        {tab === 'profile' && renderProfile()}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t} className={`nav-btn pressable ${tab === t ? 'active' : ''}`} onClick={() => switchTab(t)}>
            <span className="nav-icon">{TAB_ICONS[t]}</span>
            <span className="nav-label">{TAB_LABELS[t]}</span>
          </button>
        ))}
      </nav>

      {/* ── MEAL MODAL ── */}
      <Modal open={mealModalOpen} onClose={() => setMealModalOpen(false)} title="Suggest a meal" subtitle={`for ${DAYS[activeDay]}${profile?.goal ? ' · ' + GL[profile.goal] : ''}`}>
        <SL>Recipe type</SL>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
          {[['dinner', '🍽️', 'Dinner'], ['bread', '🍞', 'Bread & bakes'], ['smoothie', '🥤', 'Vitamin shake'], ['snack', '🍪', 'Healthy snack']].map(([v, ic, l]) => (
            <div key={v} className="pressable" onClick={() => setMealFilters(f => ({ ...f, rtype: f.rtype.includes(v) ? f.rtype.filter(x => x !== v) : [...f.rtype, v] }))}
              style={{ padding: '10px', borderRadius: '10px', border: `1.5px solid ${mealFilters.rtype.includes(v) ? 'var(--color-primary-light)' : 'var(--color-border)'}`, background: mealFilters.rtype.includes(v) ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: mealFilters.rtype.includes(v) ? 'var(--color-primary)' : 'var(--color-text-muted)', textAlign: 'center' as const, transition: 'all 0.18s' }}>
              {ic} {l}
            </div>
          ))}
        </div>
        <SL>Time to cook</SL>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          {[['quick', '⚡', 'Quick', 'Under 30 min'], ['medium', '🕐', 'Medium', '30–60 min'], ['weekend', '👨‍🍳', 'Weekend', '60+ min']].map(([v, ic, l, sub]) => (
            <div key={v} className="pressable" onClick={() => setMealFilters(f => ({ ...f, time: f.time === v ? null : v }))}
              style={{ flex: 1, padding: '10px 4px', borderRadius: '10px', border: `1.5px solid ${mealFilters.time === v ? 'var(--color-blue)' : 'var(--color-border)'}`, background: mealFilters.time === v ? 'var(--color-blue-pale)' : 'var(--color-surface)', cursor: 'pointer', textAlign: 'center' as const, transition: 'all 0.18s' }}>
              <div style={{ fontSize: '18px' }}>{ic}</div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: mealFilters.time === v ? 'var(--color-blue)' : 'var(--color-text-muted)' }}>{l}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{sub}</div>
            </div>
          ))}
        </div>
        <SL>Difficulty</SL>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          {[['easy', '😊', 'Easy'], ['medium', '🤔', 'Medium'], ['advanced', '🎓', 'Advanced']].map(([v, ic, l]) => (
            <div key={v} className="pressable" onClick={() => setMealFilters(f => ({ ...f, diff: f.diff === v ? null : v }))}
              style={{ flex: 1, padding: '10px 4px', borderRadius: '10px', border: `1.5px solid ${mealFilters.diff === v ? 'var(--color-amber)' : 'var(--color-border)'}`, background: mealFilters.diff === v ? 'var(--color-amber-pale)' : 'var(--color-surface)', cursor: 'pointer', textAlign: 'center' as const, transition: 'all 0.18s' }}>
              <div style={{ fontSize: '18px' }}>{ic}</div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: mealFilters.diff === v ? 'var(--color-amber)' : 'var(--color-text-muted)' }}>{l}</div>
            </div>
          ))}
        </div>
        <input value={avoidInput} onChange={e => setAvoidInput(e.target.value)} placeholder="Anything to avoid?" className="input" style={{ marginBottom: '.75rem' }} />
        {mealSuggestions.map((meal: any, i: number) => (
          <div key={i} className="pressable anim-fade-slide" onClick={() => selectMeal(meal)}
            style={{ background: 'var(--color-primary-pale)', border: `1.5px solid var(--color-primary-border)`, borderRadius: '12px', padding: '12px', marginBottom: '8px', cursor: 'pointer' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '600', marginBottom: '3px' }}>{meal.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{meal.desc}</div>
            <div>
              {meal.timeTag && <span className="tag tag-blue">{meal.timeTag}</span>}
              {meal.diffTag && <span className="tag tag-amber" style={{ marginLeft: '4px' }}>{meal.diffTag}</span>}
              <span className="tag tag-amber" style={{ marginLeft: '4px' }}>{meal.macros?.calories} kcal</span>
              <span className="tag tag-green" style={{ marginLeft: '4px' }}>{meal.macros?.protein}g protein</span>
            </div>
          </div>
        ))}
        {mealSuggestions.length > 0 && <div style={{ fontSize: '12px', color: 'var(--color-primary-light)', textAlign: 'center' as const, marginBottom: '8px' }}>Tap a meal to add it</div>}
        <button className="pressable" onClick={getSuggestions} disabled={suggestLoading}
          style={{ width: '100%', padding: '13px', background: suggestLoading ? 'var(--color-border)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: suggestLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {suggestLoading ? 'Thinking...' : mealSuggestions.length ? '✨ Suggest again' : '✨ Suggest meals'}
        </button>
        <button className="pressable" onClick={() => setMealModalOpen(false)}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>Cancel</button>
      </Modal>

      {/* ── FOOD LOG MODAL ── */}
      <Modal open={logModalOpen} onClose={() => setLogModalOpen(false)} title="Log food" subtitle="Add something you ate or drank today.">
        <SL>Meal time</SL>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
          {[['breakfast', '☀️', 'Breakfast'], ['lunch', '🌤️', 'Lunch'], ['dinner-log', '🌙', 'Dinner'], ['snack-log', '🍎', 'Snack']].map(([v, ic, l]) => (
            <div key={v} className="pressable" onClick={() => setFoodMealTime(v)}
              style={{ padding: '8px 10px', borderRadius: '50px', border: `1.5px solid ${foodMealTime === v ? 'var(--color-primary-light)' : 'var(--color-border)'}`, background: foodMealTime === v ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: foodMealTime === v ? 'var(--color-primary)' : 'var(--color-text-muted)', textAlign: 'center' as const, transition: 'all 0.18s' }}>
              {ic} {l}
            </div>
          ))}
        </div>
        {/* Using refs instead of state to avoid keyboard close */}
        <input ref={foodNameRef} placeholder="Food name (e.g. banana, oatmeal)" className="input" style={{ marginBottom: '.75rem' }} />
        <input ref={foodPortionRef} placeholder="Portion (e.g. 1 cup, 100g)" className="input" style={{ marginBottom: '.75rem' }} />
        {logResult && (
          <div className="anim-scale-in" style={{ background: 'var(--color-primary-pale)', border: `1px solid var(--color-primary-border)`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-primary)', marginBottom: '.75rem' }}>
            ✓ Added · {logResult.calories} kcal · {logResult.protein}g protein · {logResult.carbs}g carbs · {logResult.fat}g fat
          </div>
        )}
        <button className="pressable" onClick={logFood} disabled={logLoading}
          style={{ width: '100%', padding: '13px', background: logLoading ? 'var(--color-border)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: logLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {logLoading ? 'Looking up...' : '🔍 Look up & add'}
        </button>
        <button className="pressable" onClick={() => setLogModalOpen(false)}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>Cancel</button>
      </Modal>

      {/* ── ACTIVITY MODAL ── */}
      <Modal open={actModalOpen} onClose={() => setActModalOpen(false)} title="Log activity" subtitle="Add exercise to track calories burned.">
        <SL>Activity type</SL>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
          {Object.entries(ACT_LABELS).map(([v, l]) => (
            <div key={v} className="pressable" onClick={() => setActType(v)}
              style={{ padding: '10px', borderRadius: '10px', border: `1.5px solid ${actType === v ? 'var(--color-primary-light)' : 'var(--color-border)'}`, background: actType === v ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: actType === v ? 'var(--color-primary)' : 'var(--color-text-muted)', textAlign: 'center' as const, transition: 'all 0.18s' }}>
              {ACT_ICONS[v]} {l}
            </div>
          ))}
        </div>
        <input ref={actDurRef} type="number" placeholder="Duration in minutes (e.g. 45)"
          onChange={e => { const dur = parseInt(e.target.value || '0'); setActBurnPreview(actType ? Math.round((ACT_BURNS[actType] || 6) * dur) : null) }}
          className="input" style={{ marginBottom: '.75rem' }} />
        {actBurnPreview !== null && actType && (
          <div className="anim-scale-in" style={{ background: 'var(--color-red-pale)', border: `1px solid var(--color-red-border)`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--color-red)', marginBottom: '.75rem' }}>
            Estimated burn: ~{actBurnPreview} kcal
          </div>
        )}
        <button className="pressable" onClick={logActivity} disabled={!actType}
          style={{ width: '100%', padding: '13px', background: !actType ? 'var(--color-border)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: !actType ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          Add activity
        </button>
        <button className="pressable" onClick={() => setActModalOpen(false)}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>Cancel</button>
      </Modal>

      {/* ── AVATAR PICKER MODAL ── */}
      <Modal open={editModalOpen === 'avatar'} onClose={() => setEditModalOpen(null)} title="Choose your avatar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '1rem' }}>
          {AVATARS.map(a => (
            <div key={a} className="pressable" onClick={() => setAvatar(a)}
              style={{ width: '52px', height: '52px', borderRadius: '50%', background: avatar === a ? 'var(--color-primary-pale)' : 'var(--color-bg)', border: `2px solid ${avatar === a ? 'var(--color-primary)' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', cursor: 'pointer', transition: 'all 0.18s', margin: '0 auto' }}>
              {a}
            </div>
          ))}
        </div>
        <button className="pressable" onClick={async () => { try { const updated = await saveProfile(user.id, { ...profile, avatar }); onProfileUpdate(updated); setEditModalOpen(null) } catch(e){} }}
          style={{ width: '100%', padding: '13px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Save avatar
        </button>
        <button className="pressable" onClick={() => setEditModalOpen(null)}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>Cancel</button>
      </Modal>

      {/* ── EDIT DIET MODAL ── */}
      <Modal open={editModalOpen === 'diet'} onClose={() => setEditModalOpen(null)} title="Diet & allergies">
        <SL>Diet</SL>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
          {DIETS.map(v => (
            <div key={v} className="pressable" onClick={() => setEditProfile((p: any) => ({ ...p, diet: p.diet?.includes(v) ? p.diet.filter((x: string) => x !== v) : [...(p.diet || []), v] }))}
              style={{ padding: '12px', borderRadius: '10px', border: `1.5px solid ${editProfile.diet?.includes(v) ? 'var(--color-primary-light)' : 'var(--color-border)'}`, background: editProfile.diet?.includes(v) ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: editProfile.diet?.includes(v) ? 'var(--color-primary)' : 'var(--color-text-muted)', textAlign: 'center' as const, transition: 'all 0.18s' }}>
              {DIET_ICONS[v]} {v.charAt(0).toUpperCase() + v.slice(1)}
            </div>
          ))}
        </div>
        <SL>Allergies</SL>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
          {ALLERGIES.map(v => (
            <div key={v} className="pressable" onClick={() => setEditProfile((p: any) => ({ ...p, allergies: p.allergies?.includes(v) ? p.allergies.filter((x: string) => x !== v) : [...(p.allergies || []), v] }))}
              style={{ padding: '12px', borderRadius: '10px', border: `1.5px solid ${editProfile.allergies?.includes(v) ? 'var(--color-primary-light)' : 'var(--color-border)'}`, background: editProfile.allergies?.includes(v) ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: editProfile.allergies?.includes(v) ? 'var(--color-primary)' : 'var(--color-text-muted)', textAlign: 'center' as const, transition: 'all 0.18s' }}>
              {ALLERGY_ICONS[v]} {v.charAt(0).toUpperCase() + v.slice(1)}
            </div>
          ))}
        </div>
        <button className="pressable" onClick={saveEditedProfile}
          style={{ width: '100%', padding: '13px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Save changes</button>
        <button className="pressable" onClick={() => setEditModalOpen(null)}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>Cancel</button>
      </Modal>

      {/* ── EDIT GOALS MODAL ── */}
      <Modal open={editModalOpen === 'goals'} onClose={() => setEditModalOpen(null)} title="Goals & budget">
        <SL>Eating goal</SL>
        {GOALS.map(g => (
          <div key={g.value} className="pressable" onClick={() => setEditProfile((p: any) => ({ ...p, goal: g.value }))}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '12px', border: `1.5px solid ${editProfile.goal === g.value ? 'var(--color-primary-light)' : 'var(--color-border)'}`, background: editProfile.goal === g.value ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', marginBottom: '8px', transition: 'all 0.18s' }}>
            <span style={{ fontSize: '22px' }}>{g.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: editProfile.goal === g.value ? 'var(--color-primary)' : 'var(--color-text)' }}>{g.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{g.desc}</div>
            </div>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${editProfile.goal === g.value ? 'var(--color-primary)' : 'var(--color-border)'}`, background: editProfile.goal === g.value ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
              {editProfile.goal === g.value && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }} />}
            </div>
          </div>
        ))}
        <SL>Weekly budget</SL>
        <div style={{ textAlign: 'center' as const, margin: '.5rem 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: '600', color: 'var(--color-primary)' }}>€{editProfile.budget}</div>
        </div>
        <input type="range" min="10" max="200" step="5" value={editProfile.budget}
          onChange={e => setEditProfile((p: any) => ({ ...p, budget: parseInt(e.target.value) }))}
          style={{ width: '100%', accentColor: 'var(--color-primary)', margin: '.5rem 0 1.25rem' }} />
        <button className="pressable" onClick={saveEditedProfile}
          style={{ width: '100%', padding: '13px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Save changes</button>
        <button className="pressable" onClick={() => setEditModalOpen(null)}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>Cancel</button>
      </Modal>
    </div>
  )
}