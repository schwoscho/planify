'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Auth from '@/components/Auth'
import Onboarding from '@/components/Onboarding'
import TDEECalculator from '@/components/TDEECalculator'
import MainApp from '@/components/MainApp'
import { saveProfile } from '@/lib/auth'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showTDEE, setShowTDEE] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
      // Show TDEE calculator if profile exists but no TDEE set yet
      if (data && !data.tdee) setShowTDEE(true)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleTDEEComplete(targets: any) {
    try {
      const updated = await saveProfile(user.id, {
        ...profile,
        tdee: targets.tdee,
        protein_target: targets.protein,
        carbs_target: targets.carbs,
        fat_target: targets.fat,
      })
      setProfile(updated)
      setShowTDEE(false)
    } catch (e) { console.error(e) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#FAFAF8', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '32px' }}>🥗</div>
      <div style={{ fontFamily: 'serif', fontSize: '22px', color: '#2D6A4F' }}>Planify</div>
      <div style={{ fontSize: '13px', color: '#6b7280' }}>Loading...</div>
    </div>
  )

  if (!user) return <Auth />
  if (!profile) return <Onboarding user={user} onComplete={(p: any) => { setProfile(p); setShowTDEE(true) }} />
  if (showTDEE) return <TDEECalculator goal={profile.goal} onComplete={handleTDEEComplete} onSkip={() => setShowTDEE(false)} />
  return <MainApp user={user} profile={profile} onProfileUpdate={setProfile} />
}