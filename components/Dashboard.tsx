'use client'

const GL: Record<string, string> = {
  bulk: 'Bulking 💪', cut: 'Cutting 🔥', maintain: 'Balanced ⚖️',
  energy: 'Energy ⚡', gut: 'Gut health 🌿'
}
const TARGET: Record<string, number> = {
  bulk: 2700, cut: 1750, maintain: 2000, energy: 2000, gut: 1900
}

interface DashboardProps {
  user: any
  profile: any
  meals: Record<number, any>
  foodLog: any[]
  activityLog: any[]
  waterToday: number
  waterGoal: number
  waterStreak: number
  weightLog: any[]
  onAddMeal: () => void
  onLogFood: () => void
  onLogActivity: () => void
  onAddWater: (ml: number) => void
  onSwitchTab: (tab: string) => void
  onViewAllMeals: () => void
  activeDay: number
}

export default function Dashboard({
  user, profile, meals, foodLog, activityLog,
  waterToday, waterGoal, waterStreak, weightLog,
  onAddMeal, onLogFood, onLogActivity, onAddWater,
  onSwitchTab, onViewAllMeals, activeDay
}: DashboardProps) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const tgt = profile?.tdee || TARGET[profile?.goal] || 2000
  const todayMeal = meals[activeDay]
  const mealCals = todayMeal?.macros?.calories || 0
  const loggedCals = foodLog.reduce((a: number, x: any) => a + (x.calories || 0), 0)
  const totalIn = mealCals + loggedCals
  const totalBurned = activityLog.reduce((a: number, x: any) => a + (x.burned || 0), 0)
  const net = totalIn - totalBurned
  const remaining = Math.max(tgt - net, 0)
  const pct = Math.min(net / tgt, 1)
  const waterPct = Math.min(waterToday / waterGoal, 1)
  const goalReached = waterToday >= waterGoal
  const latestWeight = weightLog[weightLog.length - 1]
  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const displayName = user?.email?.split('@')[0] || 'there'

  const radius = 52, stroke = 10, circ = 2 * Math.PI * radius
  const dash = pct * circ
  const ringColor = net > tgt * 1.1 ? 'var(--color-red)' : net > tgt * 0.85 ? 'var(--color-primary)' : 'var(--color-blue)'

  const filledGlasses = Math.min(5, Math.round(waterPct * 5))

  // Weekly calorie data for mini chart
  const weekCals = DAYS.map((_, i) => {
    const m = meals[i]
    const mCals = m?.macros?.calories || 0
    return mCals
  })
  const maxCal = Math.max(...weekCals, tgt, 1)

  return (
    <div className="anim-fade-slide" style={{ padding: '0 1.25rem 1rem' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{greeting},</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '600', color: 'var(--color-text)', letterSpacing: '-0.5px' }}>
          {displayName}
        </div>
        {profile?.goal && (
          <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '2px' }}>
            {GL[profile.goal]} · €{profile.budget}/week budget
          </div>
        )}
      </div>

      {/* Calorie ring + weekly chart card */}
      <div className="card anim-fade-slide" style={{ marginBottom: '10px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="110" height="110" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
              <circle cx="60" cy="60" r={radius} fill="none" stroke={ringColor} strokeWidth={stroke}
                strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '600', color: ringColor, lineHeight: 1 }}>{remaining}</div>
              <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: '2px' }}>kcal left</div>
            </div>
          </div>
          {/* Stats */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '8px' }}>Today's calories</div>
            {[
              { label: 'Eaten', val: totalIn, color: 'var(--color-amber)' },
              { label: 'Burned', val: totalBurned, color: 'var(--color-red)' },
              { label: 'Target', val: tgt, color: 'var(--color-primary)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{item.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: item.color }}>{item.val} kcal</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly calorie mini chart */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '0.5px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>This week</div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end', height: '48px' }}>
            {DAYS.map((d, i) => {
              const cal = weekCals[i]
              const barH = cal ? Math.round((cal / maxCal) * 40) : 0
              const isToday = i === activeDay
              const col = cal > tgt * 1.1 ? 'var(--color-red)' : cal > tgt * 0.85 ? 'var(--color-primary)' : cal > 0 ? 'var(--color-amber)' : 'var(--color-border)'
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '100%', background: 'var(--color-border)', borderRadius: '4px', height: '40px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: `${barH}px`, background: col, borderRadius: '4px', transition: 'height 0.4s ease' }} />
                  </div>
                  <div style={{ fontSize: '9px', color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: isToday ? '700' : '400', textTransform: 'uppercase' }}>{d[0]}</div>
                </div>
              )
            })}
          </div>
          {/* Target line label */}
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: 'right' as const }}>
            Target: {tgt} kcal/day
          </div>
        </div>

        {/* Macro mini row */}
        {todayMeal?.macros && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '0.5px solid var(--color-border)' }}>
            {[
              { label: 'Protein', val: todayMeal.macros.protein + 'g', color: 'var(--color-primary)' },
              { label: 'Carbs', val: todayMeal.macros.carbs + 'g', color: 'var(--color-blue)' },
              { label: 'Fat', val: todayMeal.macros.fat + 'g', color: 'var(--color-purple)' },
            ].map(m => (
              <div key={m.label} style={{ flex: 1, textAlign: 'center' as const, background: 'var(--color-bg)', borderRadius: '8px', padding: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: m.color }}>{m.val}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <button className="pressable" onClick={onLogFood}
          style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid var(--color-border)`, background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🍽️</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>Log food</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{foodLog.length} items today</div>
        </button>
        <button className="pressable" onClick={onLogActivity}
          style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid var(--color-border)`, background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏃</div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>Log activity</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{totalBurned > 0 ? `${totalBurned} kcal burned` : 'Nothing yet'}</div>
        </button>
      </div>

      {/* Today's meal */}
      <div className="card anim-fade-slide" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>Today's meal</div>
          <button className="pressable" onClick={onViewAllMeals}
            style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>
            View all →
          </button>
        </div>
        {todayMeal ? (
          <div style={{ background: 'var(--color-primary-pale)', borderRadius: '10px', padding: '10px 12px', border: `1px solid var(--color-primary-border)` }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '3px' }}>{todayMeal.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{todayMeal.macros?.calories} kcal · {todayMeal.macros?.protein}g protein</div>
          </div>
        ) : (
          <div className="pressable" onClick={onAddMeal}
            style={{ background: 'var(--color-bg)', borderRadius: '10px', padding: '10px 12px', border: `1.5px dashed var(--color-border)`, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>+</div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No meal planned for {DAYS[activeDay]}</span>
          </div>
        )}
      </div>

      {/* Water + streak row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>

        {/* Water card */}
        <div className="card pressable" onClick={() => onSwitchTab('health')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: '8px' }}>💧 Water</div>
          <div style={{ textAlign: 'center' as const, marginBottom: '6px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600', color: goalReached ? 'var(--color-cyan)' : 'var(--color-cyan)' }}>
              {waterToday >= 1000 ? (waterToday / 1000).toFixed(1) + 'L' : waterToday + 'ml'}
            </div>
            <div style={{ fontSize: '11px', color: goalReached ? 'var(--color-primary)' : 'var(--color-text-muted)', marginTop: '2px' }}>
              {goalReached ? '✅ Goal met!' : `${Math.round(waterPct * 100)}% of goal`}
            </div>
          </div>
          {/* 5-segment bar */}
          <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ flex: 1, height: '5px', borderRadius: '3px', background: i < filledGlasses ? 'var(--color-cyan)' : 'var(--color-border)', transition: 'background 0.3s' }} />
            ))}
          </div>
          {/* Quick add buttons — grayed out when goal reached */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[250, 500].map(ml => (
              <button key={ml} className={goalReached ? '' : 'pressable'} onClick={e => { e.stopPropagation(); if (!goalReached) onAddWater(ml) }}
                style={{ flex: 1, padding: '5px 4px', borderRadius: '8px', border: `1px solid ${goalReached ? 'var(--color-border)' : 'var(--color-cyan-border)'}`, background: goalReached ? 'var(--color-bg)' : 'var(--color-cyan-pale)', fontSize: '11px', color: goalReached ? 'var(--color-text-muted)' : 'var(--color-cyan)', cursor: goalReached ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: '500', opacity: goalReached ? 0.5 : 1 }}>
                +{ml}ml
              </button>
            ))}
          </div>
        </div>

        {/* Streak + weight card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Streak — colored when active */}
          <div className="pressable" onClick={() => onSwitchTab('health')}
            style={{ flex: 1, borderRadius: '14px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const, background: waterStreak > 0 ? 'linear-gradient(135deg,#E67E22,#D4833A)' : 'var(--color-surface)', border: waterStreak > 0 ? 'none' : `1px solid var(--color-border)`, boxShadow: waterStreak > 0 ? '0 4px 16px rgba(230,126,34,0.3)' : 'none' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: waterStreak > 0 ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: '4px' }}>🔥 Streak</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: '600', color: waterStreak > 0 ? '#fff' : 'var(--color-text-muted)', lineHeight: 1 }}>{waterStreak}</div>
            <div style={{ fontSize: '11px', color: waterStreak > 0 ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', marginTop: '2px' }}>{waterStreak === 1 ? 'day' : 'days'}</div>
          </div>

          {/* Weight */}
          {latestWeight && (
            <div className="card pressable" onClick={() => onSwitchTab('health')} style={{ cursor: 'pointer', textAlign: 'center' as const }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: '4px' }}>⚖️ Weight</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600', color: 'var(--color-text)' }}>
                {latestWeight.value} <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>kg</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly plan — no Plan button */}
      <div className="card anim-fade-slide">
        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)', marginBottom: '10px' }}>Weekly meal plan</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {DAYS.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: meals[i] ? 'var(--color-primary)' : i === activeDay ? 'var(--color-primary-pale)' : 'var(--color-bg)', border: `1.5px solid ${meals[i] ? 'var(--color-primary)' : i === activeDay ? 'var(--color-primary-light)' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                {meals[i]
                  ? <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>
                  : <span style={{ fontSize: '11px', color: i === activeDay ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{d[0]}</span>
                }
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
          {Object.keys(meals).length} of 7 days planned
        </div>
      </div>
    </div>
  )
}