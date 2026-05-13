'use client'

const GL: Record<string,string> = { bulk:'Bulking', cut:'Cutting', maintain:'Balanced', energy:'Energy boost', gut:'Gut health' }
const TARGET: Record<string,number> = { bulk:2700, cut:1750, maintain:2000, energy:2000, gut:1900 }

interface Props {
  user: any; profile: any; meals: Record<string,any>; foodLog: any[]
  activityLog: any[]; waterToday: number; waterGoal: number; waterStreak: number
  weightLog: any[]; activeDate: string; activeDateLabel: string; avatarEmoji: string; avatarUrl?: string|null
  onAddMeal:()=>void; onLogFood:()=>void; onLogActivity:()=>void
  onAddWater:(ml:number)=>void; onSwitchTab:(tab:string)=>void
  onViewAllMeals:()=>void; onGoToProfile:()=>void
  sageDismissed: boolean; onDismissSage:()=>void
}

export default function Dashboard(p: Props) {
  const tgt = p.profile?.tdee || TARGET[p.profile?.goal] || 2000
  const todayMeal = p.meals[p.activeDate]
  const loggedCals = p.foodLog.reduce((a:number,x:any)=>a+(x.calories||0),0)
  const totalIn = (todayMeal?.macros?.calories||0) + loggedCals
  const totalBurned = p.activityLog.reduce((a:number,x:any)=>a+(x.burned||0),0)
  const net = totalIn - totalBurned
  const remaining = Math.max(tgt - net, 0)
  const pct = Math.min(net/tgt, 1)
  const waterPct = Math.min(p.waterToday/p.waterGoal,1)
  const goalReached = p.waterToday >= p.waterGoal
  const filledPips = Math.min(5, Math.round(waterPct*5))
  const latestWeight = p.weightLog[p.weightLog.length-1]

  const macroProtein = p.profile?.protein_target || Math.round(tgt*0.3/4)
  const macroCarbs   = p.profile?.carbs_target   || Math.round(tgt*0.4/4)

  // ── Planify Score (0–100) ──────────────────────────────────────────────
  // Weighted: calories 30%, protein 30%, water 25%, activity 15%
  const logP = p.foodLog.reduce((a:number,x:any)=>a+(x.protein||0),0)
  const calScore   = net>0 ? Math.round(Math.max(0, 1 - Math.abs(net-tgt)/tgt) * 30) : 0
  const protScore  = logP>0 ? Math.round(Math.min(logP/macroProtein, 1) * 30) : 0
  const waterScore = Math.round(waterPct * 25)
  const actScore   = p.activityLog.length>0 ? 15 : 0
  const planifyScore = calScore + protScore + waterScore + actScore
  const macroFat     = p.profile?.fat_target      || Math.round(tgt*0.3/9)
  const logC = p.foodLog.reduce((a:number,x:any)=>a+(x.carbs||0),0)
  const logF = p.foodLog.reduce((a:number,x:any)=>a+(x.fat||0),0)

  const scoreColor = planifyScore>=80?'var(--color-primary)':planifyScore>=50?'var(--color-amber)':'var(--color-red)'
  const scoreLabel = planifyScore>=80?'Excellent':planifyScore>=60?'Great':planifyScore>=40?'Good':planifyScore>=20?'Getting there':'Just starting'
  const scoreBg    = planifyScore>=80?'var(--primary-pale)':planifyScore>=50?'var(--amber-bg)':'var(--red-bg)'

  const hour = new Date().getHours()
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  const displayName = p.profile?.username || p.user?.email?.split('@')[0] || 'there'

  const radius=46, stroke=9, circ=2*Math.PI*radius
  const dash=pct*circ
  const ringColor = net>tgt*1.1?'var(--color-red)':net>tgt*0.85?'var(--color-primary)':'var(--color-blue)'

  const dateStr = (() => {
    const today = new Date().toISOString().slice(0,10)
    const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10)
    if (p.activeDate===today) return "Today's"
    if (p.activeDate===tomorrow) return "Tomorrow's"
    return p.activeDateLabel+"'s"
  })()

  return (
    <div className="anim-fade-up" style={{padding:'1rem 1.25rem 1rem',display:'flex',flexDirection:'column',gap:'10px'}}>

      {/* Greeting */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'2px'}}>
        <div>
          <div style={{fontSize:'12px',color:'var(--color-text-muted)',marginBottom:'1px'}}>{greeting}</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'26px',color:'var(--color-text)',lineHeight:1.1}}>{displayName}</div>
          {p.profile?.goal&&<div style={{fontSize:'11px',color:'var(--color-primary)',marginTop:'5px',display:'flex',alignItems:'center',gap:'5px'}}>
            <i className="ti ti-target" style={{fontSize:'12px'}}/>
            {GL[p.profile.goal]} · €{p.profile.budget}/week
          </div>}
        </div>
        <div className="pressable" onClick={p.onGoToProfile}
          style={{width:'46px',height:'46px',borderRadius:'50%',background:'var(--color-primary-pale)',border:`1.5px solid var(--color-primary-border)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',cursor:'pointer',flexShrink:0,overflow:'hidden'}}>
          {p.avatarUrl
            ? <img src={p.avatarUrl} alt="Avatar" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : p.avatarEmoji
          }
        </div>
      </div>

      {/* Calorie ring */}
      <div className="card card-lg" style={{display:'flex',alignItems:'center',gap:'16px'}}>
        <div className="ring-container" style={{width:'100px',height:'100px',flexShrink:0}}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke}/>
            <circle cx="50" cy="50" r={radius} fill="none" stroke={ringColor} strokeWidth={stroke}
              strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
              strokeLinecap="round" transform="rotate(-90 50 50)"
              style={{transition:'stroke-dasharray .5s ease'}}/>
          </svg>
          <div className="ring-center">
            <div className="ring-number" style={{color:ringColor}}>{remaining}</div>
            <div className="ring-label">kcal left</div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:'13px',fontWeight:'600',color:'var(--color-text)',marginBottom:'10px'}}>Today's calories</div>
          {[
            {label:'Eaten',  val:totalIn,     color:'var(--color-amber)',   dot:'var(--color-amber)'},
            {label:'Burned', val:totalBurned, color:'var(--color-red)',     dot:'var(--color-red)'},
            {label:'Target', val:tgt,         color:'var(--color-primary)', dot:'var(--color-primary)'},
          ].map(item=>(
            <div key={item.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'7px'}}>
              <span style={{fontSize:'12px',color:'var(--color-text-muted)',display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{width:'6px',height:'6px',borderRadius:'50%',background:item.dot,display:'inline-block',flexShrink:0}}/>
                {item.label}
              </span>
              <span style={{fontSize:'12px',fontWeight:'600',color:item.color}}>{item.val} kcal</span>
            </div>
          ))}
        </div>
      </div>

      {/* Macro bars */}
      <div className="card">
        <span className="sl">Macros today</span>
        {[
          {label:'Protein',logged:logP,target:macroProtein,color:'var(--color-primary)'},
          {label:'Carbs',  logged:logC,target:macroCarbs,  color:'var(--color-blue)'},
          {label:'Fat',    logged:logF,target:macroFat,    color:'var(--color-amber)'},
        ].map(m=>{
          const w=Math.min((m.logged/Math.max(m.target,1))*100,100)
          const over=m.logged>m.target
          return (
            <div key={m.label} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
              <span style={{fontSize:'11px',color:'var(--color-text-muted)',width:'44px',flexShrink:0}}>{m.label}</span>
              <div className="macro-bar-bg" style={{flex:1}}>
                <div className="macro-bar-fill" style={{width:`${w}%`,background:over?'var(--color-red)':m.color}}/>
              </div>
              <span style={{fontSize:'11px',fontWeight:'500',color:over?'var(--color-red)':m.color,width:'64px',textAlign:'right' as const,flexShrink:0}}>
                {m.logged}g/{m.target}g
              </span>
            </div>
          )
        })}
      </div>

      {/* Sage insight — dismissible, shown once per day */}
      {!p.sageDismissed&&(()=>{
        const remainingProtein=Math.max(macroProtein-logP,0)
        const calPct=tgt>0?Math.round((net/tgt)*100):0
        const insights=[
          net===0 && `Your daily target is ${tgt} kcal. Log your first meal to get started!`,
          remainingProtein>40 && `You're ${remainingProtein}g short on protein. Add eggs, chicken, or Greek yogurt.`,
          calPct>110 && `You're ${calPct-100}% over your calorie target. A lighter dinner or a walk would help.`,
          calPct>=85&&calPct<=100 && `Almost there — just ${Math.max(tgt-net,0)} kcal left. You're on track!`,
          p.waterToday<p.waterGoal*0.4 && `Hydration check — only ${Math.round((p.waterToday/p.waterGoal)*100)}% of your water goal.`,
          p.waterStreak>=7 && `${p.waterStreak}-day water streak! Consistency is the key to results.`,
          p.waterStreak>=3&&p.waterStreak<7 && `${p.waterStreak}-day streak going strong. Keep it up!`,
          Object.values(p.meals).filter(Boolean).length===0 && `No meals planned yet. Head to Meals for AI suggestions.`,
          p.activityLog.length===0&&net>0 && `No activity logged today. Even a 20-min walk burns ~100 kcal.`,
          calPct>0&&calPct<50 && `You've only hit ${calPct}% of your daily target. Make sure to eat enough.`,
          `${Math.max(tgt-net,0)} kcal remaining today. Stay consistent!`,
        ].filter(Boolean)
        const insight = insights[0] as string
        if (!insight) return null
        return (
          <div className="anim-scale-in" style={{background:'var(--surface)',border:`0.5px solid var(--border)`,borderRadius:'var(--radius-lg)',padding:'12px 14px',marginBottom:'10px',display:'flex',gap:'10px',alignItems:'flex-start'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'var(--primary-pale)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-robot" style={{fontSize:'14px',color:'var(--primary)'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'10px',fontWeight:'700',color:'var(--primary)',textTransform:'uppercase' as const,letterSpacing:'.06em',marginBottom:'3px'}}>Sage</div>
              <div style={{fontSize:'13px',color:'var(--text)',lineHeight:'1.5'}}>{insight}</div>
            </div>
            <button onClick={p.onDismissSage}
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:'0',flexShrink:0,lineHeight:1}}>
              <i className="ti ti-x" style={{fontSize:'14px'}}/>
            </button>
          </div>
        )
      })()}

      {/* Planify Score — single clean card */}
      <div style={{background:'var(--color-surface)',border:`0.5px solid var(--color-border)`,borderRadius:'var(--radius-lg)',padding:'16px',overflow:'hidden',position:'relative' as const}}>
        {/* Subtle background accent — very light */}
        <div style={{position:'absolute' as const,top:0,right:0,width:'72px',height:'72px',background:scoreBg,borderRadius:'0 var(--radius-lg) 0 80%',opacity:.25,pointerEvents:'none' as const}}/>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px',position:'relative' as const}}>
          <div>
            <div style={{fontSize:'10px',fontWeight:'700',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.08em',marginBottom:'4px'}}>Planify Score</div>
            <div style={{display:'flex',alignItems:'baseline',gap:'4px'}}>
              <span style={{fontFamily:'var(--font-display)',fontSize:'40px',fontWeight:'600',color:scoreColor,lineHeight:1}}>{planifyScore}</span>
              <span style={{fontSize:'13px',color:'var(--color-text-muted)',marginBottom:'2px'}}>/100</span>
            </div>
            <div style={{fontSize:'12px',fontWeight:'600',color:scoreColor,marginTop:'2px'}}>{scoreLabel}</div>
          </div>
          {/* Ring visualization */}
          <svg width="64" height="64" viewBox="0 0 64 64" style={{flexShrink:0}}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-border)" strokeWidth="7"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke={scoreColor} strokeWidth="7"
              strokeDasharray={`${(planifyScore/100)*2*Math.PI*26} ${2*Math.PI*26}`}
              strokeLinecap="round" transform="rotate(-90 32 32)"
              style={{transition:'stroke-dasharray .8s ease'}}/>
            <text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="700"
              fill={scoreColor} fontFamily="var(--font-display)">{planifyScore}</text>
          </svg>
        </div>
        {/* Breakdown bars */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
          {[
            {label:'Calories', score:calScore,  max:30, color:'var(--color-amber)'},
            {label:'Protein',  score:protScore, max:30, color:'var(--color-primary)'},
            {label:'Water',    score:waterScore,max:25, color:'var(--color-cyan)'},
            {label:'Activity', score:actScore,  max:15, color:'var(--color-red)'},
          ].map(s=>(
            <div key={s.label}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                <span style={{fontSize:'10px',color:'var(--color-text-muted)'}}>{s.label}</span>
                <span style={{fontSize:'10px',fontWeight:'600',color:s.color}}>{s.score}/{s.max}</span>
              </div>
              <div style={{height:'4px',background:'var(--color-border)',borderRadius:'2px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(s.score/s.max)*100}%`,background:s.color,borderRadius:'2px',transition:'width .6s ease'}}/>
              </div>
            </div>
          ))}
        </div>
        {planifyScore===0&&(
          <div style={{marginTop:'10px',fontSize:'12px',color:'var(--color-text-muted)',textAlign:'center' as const}}>
            Log a meal, drink water, or add activity to start earning points
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
        <button className="pressable" onClick={p.onLogFood}
          style={{padding:'13px 12px',borderRadius:'var(--radius-lg)',border:`0.5px solid var(--color-border)`,background:'var(--color-surface)',cursor:'pointer',fontFamily:'var(--font-body)',textAlign:'left' as const}}>
          <i className="ti ti-plus" style={{fontSize:'20px',color:'var(--color-primary)',display:'block',marginBottom:'6px'}}/>
          <div style={{fontSize:'13px',fontWeight:'500',color:'var(--color-text)'}}>Log food</div>
          <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>{p.foodLog.length>0?`${p.foodLog.length} items`:'Nothing yet'}</div>
        </button>
        <button className="pressable" onClick={p.onLogActivity}
          style={{padding:'13px 12px',borderRadius:'var(--radius-lg)',border:`0.5px solid var(--color-border)`,background:'var(--color-surface)',cursor:'pointer',fontFamily:'var(--font-body)',textAlign:'left' as const}}>
          <i className="ti ti-run" style={{fontSize:'20px',color:'var(--color-red)',display:'block',marginBottom:'6px'}}/>
          <div style={{fontSize:'13px',fontWeight:'500',color:'var(--color-text)'}}>Log activity</div>
          <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>{totalBurned>0?`${totalBurned} kcal burned`:'Nothing yet'}</div>
        </button>
      </div>

      {/* Meals quick access - replaces single "Today's meal" card */}
      <div className="card pressable" onClick={p.onViewAllMeals}
        style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',padding:'13px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="ti ti-salad" style={{fontSize:'18px',color:'var(--color-primary)'}}/>
          </div>
          <div>
            <div style={{fontSize:'14px',fontWeight:'600',color:'var(--color-text)'}}>Plan your meals</div>
            <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'1px'}}>
              {Object.keys(p.meals).length>0
                ? `${Object.keys(p.meals).length} meal${Object.keys(p.meals).length!==1?'s':''} planned this week`
                : 'Tap to get AI meal suggestions'}
            </div>
          </div>
        </div>
        <i className="ti ti-arrow-right" style={{fontSize:'15px',color:'var(--color-text-muted)'}}/>
      </div>

      {/* Water + streak */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
        <div className="card pressable" onClick={()=>p.onSwitchTab('health')}
          style={{cursor:'pointer',display:'flex',flexDirection:'column',gap:'6px'}}>
          <div style={{fontSize:'10px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',display:'flex',alignItems:'center',gap:'5px'}}>
            <i className="ti ti-droplet" style={{fontSize:'12px',color:'var(--color-cyan)'}}/>Water
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'22px',color:'var(--color-cyan)',lineHeight:1}}>
            {p.waterToday>=1000?(p.waterToday/1000).toFixed(1)+'L':p.waterToday+'ml'}
          </div>
          <div style={{fontSize:'11px',color:goalReached?'var(--color-primary)':'var(--color-text-muted)'}}>
            {goalReached?'Goal met':Math.round(waterPct*100)+'%'}
          </div>
          <div className="water-pips">
            {Array.from({length:5},(_,i)=><div key={i} className={`water-pip ${i<filledPips?'filled':''}`}/>)}
          </div>
          <div style={{display:'flex',gap:'4px',marginTop:'2px'}}>
            {[250,500].map(ml=>(
              <button key={ml} onClick={e=>{e.stopPropagation();if(!goalReached)p.onAddWater(ml)}}
                style={{flex:1,padding:'5px',borderRadius:'8px',border:`0.5px solid ${goalReached?'var(--color-border)':'var(--color-cyan-border)'}`,background:goalReached?'transparent':'var(--color-cyan-pale)',fontSize:'10px',color:goalReached?'var(--color-text-muted)':'var(--color-cyan)',cursor:goalReached?'default':'pointer',fontFamily:'var(--font-body)',fontWeight:'500',opacity:goalReached?.5:1}}>
                +{ml}ml
              </button>
            ))}
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          <div className="pressable" onClick={()=>p.onSwitchTab('health')}
            style={{flex:1,borderRadius:'var(--radius-lg)',padding:'13px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center' as const,background:p.waterStreak>0?'linear-gradient(135deg,#E67E22,#D4833A)':'var(--color-surface)',border:p.waterStreak>0?'none':`0.5px solid var(--color-border)`,boxShadow:p.waterStreak>0?'0 4px 16px rgba(230,126,34,.25)':'none'}}>
            <i className={`ti ti-flame${p.waterStreak>=1?' anim-pulse':''}`} style={{fontSize:'24px',color:p.waterStreak>0?'#fff':'var(--color-text-muted)',display:'block',marginBottom:'3px'}}/>
            <div style={{fontFamily:'var(--font-display)',fontSize:'28px',color:p.waterStreak>0?'#fff':'var(--color-text-muted)',lineHeight:1}}>{p.waterStreak}</div>
            <div style={{fontSize:'10px',color:p.waterStreak>0?'rgba(255,255,255,.65)':'var(--color-text-muted)',marginTop:'2px',textTransform:'uppercase' as const,letterSpacing:'.06em'}}>day streak</div>
          </div>
          {latestWeight&&(
            <div className="card pressable" onClick={()=>p.onSwitchTab('health')} style={{cursor:'pointer',textAlign:'center' as const}}>
              <div style={{fontSize:'10px',fontWeight:'600',color:'var(--color-text-muted)',textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:'4px',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                <i className="ti ti-scale" style={{fontSize:'12px'}}/>Weight
              </div>
              <div style={{fontFamily:'var(--font-display)',fontSize:'20px',color:'var(--color-text)'}}>
                {latestWeight.value}<span style={{fontSize:'11px',color:'var(--color-text-muted)',marginLeft:'3px'}}>kg</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next 7 days */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <div style={{fontSize:'12px',fontWeight:'600',color:'var(--color-text)',display:'flex',alignItems:'center',gap:'7px'}}>
            <i className="ti ti-calendar-week" style={{fontSize:'14px',color:'var(--color-primary)'}}/>
            Next 7 days
          </div>
          <span style={{fontSize:'11px',color:'var(--color-text-muted)'}}>{Object.values(p.meals).filter(Boolean).length} planned</span>
        </div>
        <div style={{display:'flex',gap:'5px'}}>
          {Array.from({length:7},(_,i)=>{
            const d=new Date(); d.setDate(d.getDate()+i)
            const dk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            const dns=['Su','Mo','Tu','We','Th','Fr','Sa']
            return (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
                <div style={{width:'30px',height:'30px',borderRadius:'50%',background:p.meals[dk]?'var(--color-primary)':i===0?'var(--color-primary-pale)':'transparent',border:`1px solid ${p.meals[dk]?'var(--color-primary)':i===0?'var(--color-primary-border)':'var(--color-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:p.meals[dk]?'12px':'11px',color:p.meals[dk]?'#fff':i===0?'var(--color-primary)':'var(--color-text-muted)',transition:'all .2s'}}>
                  {p.meals[dk]?'✓':dns[d.getDay()]}
                </div>
                <span style={{fontSize:'9px',color:'var(--color-text-muted)'}}>{d.getDate()}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}