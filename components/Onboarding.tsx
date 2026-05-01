'use client'

import { useState } from 'react'
import { saveProfile } from '@/lib/auth'

const GOALS = [
  { value: 'bulk', icon: '💪', label: 'Build muscle (bulk)', desc: 'High protein, caloric surplus' },
  { value: 'cut', icon: '🔥', label: 'Lose weight (cut)', desc: 'Caloric deficit, high protein' },
  { value: 'maintain', icon: '⚖️', label: 'Stay balanced', desc: 'Balanced macros, sustainable' },
  { value: 'energy', icon: '⚡', label: 'Boost energy', desc: 'Low glycaemic, iron-rich' },
  { value: 'gut', icon: '🌿', label: 'Gut health', desc: 'Fibre-rich, fermented foods' },
]

const DIETS = [
  { value: 'vegetarian', icon: '🥦', label: 'Vegetarian', desc: 'No meat or fish' },
  { value: 'vegan', icon: '🌱', label: 'Vegan', desc: 'No animal products' },
  { value: 'gluten-free', icon: '🌾', label: 'Gluten-free', desc: 'No wheat or barley' },
  { value: 'dairy-free', icon: '🥛', label: 'Dairy-free', desc: 'No milk or cheese' },
  { value: 'keto', icon: '🥑', label: 'Keto', desc: 'Low carb, high fat' },
  { value: 'halal', icon: '☪️', label: 'Halal', desc: 'Halal-certified only' },
]

const ALLERGIES = [
  { value: 'nuts', icon: '🥜', label: 'Nuts', desc: 'All tree nuts & peanuts' },
  { value: 'shellfish', icon: '🦐', label: 'Shellfish', desc: 'Shrimp, crab, lobster' },
  { value: 'eggs', icon: '🥚', label: 'Eggs', desc: 'All egg products' },
  { value: 'soy', icon: '🫘', label: 'Soy', desc: 'Tofu, soy sauce, etc' },
  { value: 'fish', icon: '🐟', label: 'Fish', desc: 'All types of fish' },
  { value: 'sesame', icon: '🌰', label: 'Sesame', desc: 'Seeds & tahini' },
]

const s = {
  wrap: { minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' },
  inner: { width: '100%', maxWidth: '420px' },
  pb: { height: '3px', background: '#e8e8e4', borderRadius: '2px', marginBottom: '2rem', overflow: 'hidden' },
  pbf: (pct) => ({ height: '100%', background: '#52B788', borderRadius: '2px', width: pct + '%', transition: 'width .4s' }),
  tag: { fontSize: '11px', fontWeight: '600', color: '#52B788', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' },
  title: { fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '600', lineHeight: '1.2', marginBottom: '6px', color: '#1a1a1a' },
  sub: { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '1.5rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' },
  chip: (sel) => ({
    padding: '14px 12px', borderRadius: '12px', border: `1.5px solid ${sel ? '#2D6A4F' : '#e8e8e4'}`,
    background: sel ? '#F0FAF4' : '#fff', cursor: 'pointer', textAlign: 'left' as const, transition: 'all .18s'
  }),
  chipIcon: { fontSize: '20px', marginBottom: '6px', display: 'block' },
  chipLabel: (sel) => ({ fontSize: '13px', fontWeight: '500', color: sel ? '#2D6A4F' : '#1a1a1a', display: 'block' }),
  chipSub: { fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '2px', lineHeight: '1.4' },
  goalItem: (sel) => ({
    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
    borderRadius: '12px', border: `1.5px solid ${sel ? '#2D6A4F' : '#e8e8e4'}`,
    background: sel ? '#F0FAF4' : '#fff', cursor: 'pointer', marginBottom: '10px', transition: 'all .18s'
  }),
  radio: (sel) => ({
    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
    border: `2px solid ${sel ? '#2D6A4F' : '#e8e8e4'}`, background: sel ? '#2D6A4F' : '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }),
  btn: (disabled) => ({
    width: '100%', padding: '14px', background: disabled ? '#B7E4C7' : '#2D6A4F',
    color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px',
    fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    marginTop: '1.5rem', transition: 'opacity .2s'
  }),
  skip: {
    width: '100%', padding: '10px', background: 'transparent', border: 'none',
    fontSize: '13px', color: '#6b7280', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit'
  },
}

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [diet, setDiet] = useState([])
  const [allergies, setAllergies] = useState([])
  const [goal, setGoal] = useState(null)
  const [budget, setBudget] = useState(50)
  const [loading, setLoading] = useState(false)

  function toggleDiet(v) { setDiet(d => d.includes(v) ? d.filter(x => x !== v) : [...d, v]) }
  function toggleAllergy(v) { setAllergies(a => a.includes(v) ? a.filter(x => x !== v) : [...a, v]) }

  async function finish() {
    setLoading(true)
    try {
      const profile = await saveProfile(user.id, { goal, diet, allergies, budget, water_goal: 2500 })
      onComplete(profile)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    // Step 0 — Welcome
    <div key="welcome" style={{ textAlign: 'center' as const as const, padding: '2rem 0' }}>
      <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🥗</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '600', color: '#2D6A4F', marginBottom: '8px' }}>
        Welcome to Planify
      </div>
      <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto 2rem' }}>
        Your complete nutrition & fitness companion. Let's take 60 seconds to personalise your experience.
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
        {['🥗 Meal planner', '📊 Calorie tracker', '🏃 Activity log', '🤖 AI coach'].map(t => (
          <span key={t} style={{ fontSize: '12px', background: '#F0FAF4', color: '#2D6A4F', padding: '5px 12px', borderRadius: '20px', fontWeight: '500' }}>{t}</span>
        ))}
      </div>
      <button onClick={() => setStep(1)} style={s.btn(false)}>Get started →</button>
    </div>,

    // Step 1 — Diet
    <div key="diet">
      <div style={s.pb}><div style={s.pbf(25)}></div></div>
      <div style={s.tag}>Step 1 of 4</div>
      <div style={s.title}>Any dietary <em style={{ fontStyle: 'italic', fontWeight: '300', color: '#2D6A4F' }}>preferences?</em></div>
      <div style={s.sub}>Select all that apply.</div>
      <div style={s.grid}>
        {DIETS.map(d => (
          <div key={d.value} style={s.chip(diet.includes(d.value))} onClick={() => toggleDiet(d.value)}>
            <span style={s.chipIcon}>{d.icon}</span>
            <span style={s.chipLabel(diet.includes(d.value))}>{d.label}</span>
            <span style={s.chipSub}>{d.desc}</span>
          </div>
        ))}
      </div>
      <button onClick={() => setStep(2)} style={s.btn(false)}>Continue →</button>
      <button onClick={() => setStep(2)} style={s.skip}>No restrictions, skip</button>
    </div>,

    // Step 2 — Allergies
    <div key="allergies">
      <div style={s.pb}><div style={s.pbf(50)}></div></div>
      <div style={s.tag}>Step 2 of 4</div>
      <div style={s.title}>Any <em style={{ fontStyle: 'italic', fontWeight: '300', color: '#2D6A4F' }}>allergies?</em></div>
      <div style={s.sub}>We'll never suggest a meal containing these.</div>
      <div style={s.grid}>
        {ALLERGIES.map(a => (
          <div key={a.value} style={s.chip(allergies.includes(a.value))} onClick={() => toggleAllergy(a.value)}>
            <span style={s.chipIcon}>{a.icon}</span>
            <span style={s.chipLabel(allergies.includes(a.value))}>{a.label}</span>
            <span style={s.chipSub}>{a.desc}</span>
          </div>
        ))}
      </div>
      <button onClick={() => setStep(3)} style={s.btn(false)}>Continue →</button>
      <button onClick={() => setStep(3)} style={s.skip}>No allergies, skip</button>
    </div>,

    // Step 3 — Goal
    <div key="goal">
      <div style={s.pb}><div style={s.pbf(75)}></div></div>
      <div style={s.tag}>Step 3 of 4</div>
      <div style={s.title}>What's your <em style={{ fontStyle: 'italic', fontWeight: '300', color: '#2D6A4F' }}>eating goal?</em></div>
      <div style={s.sub}>Shapes your macro targets for every suggestion.</div>
      {GOALS.map(g => (
        <div key={g.value} style={s.goalItem(goal === g.value)} onClick={() => setGoal(g.value)}>
          <span style={{ fontSize: '22px' }}>{g.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: goal === g.value ? '#2D6A4F' : '#1a1a1a' }}>{g.label}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{g.desc}</div>
          </div>
          <div style={s.radio(goal === g.value)}>
            {goal === g.value && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }}></div>}
          </div>
        </div>
      ))}
      <button onClick={() => setStep(4)} disabled={!goal} style={s.btn(!goal)}>Continue →</button>
      <button onClick={() => setStep(4)} style={s.skip}>Skip for now</button>
    </div>,

    // Step 4 — Budget
    <div key="budget">
      <div style={s.pb}><div style={s.pbf(100)}></div></div>
      <div style={s.tag}>Step 4 of 4</div>
      <div style={s.title}>Weekly food <em style={{ fontStyle: 'italic', fontWeight: '300', color: '#2D6A4F' }}>budget?</em></div>
      <div style={s.sub}>We'll keep suggestions within this. Change it anytime.</div>
      <div style={{ textAlign: 'center' as const as const, margin: '1.5rem 0 .5rem' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '48px', fontWeight: '600', color: '#2D6A4F' }}>€{budget}</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>per week</div>
      </div>
      <input type="range" min="10" max="200" step="5" value={budget}
        onChange={e => setBudget(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#2D6A4F', margin: '.5rem 0 1rem' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '1rem' }}>
        <span>€10</span><span>€200</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 'auto' }}>
        {[25, 50, 80, 150].map(v => (
          <div key={v} onClick={() => setBudget(v)} style={{
            padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
            border: `1.5px solid ${budget === v ? '#52B788' : '#e8e8e4'}`,
            background: budget === v ? '#F0FAF4' : '#fff',
            color: budget === v ? '#2D6A4F' : '#6b7280',
          }}>€{v}</div>
        ))}
      </div>
      <button onClick={finish} disabled={loading} style={s.btn(loading)}>
        {loading ? 'Setting up...' : 'Start planning →'}
      </button>
    </div>,
  ]

  return (
    <div style={s.wrap}>
      <div style={s.inner}>{steps[step]}</div>
    </div>
  )
}