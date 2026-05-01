'use client'

import { useEffect, useRef, useState } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export default function Modal({ open, onClose, children, title, subtitle }: ModalProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setVisible(true)
      requestAnimationFrame(() => setAnimating(true))
      document.body.style.overflow = 'hidden'
    } else {
      setAnimating(false)
      const t = setTimeout(() => {
        setVisible(false)
        document.body.style.overflow = ''
      }, 320)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: `rgba(0,0,0,${animating ? 0.5 : 0})`,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 100,
        transition: 'background 320ms ease',
        backdropFilter: animating ? 'blur(2px)' : 'none',
        WebkitBackdropFilter: animating ? 'blur(2px)' : 'none',
      }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '20px 20px 0 0',
        padding: '1.25rem 1.25rem 2rem',
        width: '100%', maxWidth: '420px',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)',
        transform: `translateY(${animating ? 0 : '100%'})`,
        transition: 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{ width: '36px', height: '4px', background: 'var(--color-border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
        {title && (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '600', marginBottom: subtitle ? '3px' : '1rem', color: 'var(--color-text)' }}>{title}</div>
        )}
        {subtitle && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>{subtitle}</div>
        )}
        {children}
      </div>
    </div>
  )
}