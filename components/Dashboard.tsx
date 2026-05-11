'use client'

const GL: Record<string,string> = { bulk:'Bulking', cut:'Cutting', maintain:'Balanced', energy:'Energy boost', gut:'Gut health' }
const TARGET: Record<string,number> = { bulk:2700, cut:1750, maintain:2000, energy:2000, gut:1900 }

interface Props {
  user: any; profile: any; meals: Record<string,any>; foodLog: any[]
  activityLog: any[]; waterToday: number; waterGoal: number; waterStreak: number
  weightLog: any[]; activeDate: string; activeDateLabel: string; avatarEmoji: string
  onAddMeal:()=>void; onLogFood:()=>void; onLogActivity:()=>void
  onAddWater:(ml:number)=>void; onSwitchTab:(tab:string)=>void
  onViewAllMeals:()=>void; onGoToProfile:()=>void
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
  const macroFat     = p.profile?.fat_target      || Math.round(tgt*0.3/9)
  const logP = p.foodLog.reduce((a:number,x:any)=>a+(x.protein||0),0)
  const logC = p.foodLog.reduce((a:number,x:any)=>a+(x.carbs||0),0)
  const logF = p.foodLog.reduce((a:number,x:any)=>a+(x.fat||0),0)

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
          style={{width:'46px',height:'46px',borderRadius:'50%',background:'var(--color-primary-pale)',border:`1.5px solid var(--color-primary-border)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',cursor:'pointer',flexShrink:0}}>
          {p.avatarEmoji}
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

      {/* Sage insight card */}
      {(()=>{
        const remainingProtein=Math.max(macroProtein-logP,0)
        const calPct=tgt>0?Math.round((net/tgt)*100):0
        let insight=''
        if(net===0) insight=`Log your first meal to get started. Your target is ${tgt} kcal today.`
        else if(remainingProtein>20) insight=`You're ${remainingProtein}g short on protein today. Try chicken, eggs, or Greek yogurt.`
        else if(calPct>110) insight=`You're over your calorie target. Consider a lighter dinner or some extra activity.`
        else if(calPct>=85) insight=`Almost at your target — ${Math.max(tgt-net,0)} kcal left. Great work today!`
        else if(p.waterToday<p.waterGoal*0.5) insight=`Don't forget to hydrate — you're at ${Math.round((p.waterToday/p.waterGoal)*100)}% of your water goal.`
        else if(p.waterStreak>=3) insight=`${p.waterStreak}-day water streak! You're building a great habit.`
        else insight=`${Math.max(tgt-net,0)} kcal remaining. You're on track today.`
        return (
          <div style={{background:'var(--surface)',border:`0.5px solid var(--border)`,borderRadius:'var(--radius-lg)',padding:'12px 14px',marginBottom:'10px',display:'flex',gap:'10px',alignItems:'flex-start'}}>
            <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'var(--primary-pale)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-robot" style={{fontSize:'15px',color:'var(--primary)'}}/>
            </div>
            <div>
              <div style={{fontSize:'10px',fontWeight:'600',color:'var(--primary)',textTransform:'uppercase' as const,letterSpacing:'.06em',marginBottom:'3px'}}>Sage</div>
              <div style={{fontSize:'13px',color:'var(--text)',lineHeight:'1.5'}}>{insight}</div>
            </div>
          </div>
        )
      })()}

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

      {/* Today's meal */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <div style={{fontSize:'12px',fontWeight:'600',color:'var(--color-text)',display:'flex',alignItems:'center',gap:'7px'}}>
            <i className="ti ti-salad" style={{fontSize:'14px',color:'var(--color-primary)'}}/>
            {dateStr} meal
          </div>
          <button onClick={p.onViewAllMeals} style={{fontSize:'12px',color:'var(--color-primary)',background:'none',border:'none',cursor:'pointer',fontWeight:'500',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',gap:'3px'}}>
            View all <i className="ti ti-arrow-right" style={{fontSize:'11px'}}/>
          </button>
        </div>
        {todayMeal ? (
          <div style={{background:'var(--color-primary-pale)',borderRadius:'var(--radius-md)',padding:'11px 13px',border:`0.5px solid var(--color-primary-border)`}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:'15px',color:'var(--color-text)',marginBottom:'2px'}}>{todayMeal.name}</div>
            <div style={{fontSize:'11px',color:'var(--color-text-muted)'}}>{todayMeal.macros?.calories} kcal · {todayMeal.macros?.protein}g protein</div>
          </div>
        ) : (
          <div className="pressable" onClick={p.onAddMeal}
            style={{borderRadius:'var(--radius-md)',padding:'12px',border:`1.5px dashed var(--color-border)`,display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
            <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'var(--color-primary-pale)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-plus" style={{fontSize:'16px',color:'var(--color-primary)'}}/>
            </div>
            <span style={{fontSize:'13px',color:'var(--color-text-muted)'}}>No meal planned for {p.activeDateLabel}</span>
          </div>
        )}
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