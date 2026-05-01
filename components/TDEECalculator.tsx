'use client'

import { useState } from 'react'

interface TDEEProps {
  goal: string | null
  onComplete: (result: { tdee: number, protein: number, carbs: number, fat: number }) => void
  onSkip: () => void
}

const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary', desc: 'Desk job, little exercise', icon: '🪑' },
  { value: 1.375, label: 'Lightly active', desc: '1–3 workouts/week', icon: '🚶' },
  { value: 1.55, label: 'Moderately active', desc: '3–5 workouts/week', icon: '🏃' },
  { value: 1.725, label: 'Very active', desc: '6–7 workouts/week', icon: '💪' },
  { value: 1.9, label: 'Athlete', desc: 'Twice daily training', icon: '🏆' },
]

const GOAL_ADJUSTMENTS: Record<string, number> = {
  bulk: 300, cut: -400, maintain: 0, energy: 0, gut: 0
}

const GOAL_MACROS: Record<string, { protein: number, fat: number }> = {
  bulk: { protein: 2.2, fat: 0.9 },
  cut: { protein: 2.4, fat: 0.8 },
  maintain: { protein: 1.8, fat: 0.9 },
  energy: { protein: 1.8, fat: 1.0 },
  gut: { protein: 1.6, fat: 1.0 },
}

export default function TDEECalculator({ goal, onComplete, onSkip }: TDEEProps) {
  const [step, setStep] = useState(0)
  const [sex, setSex] = useState<'male' | 'female' | null>(null)
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [activity, setActivity] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)

  function calculate() {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const a = parseInt(age)
    if (!w || !h || !a || !sex || !activity) return

    // Mifflin-St Jeor BMR
    const bmr = sex === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161

    const tdee = Math.round(bmr * activity)
    const adjustment = GOAL_ADJUSTMENTS[goal || 'maintain'] || 0
    const targetCals = tdee + adjustment

    const macroRatios = GOAL_MACROS[goal || 'maintain']
    const protein = Math.round(w * macroRatios.protein)
    const fat = Math.round(w * macroRatios.fat)
    const remainingCals = targetCals - (protein * 4) - (fat * 9)
    const carbs = Math.round(Math.max(remainingCals / 4, 50))

    setResult({ tdee, targetCals, protein, carbs, fat, bmr: Math.round(bmr) })
    setStep(2)
  }

  const s = {
    wrap: { minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' },
    inner: { width: '100%', maxWidth: '420px' },
    title: { fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '600', color: 'var(--color-text)', lineHeight: '1.2', marginBottom: '6px' },
    sub: { fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' },
    label: { fontSize: '12px', fontWeight: '500', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'block' },
    input: { width: '100%', border: '1.5px solid var(--color-border)', borderRadius: '12px', padding: '12px 14px', fontSize: '16px', fontFamily: 'var(--font-body)', background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '1rem' },
    btn: { width: '100%', padding: '14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600' as const, cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: '.5rem' },
    skip: { width: '100%', padding: '10px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: '4px' },
  }

  if (step === 0) {
    return (
      <div style={s.wrap}>
        <div style={s.inner}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧮</div>
            <div style={s.title}>Calculate your exact calorie target</div>
            <div style={s.sub}>We'll use your body stats to calculate precisely how many calories and macros you need daily. Takes 30 seconds.</div>
          </div>

          <div style={{ background: 'var(--color-primary-pale)', border: '1px solid var(--color-primary-border)', borderRadius: '12px', padding: '14px', marginBottom: '1.5rem' }}>
            {[
              { icon: '🎯', text: 'Personalised calorie target based on your body' },
              { icon: '💪', text: 'Exact protein, carbs & fat targets for your goal' },
              { icon: '📊', text: 'Replaces generic estimates with real science' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-primary)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <button style={s.btn} onClick={() => setStep(1)}>Calculate my targets →</button>
          <button style={s.skip} onClick={onSkip}>Skip — use default targets</button>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div style={s.wrap}>
        <div style={s.inner}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ height: '100%', background: 'var(--color-primary-light)', width: '60%', transition: 'width .4s' }} />
            </div>
            <div style={s.title}>Your <em style={{ fontStyle: 'italic', fontWeight: '300', color: 'var(--color-primary)' }}>body stats</em></div>
            <div style={s.sub}>Used only to calculate your calorie needs. Never shared.</div>
          </div>

          {/* Sex */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.label}>Biological sex</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['male', 'female'] as const).map(v => (
                <div key={v} onClick={() => setSex(v)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1.5px solid ${sex === v ? 'var(--color-primary)' : 'var(--color-border)'}`, background: sex === v ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', textAlign: 'center' as const, fontSize: '14px', fontWeight: '500', color: sex === v ? 'var(--color-primary)' : 'var(--color-text-muted)', transition: 'all .18s' }}>
                  {v === 'male' ? '♂️ Male' : '♀️ Female'}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
            {[
              { label: 'Age (years)', placeholder: '25', ref: age, set: setAge },
              { label: 'Weight (kg)', placeholder: '75', ref: weight, set: setWeight },
              { label: 'Height (cm)', placeholder: '175', ref: height, set: setHeight },
            ].map(field => (
              <div key={field.label}>
                <label style={{ ...s.label, fontSize: '11px' }}>{field.label}</label>
                <input type="number" placeholder={field.placeholder} value={field.ref}
                  onChange={e => field.set(e.target.value)}
                  style={{ ...s.input, marginBottom: 0, textAlign: 'center' as const, fontSize: '18px', fontWeight: '600', padding: '10px' }} />
              </div>
            ))}
          </div>

          {/* Activity */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.label}>Activity level</label>
            {ACTIVITY_LEVELS.map(level => (
              <div key={level.value} onClick={() => setActivity(level.value)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', border: `1.5px solid ${activity === level.value ? 'var(--color-primary)' : 'var(--color-border)'}`, background: activity === level.value ? 'var(--color-primary-pale)' : 'var(--color-surface)', cursor: 'pointer', marginBottom: '8px', transition: 'all .18s' }}>
                <span style={{ fontSize: '20px' }}>{level.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: activity === level.value ? 'var(--color-primary)' : 'var(--color-text)' }}>{level.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{level.desc}</div>
                </div>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${activity === level.value ? 'var(--color-primary)' : 'var(--color-border)'}`, background: activity === level.value ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activity === level.value && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }} />}
                </div>
              </div>
            ))}
          </div>

          <button style={{ ...s.btn, opacity: (!sex || !age || !weight || !height || !activity) ? 0.4 : 1 }}
            disabled={!sex || !age || !weight || !height || !activity}
            onClick={calculate}>
            Calculate →
          </button>
          <button style={s.skip} onClick={onSkip}>Skip</button>
        </div>
      </div>
    )
  }

  // Step 2 — Results
  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
          <div style={s.title}>Your personal targets</div>
          <div style={s.sub}>Based on your stats and {goal ? goal + ' goal' : 'goal'}. These are now your daily targets in Planify.</div>
        </div>

        {/* Main calorie card */}
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', borderRadius: '16px', padding: '1.5rem', marginBottom: '12px', textAlign: 'center' as const, color: '#fff' }}>
          <div style={{ fontSize: '13px', opacity: .8, marginBottom: '4px' }}>Daily calorie target</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: '600', lineHeight: 1 }}>{result?.targetCals}</div>
          <div style={{ fontSize: '13px', opacity: .7, marginTop: '4px' }}>kcal / day</div>
          {result?.tdee !== result?.targetCals && (
            <div style={{ fontSize: '12px', opacity: .65, marginTop: '8px' }}>
              TDEE: {result?.tdee} kcal · {result?.targetCals > result?.tdee ? '+' : ''}{result?.targetCals - result?.tdee} adjustment for your goal
            </div>
          )}
        </div>

        {/* Macro targets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Protein', val: result?.protein + 'g', sub: result?.protein * 4 + ' kcal', color: 'var(--color-primary)' },
            { label: 'Carbs', val: result?.carbs + 'g', sub: result?.carbs * 4 + ' kcal', color: 'var(--color-blue)' },
            { label: 'Fat', val: result?.fat + 'g', sub: result?.fat * 9 + ' kcal', color: 'var(--color-amber)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', textAlign: 'center' as const }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600', color: m.color }}>{m.val}</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text)', marginTop: '2px' }}>{m.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '1px' }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* BMR info */}
        <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px 14px', marginBottom: '1.25rem', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          Your BMR (at rest) is <strong style={{ color: 'var(--color-text)' }}>{result?.bmr} kcal</strong>. With your activity level, you burn <strong style={{ color: 'var(--color-text)' }}>{result?.tdee} kcal/day</strong>. We've {result?.targetCals > result?.tdee ? 'added 300 kcal for muscle gain' : result?.targetCals < result?.tdee ? 'subtracted 400 kcal for fat loss' : 'kept this at maintenance'}.
        </div>

        <button style={s.btn} onClick={() => onComplete({ tdee: result.targetCals, protein: result.protein, carbs: result.carbs, fat: result.fat })}>
          Save my targets & start →
        </button>
      </div>
    </div>
  )
}