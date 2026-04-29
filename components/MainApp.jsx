'use client'

import { useState, useEffect, useRef } from 'react'
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GL = { bulk: 'Bulking 💪', cut: 'Cutting 🔥', maintain: 'Balanced ⚖️', energy: 'Energy ⚡', gut: 'Gut health 🌿' }
const TARGET = { bulk: 2700, cut: 1750, maintain: 2000, energy: 2000, gut: 1900 }
const ACT_BURNS = { running: 10, cycling: 7, gym: 6, swimming: 9, walking: 4, yoga: 3, hiit: 11, other: 6 }
const ACT_ICONS = { running: '🏃', cycling: '🚴', gym: '🏋️', swimming: '🏊', walking: '🚶', yoga: '🧘', hiit: '🔥', other: '⚡' }
const ACT_LABELS = { running: 'Running', cycling: 'Cycling', gym: 'Gym / weights', swimming: 'Swimming', walking: 'Walking', yoga: 'Yoga', hiit: 'HIIT', other: 'Activity' }

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayKey() { return dateKey(new Date()) }

function todayDayIndex() {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

// ── STYLES ──
const C = {
  green: '#2D6A4F', gl: '#B7E4C7', gp: '#F0FAF4', gm: '#52B788',
  amber: '#D4833A', ap: '#FFF3E0',
  blue: '#2471A3', bp: '#EBF5FB', bl: '#AED6F1',
  purple: '#6C3483', pp: '#F5EEF8',
  red: '#C0392B', rp: '#FDEDEC',
  cyan: '#117A8B', cp: '#E0F4F8',
  text: '#1a1a1a', muted: '#6b7280', bg: '#FAFAF8', card: '#fff', border: '#e8e8e4',
}

const btn = (color = C.green, disabled = false) => ({
  width: '100%', padding: '13px', background: disabled ? C.gl : color,
  color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px',
  fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit', transition: 'opacity .2s', opacity: disabled ? .6 : 1,
})

const card = (extra = {}) => ({
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: '14px', padding: '12px 14px', marginBottom: '10px', ...extra
})

const tag = (bg, color, border) => ({
  fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
  fontWeight: '500', background: bg, color, border: `1px solid ${border}`,
  display: 'inline-block', marginRight: '4px', marginBottom: '4px',
})

export default function MainApp({ user, profile, onProfileUpdate }) {
  const monday = getMonday()
  const weekStart = dateKey(monday)

  const [tab, setTab] = useState('meals')
  const [activeDay, setActiveDay] = useState(todayDayIndex())
  const [meals, setMeals] = useState({})
  const [grocery, setGrocery] = useState([])
  const [foodLog, setFoodLog] = useState([])
  const [waterLog, setWaterLog] = useState({})
  const [waterToday, setWaterToday] = useState(0)
  const [weightLog, setWeightLog] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showMealModal, setShowMealModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showActModal, setShowActModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [mealSuggestions, setMealSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [mealFilters, setMealFilters] = useState({ time: null, diff: null, rtype: [], prefs: [] })
  const [avoidInput, setAvoidInput] = useState('')
  const [foodName, setFoodName] = useState('')
  const [foodPortion, setFoodPortion] = useState('')
  const [foodMealTime, setFoodMealTime] = useState('breakfast')
  const [logLoading, setLogLoading] = useState(false)
  const [logResult, setLogResult] = useState(null)
  const [actType, setActType] = useState(null)
  const [actDuration, setActDuration] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [waterGoal, setWaterGoal] = useState(profile?.water_goal || 2500)
  const [weightGoal, setWeightGoal] = useState(profile?.weight_goal || 75)
  const [filterTime, setFilterTime] = useState(null)
  const [filterDiff, setFilterDiff] = useState(null)
  const [editProfile, setEditProfile] = useState({ ...profile })
  const chatEndRef = useRef(null)

  // Load data on mount
  useEffect(() => {
    loadMeals()
    loadGrocery()
    loadFoodLog()
    loadWater()
    loadWeight()
    loadActivity()
  }, [activeDay])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  async function loadMeals() {
    try {
      const data = await getMeals(user.id, weekStart)
      const map = {}
      data.forEach(m => { map[m.day_index] = { ...m, desc: m.description } })
      setMeals(map)
    } catch (e) { console.error(e) }
  }

  async function loadGrocery() {
    try {
      const data = await getGroceryItems(user.id, weekStart)
      setGrocery(data || [])
    } catch (e) { console.error(e) }
  }

  async function loadFoodLog() {
    try {
      const data = await getFoodLog(user.id, todayKey())
      setFoodLog(data || [])
    } catch (e) { console.error(e) }
  }

  async function loadWater() {
    try {
      const data = await getWaterLog(user.id, dateKey(new Date(Date.now() - 13 * 86400000)))
      const map = {}
      data.forEach(w => { map[w.logged_date] = w.amount })
      setWaterLog(map)
      setWaterToday(map[todayKey()] || 0)
    } catch (e) { console.error(e) }
  }

  async function loadWeight() {
    try {
      const data = await getWeightLog(user.id)
      setWeightLog(data || [])
    } catch (e) { console.error(e) }
  }

  async function loadActivity() {
    try {
      const data = await getActivityLog(user.id, todayKey())
      setActivityLog(data || [])
    } catch (e) { console.error(e) }
  }

  // ── MEALS ──
  async function getSuggestions() {
    setSuggestLoading(true)
    setMealSuggestions([])
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          filters: {
            diet: profile.diet,
            allergies: profile.allergies,
            goal: profile.goal,
            budget: profile.budget,
            recipeType: mealFilters.rtype,
            time: mealFilters.time,
            difficulty: mealFilters.diff,
            prefs: mealFilters.prefs,
          },
          avoid: avoidInput,
        }),
      })
      const data = await res.json()
      setMealSuggestions(data.meals || [])
    } catch (e) { console.error(e) }
    setSuggestLoading(false)
  }

  async function selectMeal(meal) {
    try {
      await saveMeal(user.id, weekStart, activeDay, meal)
      await loadMeals()
      setShowMealModal(false)
      setMealSuggestions([])
    } catch (e) { console.error(e) }
  }

  async function removeMeal(dayIndex) {
    try {
      await deleteMeal(user.id, weekStart, dayIndex)
      await loadMeals()
    } catch (e) { console.error(e) }
  }

  async function addToGrocery(dayIndex) {
    const meal = meals[dayIndex]
    if (!meal?.ingredients) return
    const srv = meal.servings || 2
    const scale = srv / 2
    const items = meal.ingredients.map(ing => {
      let qty = ing.qty
      const m = qty.match(/^([\d.]+)(.*)/)
      if (m) qty = Math.round(parseFloat(m[1]) * scale * 10) / 10 + m[2]
      return { name: ing.name, qty, section: ing.section, checked: false }
    })
    try {
      const existing = grocery.filter(g => !items.find(i => i.name === g.name))
      await saveGroceryItems(user.id, weekStart, [...existing, ...items])
      await loadGrocery()
      setTab('grocery')
    } catch (e) { console.error(e) }
  }

  // ── FOOD LOG ──
  async function logFood() {
    if (!foodName) return
    setLogLoading(true)
    setLogResult(null)
    try {
      const res = await fetch('/api/foodlookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: foodName, portion: foodPortion }),
      })
      const data = await res.json()
      const entry = {
        date: todayKey(), mealTime: foodMealTime,
        name: foodName, portion: foodPortion,
        ...data.macros,
      }
      await addFoodLog(user.id, entry)
      await loadFoodLog()
      setLogResult(data.macros)
      setFoodName('')
      setFoodPortion('')
    } catch (e) { console.error(e) }
    setLogLoading(false)
  }

  async function removeFood(id) {
    try {
      await deleteFoodLog(user.id, id)
      await loadFoodLog()
    } catch (e) { console.error(e) }
  }

  // ── WATER ──
  async function updateWater(amount) {
    const newAmount = Math.max(0, Math.min(waterToday + amount, waterGoal * 1.5))
    setWaterToday(newAmount)
    try {
      await saveWaterLog(user.id, todayKey(), Math.round(newAmount), waterGoal)
      await loadWater()
    } catch (e) { console.error(e) }
  }

  async function setWaterGlass(idx) {
    const filled = Math.round(waterToday / 250)
    const newAmount = idx < filled ? idx * 250 : (idx + 1) * 250
    setWaterToday(newAmount)
    try {
      await saveWaterLog(user.id, todayKey(), newAmount, waterGoal)
      await loadWater()
    } catch (e) { console.error(e) }
  }

  // ── WEIGHT ──
  async function logWeight() {
    const val = parseFloat(weightInput)
    if (!val || val < 20 || val > 300) return
    try {
      await saveWeightLog(user.id, todayKey(), val)
      await loadWeight()
      setWeightInput('')
    } catch (e) { console.error(e) }
  }

  async function removeWeight(id) {
    try {
      await deleteWeightLog(user.id, id)
      await loadWeight()
    } catch (e) { console.error(e) }
  }

  // ── ACTIVITY ──
  async function logActivity() {
    if (!actType || !actDuration) return
    const dur = parseInt(actDuration)
    const burned = Math.round((ACT_BURNS[actType] || 6) * dur)
    try {
      await addActivityLog(user.id, todayKey(), {
        type: actType, label: ACT_LABELS[actType], duration: dur, burned,
      })
      await loadActivity()
      setShowActModal(false)
      setActType(null)
      setActDuration('')
    } catch (e) { console.error(e) }
  }

  async function removeActivity(id) {
    try {
      await deleteActivityLog(user.id, id)
      await loadActivity()
    } catch (e) { console.error(e) }
  }

  // ── GROCERY ──
  async function toggleItem(id, checked) {
    try {
      await toggleGroceryItem(user.id, id, !checked)
      await loadGrocery()
    } catch (e) { console.error(e) }
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
      const mealSummary = Object.entries(meals)
        .map(([i, m]) => `${DAYS[i]}: ${m.name}`)
        .join(', ')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, profile, mealSummary }),
      })
      const data = await res.json()
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply }])
    } catch (e) { console.error(e) }
    setChatLoading(false)
  }

  // ── PROFILE UPDATE ──
  async function saveEditedProfile() {
    try {
      const updated = await saveProfile(user.id, editProfile)
      onProfileUpdate(updated)
      setWaterGoal(updated.water_goal || 2500)
      setWeightGoal(updated.weight_goal || 75)
      setShowEditModal(null)
    } catch (e) { console.error(e) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  // ── COMPUTED ──
  const todayMeal = meals[activeDay]
  const plannedCount = Object.keys(meals).length
  const tgt = TARGET[profile?.goal] || 2000
  const mealCals = todayMeal?.macros?.calories || 0
  const loggedCals = foodLog.reduce((a, x) => a + (x.calories || 0), 0)
  const totalCalsIn = mealCals + loggedCals
  const totalBurned = activityLog.reduce((a, x) => a + (x.burned || 0), 0)
  const netCals = totalCalsIn - totalBurned
  const waterPct = Math.min(waterToday / waterGoal, 1)
  const filledGlasses = Math.min(8, Math.round(waterToday / 250))

  // Streak calc
  function calcStreak() {
    let streak = 0
    const todayMet = waterToday >= waterGoal
    const start = todayMet ? 0 : 1
    for (let i = start; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = dateKey(d)
      const val = i === 0 ? waterToday : (waterLog[key] || 0)
      if (val >= waterGoal) streak++
      else break
    }
    return streak
  }
  const waterStreak = calcStreak()

  // Weight stats
  const latestWeight = weightLog[weightLog.length - 1]
  const prevWeight = weightLog[weightLog.length - 2]
  const weightChange = latestWeight && prevWeight
    ? Math.round((latestWeight.value - prevWeight.value) * 10) / 10
    : null

  // ── RENDER HELPERS ──
  function MacroRow({ macros, servings = 2 }) {
    if (!macros) return null
    const sc = servings / 2
    const items = [
      { val: Math.round(macros.calories * sc), label: 'kcal', color: C.amber },
      { val: Math.round(macros.protein * sc) + 'g', label: 'protein', color: C.green },
      { val: Math.round(macros.carbs * sc) + 'g', label: 'carbs', color: C.blue },
      { val: Math.round(macros.fat * sc) + 'g', label: 'fat', color: C.purple },
    ]
    return (
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {items.map(item => (
          <div key={item.label} style={{ flex: 1, background: C.bg, borderRadius: '8px', padding: '7px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: item.color }}>{item.val}</div>
            <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</div>
          </div>
        ))}
      </div>
    )
  }

  // ── TABS ──
  function renderMeals() {
    return (
      <div style={{ padding: '0 1.25rem 1rem' }}>
        {/* Profile banner */}
        {profile?.goal && (
          <div style={{ background: C.gp, border: `1px solid ${C.gl}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            <span style={{ fontSize: '12px', color: C.green }}>
              Tailored to: <strong>{GL[profile.goal]}</strong>
              {profile.diet?.length ? ` · ${profile.diet[0]}` : ''} · €{profile.budget}/wk
            </span>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'quick', label: '⚡ Quick', type: 'time' },
            { id: 'medium', label: '🕐 Medium', type: 'time' },
            { id: 'weekend', label: '👨‍🍳 Weekend', type: 'time' },
            { id: 'easy', label: '😊 Easy', type: 'diff' },
            { id: 'medium-d', label: '🤔 Medium', type: 'diff' },
            { id: 'advanced', label: '🎓 Advanced', type: 'diff' },
          ].map(f => {
            const isActive = f.id === 'all' ? !filterTime && !filterDiff
              : f.type === 'time' ? filterTime === f.id
              : filterDiff === f.id.replace('-d', '')
            return (
              <div key={f.id} onClick={() => {
                if (f.id === 'all') { setFilterTime(null); setFilterDiff(null) }
                else if (f.type === 'time') setFilterTime(filterTime === f.id ? null : f.id)
                else setFilterDiff(filterDiff === f.id.replace('-d', '') ? null : f.id.replace('-d', ''))
              }} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
                border: `1.5px solid ${isActive ? (f.type === 'diff' ? C.amber : C.gm) : C.border}`,
                background: isActive ? (f.type === 'diff' ? C.ap : C.gp) : C.card,
                color: isActive ? (f.type === 'diff' ? C.amber : C.green) : C.muted,
              }}>{f.label}</div>
            )
          })}
        </div>

        <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
          {DAYS[activeDay]}'s meal
        </div>

        {todayMeal ? (
          <div style={{ background: C.gp, border: `1.5px solid ${C.gl}`, borderRadius: '16px', padding: '1rem 1.1rem', marginBottom: '10px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: '600', marginBottom: '6px' }}>{todayMeal.name}</div>
            <div style={{ marginBottom: '8px' }}>
              {todayMeal.timeTag && <span style={tag(C.bp, C.blue, C.bl)}>{todayMeal.timeTag}</span>}
              {todayMeal.diffTag && <span style={tag(C.ap, C.amber, '#FAC775')}>{todayMeal.diffTag}</span>}
              {(todayMeal.tags || []).map(t => <span key={t} style={tag(C.gl, C.green, C.gl)}>{t}</span>)}
            </div>
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: '1.5', marginBottom: '10px' }}>{todayMeal.description}</div>
            <MacroRow macros={todayMeal.macros} servings={todayMeal.servings} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowMealModal(true); setMealSuggestions([]) }}
                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.card, fontSize: '12px', fontWeight: '500', color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                Change meal
              </button>
              <button onClick={() => addToGrocery(activeDay)}
                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: C.green, fontSize: '12px', fontWeight: '500', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Add to grocery →
              </button>
            </div>
          </div>
        ) : (
          <div onClick={() => { setShowMealModal(true); setMealSuggestions([]) }}
            style={{ background: C.card, border: `1.5px dashed ${C.border}`, borderRadius: '16px', padding: '1.25rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.gp, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: C.green }}>+</div>
            <span style={{ fontSize: '14px', color: C.muted }}>Add a meal for {DAYS[activeDay]}</span>
          </div>
        )}

        {plannedCount < 7 && (
          <div style={{ background: C.gp, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📋</span>
            <span style={{ fontSize: '13px', color: C.green }}>{plannedCount} of 7 days planned</span>
          </div>
        )}
      </div>
    )
  }

  function renderTracker() {
    const radius = 28, circ = 2 * Math.PI * radius
    const pct = Math.min(netCals / tgt, 1)
    const dash = pct * circ
    const rc = netCals > tgt * 1.1 ? C.red : netCals > tgt * 0.85 ? C.green : C.blue

    return (
      <div style={{ padding: '0 1.25rem 1rem' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '19px', fontWeight: '600', marginBottom: '10px' }}>Today's tracker</div>

        {/* Net calories */}
        <div style={{ background: C.gp, border: `1px solid ${C.gl}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', display: 'flex', gap: '10px' }}>
          {[
            { val: totalCalsIn, label: 'calories in', color: C.amber },
            { val: totalBurned, label: 'burned', color: C.red },
            { val: netCals, label: 'net kcal', color: rc },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'Georgia, serif', color: item.color }}>{item.val}</div>
              <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Ring */}
        <div style={{ ...card(), display: 'flex', alignItems: 'center', gap: '16px' }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={radius} fill="none" stroke={C.border} strokeWidth="6" />
            <circle cx="36" cy="36" r={radius} fill="none" stroke={rc} strokeWidth="6"
              strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
              strokeLinecap="round" transform="rotate(-90 36 36)" />
            <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="600" fill={rc} fontFamily="sans-serif">
              {Math.round(pct * 100)}%
            </text>
          </svg>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>vs daily target</div>
            <div style={{ fontSize: '12px', color: C.muted }}>{netCals} kcal · target {tgt} kcal</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{profile?.goal ? GL[profile.goal] : 'Set a goal in profile'}</div>
          </div>
        </div>

        {/* Food log */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Food log</div>
            <button onClick={() => { setShowLogModal(true); setLogResult(null) }}
              style={{ fontSize: '12px', color: C.green, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>
              + Add food
            </button>
          </div>
          {!foodLog.length ? (
            <div style={{ fontSize: '13px', color: C.muted }}>Nothing logged yet. Tap + to add.</div>
          ) : (
            foodLog.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `0.5px solid ${C.border}` }}>
                <span style={{ fontSize: '13px' }}>{item.name}{item.portion ? ` (${item.portion})` : ''}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: C.amber }}>{item.calories} kcal</span>
                  <button onClick={() => removeFood(item.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '14px' }}>×</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Activity */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Activity</div>
            <button onClick={() => setShowActModal(true)}
              style={{ fontSize: '12px', color: C.green, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>
              + Add
            </button>
          </div>
          {!activityLog.length ? (
            <div style={{ fontSize: '13px', color: C.muted }}>No activity logged. Tap + to add.</div>
          ) : (
            activityLog.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: `0.5px solid ${C.border}` }}>
                <span style={{ fontSize: '18px' }}>{ACT_ICONS[item.type] || '⚡'}</span>
                <span style={{ fontSize: '13px', flex: 1 }}>{item.label} · {item.duration} min</span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: C.red }}>−{item.burned} kcal</span>
                <button onClick={() => removeActivity(item.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '14px' }}>×</button>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  function renderGrocery() {
    const groups = {}
    grocery.forEach(item => {
      if (!groups[item.section]) groups[item.section] = []
      groups[item.section].push(item)
    })

    return (
      <div style={{ padding: '0 1.25rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '19px', fontWeight: '600' }}>Grocery list</div>
          {grocery.some(g => g.checked) && (
            <button onClick={async () => {
              const remaining = grocery.filter(g => !g.checked)
              await saveGroceryItems(user.id, weekStart, remaining)
              await loadGrocery()
            }} style={{ fontSize: '12px', color: C.muted, background: 'none', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear done
            </button>
          )}
        </div>

        {!grocery.length ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: C.muted }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🛒</div>
            <p style={{ fontSize: '14px' }}>Add meals and tap "Add to grocery" to build your list.</p>
          </div>
        ) : (
          Object.entries(groups).map(([section, items]) => (
            <div key={section} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>{section}</div>
              {items.map(item => (
                <div key={item.id} onClick={() => toggleItem(item.id, item.checked)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', marginBottom: '6px', cursor: 'pointer', opacity: item.checked ? .4 : 1 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${item.checked ? C.green : C.border}`, background: item.checked ? C.green : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.checked && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '14px', flex: 1, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
                  <span style={{ fontSize: '13px', color: C.muted, fontWeight: '500' }}>{item.qty}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    )
  }

  function renderHealth() {
    const radius = 54, stroke = 8, circ = 2 * Math.PI * radius
    const dash = waterPct * circ
    const ringColor = waterPct >= 1 ? C.cyan : waterPct >= .6 ? C.blue : C.bl
    const streak = waterStreak

    return (
      <div style={{ padding: '0 1.25rem 1rem' }}>
        {/* Water */}
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>💧 Water tracker</div>

        {/* Streak */}
        <div style={{
          background: streak === 0 ? 'linear-gradient(135deg,#95a5a6,#7f8c8d)' : 'linear-gradient(135deg,#E67E22,#D4833A)',
          borderRadius: '14px', padding: '1rem', marginBottom: '10px', textAlign: 'center', color: '#fff'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '2px' }}>{streak >= 1 ? '🔥' : '💤'}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '40px', fontWeight: '600' }}>{streak}</div>
          <div style={{ fontSize: '14px', opacity: .85 }}>day streak</div>
          <div style={{ fontSize: '12px', opacity: .65, marginTop: '4px' }}>
            {streak === 0 ? 'Hit your goal today to start a streak!' : `Keep it up! Goal: ${waterGoal >= 1000 ? (waterGoal / 1000).toFixed(1) + 'L' : waterGoal + 'ml'}/day`}
          </div>
        </div>

        {/* Ring */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 8px' }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" stroke={C.border} strokeWidth={stroke} />
              <circle cx="70" cy="70" r={radius} fill="none" stroke={ringColor} strokeWidth={stroke}
                strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
                strokeLinecap="round" transform="rotate(-90 70 70)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '600', color: C.cyan }}>
                {waterToday >= 1000 ? (waterToday / 1000).toFixed(1) + 'L' : waterToday + 'ml'}
              </div>
              <div style={{ fontSize: '12px', color: C.muted }}>
                {waterPct >= 1 ? '✅ Goal met!' : `of ${waterGoal >= 1000 ? (waterGoal / 1000).toFixed(1) + 'L' : waterGoal + 'ml'}`}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: C.muted }}>{Math.round(waterPct * 100)}% of daily goal</div>
        </div>

        {/* Glasses */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: '6px', marginBottom: '10px' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} onClick={() => setWaterGlass(i)}
              style={{
                aspectRatio: '1', borderRadius: '8px', border: `1.5px solid ${i < filledGlasses ? C.blue : C.bl}`,
                background: i < filledGlasses ? C.bp : C.card, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
              }}>
              {i < filledGlasses ? '💧' : '○'}
            </div>
          ))}
        </div>

        {/* Quick add */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[{ label: '+150ml', sub: 'espresso', ml: 150 }, { label: '+250ml', sub: 'glass', ml: 250 }, { label: '+330ml', sub: 'can', ml: 330 }, { label: '+500ml', sub: 'bottle', ml: 500 }, { label: '−250ml', sub: 'undo', ml: -250 }].map(b => (
            <button key={b.ml} onClick={() => updateWater(b.ml)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '10px', border: `1.5px solid ${b.ml < 0 ? C.border : C.bl}`, background: C.card, fontSize: '11px', fontWeight: '500', color: b.ml < 0 ? C.muted : C.cyan, cursor: 'pointer', fontFamily: 'inherit', lineHeight: '1.4' }}>
              {b.label}<br /><span style={{ fontSize: '9px', opacity: .7 }}>{b.sub}</span>
            </button>
          ))}
        </div>

        {/* Weight */}
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: '600', margin: '1rem 0 10px' }}>⚖️ Weight tracker</div>

        {latestWeight && (
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '32px', fontWeight: '600' }}>{latestWeight.value} <span style={{ fontSize: '14px', color: C.muted, fontFamily: 'inherit' }}>kg</span></span>
              {weightChange !== null && (
                <span style={{ fontSize: '13px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px', background: weightChange > 0 ? C.gp : C.rp, color: weightChange > 0 ? C.green : C.red }}>
                  {weightChange > 0 ? '+' : ''}{weightChange} kg
                </span>
              )}
            </div>
            {/* Goal progress */}
            {weightGoal && weightLog[0] && (
              <div>
                <div style={{ height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ height: '100%', background: C.green, borderRadius: '3px', width: `${Math.min(Math.abs((latestWeight.value - weightLog[0].value) / (weightGoal - weightLog[0].value)) * 100, 100)}%`, transition: 'width .5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.green, opacity: .8 }}>
                  <span>{weightLog[0].value} kg start</span>
                  <span>{weightGoal} kg goal</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Log weight */}
        <div style={card()}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px' }}>Log today's weight</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="number" step="0.1" value={weightInput} onChange={e => setWeightInput(e.target.value)}
              placeholder={latestWeight?.value || '75.0'}
              style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '10px', fontSize: '18px', fontWeight: '600', textAlign: 'center', fontFamily: 'Georgia, serif', outline: 'none', background: C.bg }} />
            <button onClick={logWeight}
              style={{ padding: '10px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              Log
            </button>
          </div>
        </div>

        {/* Weight history */}
        {weightLog.length > 0 && (
          <div style={card()}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px' }}>Recent entries</div>
            {[...weightLog].reverse().slice(0, 7).map((entry, i, arr) => {
              const prev = arr[i + 1]
              const diff = prev ? Math.round((entry.value - prev.value) * 10) / 10 : null
              const d = new Date(entry.logged_date + 'T12:00:00')
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `0.5px solid ${C.border}` }}>
                  <span style={{ fontSize: '12px', color: C.muted }}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>{entry.value} kg</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: diff > 0 ? C.green : diff < 0 ? C.red : C.muted }}>{diff !== null ? (diff > 0 ? '+' : '') + diff : '—'}</span>
                  <button onClick={() => removeWeight(entry.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '14px' }}>×</button>
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
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!chatHistory.length && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '14px', alignSelf: 'flex-start', maxWidth: '85%' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.gm, marginBottom: '4px' }}>Planify Coach</div>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>Hi! I'm your personal nutrition coach. Ask me anything — meal ideas, macro advice, whether a food fits your goal, or anything nutrition-related. What's on your mind?</div>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: '16px', fontSize: '13px', lineHeight: '1.5',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? C.green : C.card,
              color: msg.role === 'user' ? '#fff' : C.text,
              border: msg.role === 'user' ? 'none' : `1px solid ${C.border}`,
              borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
              borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
            }}>
              {msg.role === 'assistant' && <div style={{ fontSize: '11px', fontWeight: '600', color: C.gm, marginBottom: '4px' }}>Planify Coach</div>}
              {msg.content}
            </div>
          ))}
          {chatLoading && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '14px', alignSelf: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.gm, marginBottom: '4px' }}>Planify Coach</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.gm, animation: `bounce 1.2s infinite ${i * 0.2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ padding: '.75rem 1.25rem 1rem', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px', background: C.card }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            placeholder="Ask your nutrition coach..."
            style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: '50px', padding: '10px 16px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: C.bg }} />
          <button onClick={sendChat} disabled={chatLoading}
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: C.green, color: '#fff', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↑
          </button>
        </div>
      </div>
    )
  }

  function renderProfile() {
    return (
      <div style={{ padding: '0 1.25rem 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 10px' }}>🥗</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: '600' }}>My Profile</div>
          <div style={{ fontSize: '13px', color: C.muted }}>{user.email}</div>
        </div>

        {[
          { label: 'Diet & allergies', key: 'diet', rows: [{ k: 'Diet', v: profile.diet?.join(', ') || 'None' }, { k: 'Allergies', v: profile.allergies?.join(', ') || 'None' }] },
          { label: 'Goals & budget', key: 'goals', rows: [{ k: 'Eating goal', v: profile.goal ? GL[profile.goal] : 'Not set' }, { k: 'Weekly budget', v: `€${profile.budget}` }] },
        ].map(section => (
          <div key={section.key} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>{section.label}</div>
              <button onClick={() => { setEditProfile({ ...profile }); setShowEditModal(section.key) }}
                style={{ fontSize: '12px', color: C.green, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', fontFamily: 'inherit' }}>Edit →</button>
            </div>
            {section.rows.map(row => (
              <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', background: C.card, border: `0.5px solid ${C.border}`, borderRadius: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>{row.k}</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: C.green }}>{row.v}</span>
              </div>
            ))}
          </div>
        ))}

        <button onClick={handleSignOut} style={{ ...btn(C.red), marginTop: '.5rem' }}>Sign out</button>
      </div>
    )
  }

  // ── MODALS ──
  function MealModal() {
    if (!showMealModal) return null
    return (
      <div onClick={e => e.target === e.currentTarget && setShowMealModal(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: C.card, borderRadius: '20px 20px 0 0', padding: '1.25rem', width: '100%', maxWidth: '420px', maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ width: '36px', height: '4px', background: C.border, borderRadius: '2px', margin: '0 auto 1rem' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: '600', marginBottom: '3px' }}>Suggest a meal</div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '1rem' }}>for {DAYS[activeDay]}{profile?.goal ? ' · ' + GL[profile.goal] : ''}</div>

          {/* Recipe type */}
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Recipe type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
            {[['dinner', '🍽️', 'Dinner'], ['bread', '🍞', 'Bread & bakes'], ['smoothie', '🥤', 'Vitamin shake'], ['snack', '🍪', 'Healthy snack']].map(([v, ic, l]) => (
              <div key={v} onClick={() => setMealFilters(f => ({ ...f, rtype: f.rtype.includes(v) ? f.rtype.filter(x => x !== v) : [...f.rtype, v] }))}
                style={{ padding: '10px', borderRadius: '10px', border: `1.5px solid ${mealFilters.rtype.includes(v) ? C.gm : C.border}`, background: mealFilters.rtype.includes(v) ? C.gp : C.card, cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: mealFilters.rtype.includes(v) ? C.green : C.muted, textAlign: 'center' }}>
                {ic} {l}
              </div>
            ))}
          </div>

          {/* Time */}
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Time to cook</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            {[['quick', '⚡', 'Quick', 'Under 30 min'], ['medium', '🕐', 'Medium', '30–60 min'], ['weekend', '👨‍🍳', 'Weekend', '60+ min']].map(([v, ic, l, sub]) => (
              <div key={v} onClick={() => setMealFilters(f => ({ ...f, time: f.time === v ? null : v }))}
                style={{ flex: 1, padding: '10px 6px', borderRadius: '10px', border: `1.5px solid ${mealFilters.time === v ? C.blue : C.border}`, background: mealFilters.time === v ? C.bp : C.card, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '16px' }}>{ic}</div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: mealFilters.time === v ? C.blue : C.muted }}>{l}</div>
                <div style={{ fontSize: '10px', color: C.muted }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Difficulty */}
          <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Difficulty</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            {[['easy', '😊', 'Easy'], ['medium', '🤔', 'Medium'], ['advanced', '🎓', 'Advanced']].map(([v, ic, l]) => (
              <div key={v} onClick={() => setMealFilters(f => ({ ...f, diff: f.diff === v ? null : v }))}
                style={{ flex: 1, padding: '10px 6px', borderRadius: '10px', border: `1.5px solid ${mealFilters.diff === v ? C.amber : C.border}`, background: mealFilters.diff === v ? C.ap : C.card, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '16px' }}>{ic}</div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: mealFilters.diff === v ? C.amber : C.muted }}>{l}</div>
              </div>
            ))}
          </div>

          <input value={avoidInput} onChange={e => setAvoidInput(e.target.value)}
            placeholder="Anything to avoid?"
            style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: C.bg, marginBottom: '.75rem', boxSizing: 'border-box' }} />

          {/* Results */}
          {mealSuggestions.map((meal, i) => (
            <div key={i} onClick={() => selectMeal(meal)}
              style={{ background: C.gp, border: `1.5px solid ${C.gl}`, borderRadius: '10px', padding: '11px 13px', marginBottom: '8px', cursor: 'pointer' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: '600', marginBottom: '3px' }}>{meal.name}</div>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>{meal.desc}</div>
              <div>
                {meal.timeTag && <span style={tag(C.bp, C.blue, C.bl)}>{meal.timeTag}</span>}
                {meal.diffTag && <span style={tag(C.ap, C.amber, '#FAC775')}>{meal.diffTag}</span>}
                <span style={tag('#FEF9F0', C.amber, '#F5CBA7')}>{meal.macros?.calories} kcal</span>
                <span style={tag(C.gp, C.green, C.gl)}>{meal.macros?.protein}g protein</span>
              </div>
            </div>
          ))}

          {mealSuggestions.length > 0 && <div style={{ fontSize: '12px', color: C.gm, textAlign: 'center', marginBottom: '8px' }}>Tap a meal to add it</div>}

          <button onClick={getSuggestions} disabled={suggestLoading} style={btn(C.green, suggestLoading)}>
            {suggestLoading ? 'Thinking...' : mealSuggestions.length ? '✨ Suggest again' : '✨ Suggest meals'}
          </button>
          <button onClick={() => setShowMealModal(false)}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: C.muted, cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  function FoodLogModal() {
    if (!showLogModal) return null
    return (
      <div onClick={e => e.target === e.currentTarget && setShowLogModal(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: C.card, borderRadius: '20px 20px 0 0', padding: '1.25rem', width: '100%', maxWidth: '420px', maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ width: '36px', height: '4px', background: C.border, borderRadius: '2px', margin: '0 auto 1rem' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: '600', marginBottom: '3px' }}>Log food</div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '1rem' }}>Add something you ate or drank today.</div>

          <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Meal time</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
            {[['breakfast', '☀️', 'Breakfast'], ['lunch', '🌤️', 'Lunch'], ['dinner-log', '🌙', 'Dinner'], ['snack-log', '🍎', 'Snack']].map(([v, ic, l]) => (
              <div key={v} onClick={() => setFoodMealTime(v)}
                style={{ padding: '8px 10px', borderRadius: '50px', border: `1.5px solid ${foodMealTime === v ? C.gm : C.border}`, background: foodMealTime === v ? C.gp : C.card, cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: foodMealTime === v ? C.green : C.muted, textAlign: 'center' }}>
                {ic} {l}
              </div>
            ))}
          </div>

          <input value={foodName} onChange={e => setFoodName(e.target.value)}
            placeholder="Food name (e.g. banana, oatmeal)"
            style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: C.bg, marginBottom: '.75rem', boxSizing: 'border-box' }} />
          <input value={foodPortion} onChange={e => setFoodPortion(e.target.value)}
            placeholder="Portion (e.g. 1 cup, 100g, 1 slice)"
            style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: C.bg, marginBottom: '.75rem', boxSizing: 'border-box' }} />

          {logResult && (
            <div style={{ background: C.gp, border: `1px solid ${C.gl}`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: C.green, marginBottom: '.75rem' }}>
              Added · {logResult.calories} kcal · {logResult.protein}g protein
            </div>
          )}

          <button onClick={logFood} disabled={logLoading} style={btn(C.green, logLoading)}>
            {logLoading ? 'Looking up...' : '🔍 Look up & add'}
          </button>
          <button onClick={() => setShowLogModal(false)}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: C.muted, cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  function ActivityModal() {
    if (!showActModal) return null
    return (
      <div onClick={e => e.target === e.currentTarget && setShowActModal(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: C.card, borderRadius: '20px 20px 0 0', padding: '1.25rem', width: '100%', maxWidth: '420px', maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ width: '36px', height: '4px', background: C.border, borderRadius: '2px', margin: '0 auto 1rem' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: '600', marginBottom: '3px' }}>Log activity</div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '1rem' }}>Add exercise to track calories burned.</div>

          <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Activity type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
            {Object.entries(ACT_LABELS).map(([v, l]) => (
              <div key={v} onClick={() => setActType(v)}
                style={{ padding: '10px', borderRadius: '10px', border: `1.5px solid ${actType === v ? C.gm : C.border}`, background: actType === v ? C.gp : C.card, cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: actType === v ? C.green : C.muted, textAlign: 'center' }}>
                {ACT_ICONS[v]} {l}
              </div>
            ))}
          </div>

          <input value={actDuration} onChange={e => setActDuration(e.target.value)}
            type="number" placeholder="Duration in minutes (e.g. 45)"
            style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: C.bg, marginBottom: '.75rem', boxSizing: 'border-box' }} />

          {actType && actDuration && (
            <div style={{ background: C.rp, border: `1px solid #F5B7B1`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: C.red, marginBottom: '.75rem' }}>
              Estimated burn: ~{Math.round((ACT_BURNS[actType] || 6) * parseInt(actDuration || 0))} kcal
            </div>
          )}

          <button onClick={logActivity} disabled={!actType || !actDuration} style={btn(C.green, !actType || !actDuration)}>
            Add activity
          </button>
          <button onClick={() => setShowActModal(false)}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: C.muted, cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  function EditModal() {
    if (!showEditModal) return null
    const isDiet = showEditModal === 'diet'

    const DIETS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'halal']
    const DIET_ICONS = { vegetarian: '🥦', vegan: '🌱', 'gluten-free': '🌾', 'dairy-free': '🥛', keto: '🥑', halal: '☪️' }
    const ALLERGIES = ['nuts', 'shellfish', 'eggs', 'soy', 'fish', 'sesame']
    const ALLERGY_ICONS = { nuts: '🥜', shellfish: '🦐', eggs: '🥚', soy: '🫘', fish: '🐟', sesame: '🌰' }
    const GOALS = [
      { value: 'bulk', icon: '💪', label: 'Build muscle' },
      { value: 'cut', icon: '🔥', label: 'Lose weight' },
      { value: 'maintain', icon: '⚖️', label: 'Stay balanced' },
      { value: 'energy', icon: '⚡', label: 'Boost energy' },
      { value: 'gut', icon: '🌿', label: 'Gut health' },
    ]

    return (
      <div onClick={e => e.target === e.currentTarget && setShowEditModal(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
        <div style={{ background: C.card, borderRadius: '24px 24px 0 0', padding: '1.5rem 1.25rem 2rem', width: '100%', maxWidth: '420px', maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ width: '36px', height: '4px', background: C.border, borderRadius: '2px', margin: '0 auto 1.25rem' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: '600', marginBottom: '1rem' }}>
            {isDiet ? 'Diet & allergies' : 'Goals & budget'}
          </div>

          {isDiet ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Diet</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
                {DIETS.map(v => (
                  <div key={v} onClick={() => setEditProfile(p => ({ ...p, diet: p.diet?.includes(v) ? p.diet.filter(x => x !== v) : [...(p.diet || []), v] }))}
                    style={{ padding: '12px', borderRadius: '10px', border: `1.5px solid ${editProfile.diet?.includes(v) ? C.green : C.border}`, background: editProfile.diet?.includes(v) ? C.gp : C.card, cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: editProfile.diet?.includes(v) ? C.green : C.muted, textAlign: 'center' }}>
                    {DIET_ICONS[v]} {v.charAt(0).toUpperCase() + v.slice(1)}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Allergies</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
                {ALLERGIES.map(v => (
                  <div key={v} onClick={() => setEditProfile(p => ({ ...p, allergies: p.allergies?.includes(v) ? p.allergies.filter(x => x !== v) : [...(p.allergies || []), v] }))}
                    style={{ padding: '12px', borderRadius: '10px', border: `1.5px solid ${editProfile.allergies?.includes(v) ? C.green : C.border}`, background: editProfile.allergies?.includes(v) ? C.gp : C.card, cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: editProfile.allergies?.includes(v) ? C.green : C.muted, textAlign: 'center' }}>
                    {ALLERGY_ICONS[v]} {v.charAt(0).toUpperCase() + v.slice(1)}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>Eating goal</div>
              {GOALS.map(g => (
                <div key={g.value} onClick={() => setEditProfile(p => ({ ...p, goal: g.value }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: `1.5px solid ${editProfile.goal === g.value ? C.green : C.border}`, background: editProfile.goal === g.value ? C.gp : C.card, cursor: 'pointer', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px' }}>{g.icon}</span>
                  <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: editProfile.goal === g.value ? C.green : C.text }}>{g.label}</div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${editProfile.goal === g.value ? C.green : C.border}`, background: editProfile.goal === g.value ? C.green : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {editProfile.goal === g.value && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', margin: '1rem 0 8px' }}>Weekly budget</div>
              <div style={{ textAlign: 'center', margin: '.5rem 0' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '40px', fontWeight: '600', color: C.green }}>€{editProfile.budget}</div>
              </div>
              <input type="range" min="10" max="200" step="5" value={editProfile.budget}
                onChange={e => setEditProfile(p => ({ ...p, budget: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: C.green, margin: '.5rem 0 1.25rem' }} />
            </>
          )}

          <button onClick={saveEditedProfile} style={btn(C.green)}>Save changes</button>
          <button onClick={() => setShowEditModal(null)}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: C.muted, cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── MAIN RENDER ──
  const tabs = ['meals', 'tracker', 'grocery', 'health', 'assist', 'profile']
  const tabIcons = { meals: '🥗', tracker: '📊', grocery: '🛒', health: '💧', assist: '🤖', profile: '👤' }
  const tabLabels = { meals: 'Meals', tracker: 'Tracker', grocery: 'Grocery', health: 'Health', assist: 'Coach', profile: 'Profile' }

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem .75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: '600', color: C.green, letterSpacing: '-.5px' }}>
          Plan<span style={{ fontStyle: 'italic', fontWeight: '300' }}>ify</span>
        </div>
        <div onClick={() => setTab('profile')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: C.gp, border: `1px solid ${C.gl}`, cursor: 'pointer', fontSize: '12px', color: C.green, fontWeight: '500' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.gm }} />
          {profile?.goal ? GL[profile.goal] : 'My profile'}
        </div>
      </div>

      {/* Day strip — only for meals/tracker/grocery tabs */}
      {['meals', 'tracker', 'grocery'].includes(tab) && (
        <div style={{ display: 'flex', gap: '6px', padding: '0 1.25rem .75rem', overflowX: 'auto' }}>
          {DAYS.map((d, i) => {
            const date = new Date(monday)
            date.setDate(monday.getDate() + i)
            return (
              <div key={i} onClick={() => setActiveDay(i)}
                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 10px', borderRadius: '50px', border: `1.5px solid ${i === activeDay ? C.green : C.border}`, background: i === activeDay ? C.green : C.card, cursor: 'pointer', minWidth: '44px' }}>
                <span style={{ fontSize: '10px', fontWeight: '500', color: i === activeDay ? 'rgba(255,255,255,.7)' : C.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{d}</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: i === activeDay ? '#fff' : C.text }}>{date.getDate()}</span>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: meals[i] ? (i === activeDay ? 'rgba(255,255,255,.6)' : C.gm) : 'transparent' }} />
              </div>
            )
          })}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: tab === 'assist' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {tab === 'meals' && renderMeals()}
        {tab === 'tracker' && renderTracker()}
        {tab === 'grocery' && renderGrocery()}
        {tab === 'health' && renderHealth()}
        {tab === 'assist' && renderAssist()}
        {tab === 'profile' && renderProfile()}
      </div>

      {/* Bottom nav */}
      <nav style={{ display: 'flex', padding: '.75rem .5rem 1.25rem', gap: '2px', borderTop: `1px solid ${C.border}`, background: C.card }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 2px', borderRadius: '8px', border: 'none', background: tab === t ? C.gp : 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '18px' }}>{tabIcons[t]}</span>
            <span style={{ fontSize: '10px', fontWeight: '500', color: tab === t ? C.green : C.muted }}>{tabLabels[t]}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      <MealModal />
      <FoodLogModal />
      <ActivityModal />
      <EditModal />

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(1); opacity: .5; }
          40% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  )
}