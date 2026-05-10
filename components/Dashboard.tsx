'use client'

// ─── types ────────────────────────────────────────────────────────────────────
interface Props {
  user: any; profile: any; meals: Record<string,any>
  foodLog: any[]; activityLog: any[]; weightLog: any[]
  waterToday: number; waterGoal: number; waterStreak: number
  activeDate: string; activeDateLabel: string; avatarEmoji: string
  onAddMeal: ()=>void; onLogFood: ()=>void; onLogActivity: ()=>void
  onAddWater: (ml:number)=>void; onSwitchTab: (t:string)=>void
  onViewAllMeals: ()=>void; onGoToProfile: ()=>void
}

const TARGET: Record<string,number> = { bulk:2700, cut:1750, maintain:2000, energy:2000, gut:1900 }
const GL: Record<string,string> = { bulk:'Bulking', cut:'Cutting', maintain:'Balanced', energy:'Energy boost', gut:'Gut health' }

export default function Dashboard(p: Props) {
  const tgt = p.profile?.tdee || TARGET[p.profile?.goal] || 2000
  const todayMeal = p.meals[p.activeDate]
  const loggedCals = p.foodLog.reduce((a:number,x:any)=>a+(x.calories||0),0)
  const totalIn = (todayMeal?.macros?.calories||0) + loggedCals
  const totalBurned = p.activityLog.reduce((a:number,x:any)=>a+(x.burned||0),0)
  const net = totalIn - totalBurned
  const remaining = Math.max(tgt - net, 0)
  const ringPct = Math.min(net / tgt, 1)
  const waterPct = Math.min(p.waterToday / p.waterGoal, 1)
  const goalReached = p.waterToday >= p.waterGoal
  const latestWeight = p.weightLog[p.weightLog.length - 1]
  const displayName = p.profile?.username || p.user?.email?.split('@')[0] || 'there'
  const hr = new Date().getHours()
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'

  // ring geometry
  const R = 44, stroke = 9, circ = 2 * Math.PI * R
  const dash = ringPct * circ
  const ringColor = net > tgt * 1.1 ? 'var(--color-red)' : net > tgt * 0.85 ? 'var(--color-primary)' : 'var(--color-blue)'

  // macros
  const protein = p.profile?.protein_target || Math.round(tgt * 0.3 / 4)
  const carbs   = p.profile?.carbs_target   || Math.round(tgt * 0.4 / 4)
  const fat      = p.profile?.fat_target     || Math.round(tgt * 0.3 / 9)
  const loggedP = p.foodLog.reduce((a:number,x:any)=>a+(x.protein||0),0)
  const loggedC = p.foodLog.reduce((a:number,x:any)=>a+(x.carbs||0),0)
  const loggedF = p.foodLog.reduce((a:number,x:any)=>a+(x.fat||0),0)

  const macros = [
    { label:'Protein', logged:loggedP, target:protein, color:'var(--color-primary)' },
    { label:'Carbs',   logged:loggedC, target:carbs,   color:'var(--color-blue)' },
    { label:'Fat',     logged:loggedF, target:fat,     color:'var(--color-amber)' },
  ]

  const pip = (fill: boolean) => (
    <div style={{ flex:1, height:'4px', borderRadius:'2px', background: fill ? 'var(--color-cyan)' : 'var(--color-border)', transition:'background .3s' }}/>
  )

  return (
    <div className="anim-fade-slide" style={{ padding:'1rem 1.25rem 1rem' }}>

      {/* ── Greeting row ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
        <div>
          <div style={{ fontSize:'12px', color:'var(--color-text-muted)', marginBottom:'2px' }}>{greeting}</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:'600', color:'var(--color-text)', letterSpacing:'-0.5px', lineHeight:1.1 }}>{displayName}</div>
          {p.profile?.goal && (
            <div style={{ fontSize:'12px', color:'var(--color-primary)', marginTop:'4px', display:'flex', alignItems:'center', gap:'5px' }}>
              <i className="ti ti-target" style={{ fontSize:'12px' }}/>
              {GL[p.profile.goal]} · €{p.profile.budget}/week
            </div>
          )}
        </div>
        <div className="pressable" onClick={p.onGoToProfile}
          style={{ width:'46px', height:'46px', borderRadius:'50%', background:'var(--color-primary-pale)', border:`2px solid var(--color-primary-border)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', cursor:'pointer', flexShrink:0 }}>
          {p.avatarEmoji}
        </div>
      </div>

      {/* ── Calorie ring card ── */}
      <div className="card" style={{ marginBottom:'10px', padding:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1.25rem' }}>
          {/* ring */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-border)" strokeWidth={stroke}/>
              <circle cx="50" cy="50" r={R} fill="none" stroke={ringColor} strokeWidth={stroke}
                strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
                strokeLinecap="round" transform="rotate(-90 50 50)"
                style={{ transition:'stroke-dasharray .5s ease' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:'600', color:ringColor, lineHeight:1 }}>{remaining}</div>
              <div style={{ fontSize:'9px', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'.04em', marginTop:'1px' }}>kcal left</div>
            </div>
          </div>
          {/* stats */}
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'14px', fontWeight:'600', color:'var(--color-text)', marginBottom:'10px' }}>Today's calories</div>
            {[
              { label:'Eaten',  val:totalIn,     color:'var(--color-amber)' },
              { label:'Burned', val:totalBurned, color:'var(--color-red)' },
              { label:'Target', val:tgt,         color:'var(--color-primary)' },
            ].map(s=>(
              <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                <span style={{ fontSize:'12px', color:'var(--color-text-muted)', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:s.color, display:'inline-block', flexShrink:0 }}/>
                  {s.label}
                </span>
                <span style={{ fontSize:'12px', fontWeight:'600', color:s.color }}>{s.val} kcal</span>
              </div>
            ))}
          </div>
        </div>

        {/* macro bars */}
        <div style={{ marginTop:'14px', paddingTop:'12px', borderTop:'0.5px solid var(--color-border)' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'10px' }}>Macros today</div>
          {macros.map(m => {
            const pct = Math.min((m.logged / Math.max(m.target,1)) * 100, 100)
            const over = m.logged > m.target
            return (
              <div key={m.label} style={{ marginBottom:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'11px', color:'var(--color-text-muted)', width:'46px', flexShrink:0 }}>{m.label}</span>
                <div style={{ flex:1, height:'5px', background:'var(--color-border)', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background: over ? 'var(--color-red)' : m.color, borderRadius:'3px', transition:'width .5s ease' }}/>
                </div>
                <span style={{ fontSize:'11px', fontWeight:'500', color: over ? 'var(--color-red)' : m.color, width:'62px', textAlign:'right' as const, flexShrink:0 }}>
                  {m.logged}g<span style={{ fontWeight:'400', color:'var(--color-text-muted)' }}>/{m.target}g</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
        {[
          { icon:'ti-plus', color:'var(--color-primary)', label:'Log food', sub:`${p.foodLog.length} items today`, fn:p.onLogFood },
          { icon:'ti-run',  color:'var(--color-red)',     label:'Log activity', sub:totalBurned>0?`${totalBurned} kcal burned`:'Nothing yet', fn:p.onLogActivity },
        ].map(b=>(
          <button key={b.label} className="pressable" onClick={b.fn}
            style={{ padding:'14px 12px', borderRadius:'14px', border:`1px solid var(--color-border)`, background:'var(--color-surface)', cursor:'pointer', fontFamily:'inherit', textAlign:'left' as const }}>
            <i className={`ti ${b.icon}`} style={{ fontSize:'20px', color:b.color, display:'block', marginBottom:'6px' }}/>
            <div style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text)' }}>{b.label}</div>
            <div style={{ fontSize:'11px', color:'var(--color-text-muted)', marginTop:'1px' }}>{b.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Today's meal ── */}
      <div className="card" style={{ marginBottom:'10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <div style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text)', display:'flex', alignItems:'center', gap:'7px' }}>
            <i className="ti ti-salad" style={{ fontSize:'16px', color:'var(--color-primary)' }}/>
            Today's meal
          </div>
          <button className="pressable" onClick={p.onViewAllMeals}
            style={{ fontSize:'12px', color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'500', display:'flex', alignItems:'center', gap:'3px' }}>
            View all <i className="ti ti-arrow-right" style={{ fontSize:'12px' }}/>
          </button>
        </div>
        {todayMeal ? (
          <div style={{ background:'var(--color-primary-pale)', borderRadius:'12px', padding:'12px', border:`1px solid var(--color-primary-border)` }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'15px', fontWeight:'600', color:'var(--color-text)', marginBottom:'3px' }}>{todayMeal.name}</div>
            <div style={{ fontSize:'12px', color:'var(--color-text-muted)' }}>{todayMeal.macros?.calories} kcal · {todayMeal.macros?.protein}g protein</div>
          </div>
        ) : (
          <div className="pressable" onClick={p.onAddMeal}
            style={{ background:'var(--color-bg)', borderRadius:'12px', padding:'12px 14px', border:`1.5px dashed var(--color-border)`, display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
            <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'var(--color-primary-pale)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-plus" style={{ fontSize:'16px', color:'var(--color-primary)' }}/>
            </div>
            <div>
              <div style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text)' }}>No meal planned</div>
              <div style={{ fontSize:'11px', color:'var(--color-text-muted)', marginTop:'1px' }}>Tap to get an AI suggestion</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Water + Streak ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
        {/* water */}
        <div className="card pressable" onClick={()=>p.onSwitchTab('health')}
          style={{ cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' as const, padding:'14px 12px' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'6px', display:'flex', alignItems:'center', gap:'4px' }}>
            <i className="ti ti-droplet" style={{ fontSize:'12px', color:'var(--color-cyan)' }}/> Water
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:'600', color:'var(--color-cyan)', marginBottom:'2px' }}>
            {p.waterToday >= 1000 ? (p.waterToday/1000).toFixed(1)+'L' : p.waterToday+'ml'}
          </div>
          <div style={{ fontSize:'11px', color: goalReached ? 'var(--color-primary)' : 'var(--color-text-muted)', marginBottom:'8px' }}>
            {goalReached ? 'Goal met' : Math.round(waterPct*100)+'%'}
          </div>
          <div style={{ display:'flex', gap:'3px', width:'100%', marginBottom:'8px' }}>
            {Array.from({length:5},(_,i)=>pip(i < Math.min(5,Math.round(waterPct*5))))}
          </div>
          <div style={{ display:'flex', gap:'4px', width:'100%' }}>
            {[250,500].map(ml=>(
              <button key={ml} onClick={e=>{ e.stopPropagation(); if(!goalReached) p.onAddWater(ml) }}
                style={{ flex:1, padding:'5px 0', borderRadius:'8px', border:`1px solid ${goalReached?'var(--color-border)':'var(--color-cyan-border)'}`, background: goalReached?'transparent':'var(--color-cyan-pale)', fontSize:'11px', color: goalReached?'var(--color-text-muted)':'var(--color-cyan)', cursor: goalReached?'not-allowed':'pointer', fontFamily:'inherit', fontWeight:'500', opacity: goalReached?0.5:1 }}>
                +{ml}ml
              </button>
            ))}
          </div>
        </div>

        {/* streak */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <div className="pressable" onClick={()=>p.onSwitchTab('health')}
            style={{ flex:1, borderRadius:'14px', padding:'14px 12px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' as const, background: p.waterStreak>0 ? 'linear-gradient(135deg,#E67E22,#D4833A)' : 'var(--color-surface)', border: p.waterStreak>0 ? 'none' : `1px solid var(--color-border)` }}>
            <i className={`ti ti-flame ${p.waterStreak>=1?'anim-pulse':''}`} style={{ fontSize:'26px', color: p.waterStreak>0 ? '#fff' : 'var(--color-text-muted)', display:'block', marginBottom:'4px' }}/>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:'700', color: p.waterStreak>0 ? '#fff' : 'var(--color-text-muted)', lineHeight:1 }}>{p.waterStreak}</div>
            <div style={{ fontSize:'10px', color: p.waterStreak>0 ? 'rgba(255,255,255,.7)' : 'var(--color-text-muted)', marginTop:'3px', textTransform:'uppercase', letterSpacing:'.06em' }}>day streak</div>
          </div>
          {latestWeight && (
            <div className="card pressable" onClick={()=>p.onSwitchTab('health')} style={{ cursor:'pointer', textAlign:'center' as const, padding:'12px' }}>
              <div style={{ fontSize:'10px', fontWeight:'600', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'4px', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px' }}>
                <i className="ti ti-scale" style={{ fontSize:'12px' }}/> Weight
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:'600', color:'var(--color-text)' }}>
                {latestWeight.value}<span style={{ fontSize:'12px', color:'var(--color-text-muted)' }}> kg</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Next 7 days dots ── */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <div style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text)', display:'flex', alignItems:'center', gap:'7px' }}>
            <i className="ti ti-calendar-week" style={{ fontSize:'16px', color:'var(--color-primary)' }}/>
            Next 7 days
          </div>
          <span style={{ fontSize:'12px', color:'var(--color-text-muted)' }}>{Object.values(p.meals).filter(Boolean).length} planned</span>
        </div>
        <div style={{ display:'flex', gap:'5px' }}>
          {Array.from({length:7},(_,i)=>{
            const d=new Date(); d.setDate(d.getDate()+i)
            const dk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            const names=['Su','Mo','Tu','We','Th','Fr','Sa']
            const has=!!p.meals[dk]
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'50%', background: has?'var(--color-primary)':i===0?'var(--color-primary-pale)':'var(--color-bg)', border:`1.5px solid ${has?'var(--color-primary)':i===0?'var(--color-primary-light)':'var(--color-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                  {has
                    ? <i className="ti ti-check" style={{ fontSize:'13px', color:'#fff' }}/>
                    : <span style={{ fontSize:'11px', color:i===0?'var(--color-primary)':'var(--color-text-muted)' }}>{names[d.getDay()]}</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}