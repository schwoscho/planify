'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Auth from '@/components/Auth'
import Onboarding from '@/components/Onboarding'
import MainApp from '@/components/MainApp'

export default function Home() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  function handleProfileSaved(newProfile) {
    setProfile(newProfile)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#FAFAF8', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ fontSize: '32px' }}>🥗</div>
        <div style={{ fontFamily: 'serif', fontSize: '22px', color: '#2D6A4F' }}>Planify</div>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  if (!user) return <Auth />
  if (!profile) return <Onboarding user={user} onComplete={handleProfileSaved} />
  return <MainApp user={user} profile={profile} onProfileUpdate={setProfile} />
}