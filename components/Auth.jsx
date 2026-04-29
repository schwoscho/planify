'use client'

import { useState } from 'react'
import { signIn, signUp } from '@/lib/auth'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setSuccess('Account created! Please check your email to confirm your account.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: '#F0FAF4', border: '2px solid #B7E4C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', margin: '0 auto 12px'
          }}>🥗</div>
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: '28px',
            fontWeight: '600', color: '#2D6A4F', letterSpacing: '-0.5px'
          }}>
            Plan<span style={{ fontStyle: 'italic', fontWeight: '300' }}>ify</span>
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Your nutrition & fitness companion
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '20px',
          border: '1px solid #e8e8e4', padding: '1.75rem'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: '0', marginBottom: '1.5rem',
            background: '#F0FAF4', borderRadius: '10px', padding: '4px'
          }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                  fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all .18s',
                  background: mode === m ? '#2D6A4F' : 'transparent',
                  color: mode === m ? '#fff' : '#6b7280',
                }}>
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px',
                  border: '1.5px solid #e8e8e4', fontSize: '14px', outline: 'none',
                  fontFamily: 'inherit', background: '#FAFAF8', color: '#1a1a1a',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px',
                  border: '1.5px solid #e8e8e4', fontSize: '14px', outline: 'none',
                  fontFamily: 'inherit', background: '#FAFAF8', color: '#1a1a1a',
                  boxSizing: 'border-box'
                }}
              />
              {mode === 'signup' && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  Minimum 6 characters
                </div>
              )}
            </div>

            {error && (
              <div style={{
                background: '#FDEDEC', border: '1px solid #F5B7B1', borderRadius: '8px',
                padding: '10px 12px', fontSize: '13px', color: '#C0392B', marginBottom: '12px'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                background: '#F0FAF4', border: '1px solid #B7E4C7', borderRadius: '8px',
                padding: '10px 12px', fontSize: '13px', color: '#2D6A4F', marginBottom: '12px'
              }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px', background: loading ? '#B7E4C7' : '#2D6A4F',
                color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px',
                fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'opacity .2s'
              }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '12px', color: '#6b7280' }}>
          By signing up you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  )
}