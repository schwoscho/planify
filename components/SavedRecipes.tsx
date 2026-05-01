'use client'

import { useState, useEffect } from 'react'
import { getSavedRecipes, saveRecipe, deleteSavedRecipe } from '@/lib/db'

interface SavedRecipesProps {
  userId: string
  onAddToDay: (meal: any) => void
}

export default function SavedRecipes({ userId, onAddToDay }: SavedRecipesProps) {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try { setRecipes(await getSavedRecipes(userId) || []) } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function remove(id: string) {
    try { await deleteSavedRecipe(userId, id); await load() } catch (e) { console.error(e) }
  }

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
      Loading saved recipes...
    </div>
  )

  if (!recipes.length) return (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>❤️</div>
      <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>No saved recipes yet</div>
      <div style={{ fontSize: '13px', lineHeight: '1.6' }}>When Planify suggests a meal you love, tap the ❤️ to save it here for quick access.</div>
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text)' }}>
        ❤️ Saved recipes <span style={{ fontSize: '13px', fontWeight: '400', color: 'var(--color-text-muted)' }}>({recipes.length})</span>
      </div>
      {recipes.map((recipe: any) => (
        <div key={recipe.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '12px 14px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '600', color: 'var(--color-text)', flex: 1 }}>{recipe.name}</div>
            <button onClick={() => remove(recipe.id)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 0 0 8px' }}>×</button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px', lineHeight: '1.5' }}>{recipe.description}</div>
          {recipe.macros && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {[
                { val: recipe.macros.calories, label: 'kcal', color: 'var(--color-amber)' },
                { val: recipe.macros.protein + 'g', label: 'protein', color: 'var(--color-primary)' },
                { val: recipe.macros.carbs + 'g', label: 'carbs', color: 'var(--color-blue)' },
                { val: recipe.macros.fat + 'g', label: 'fat', color: 'var(--color-purple)' },
              ].map(m => (
                <div key={m.label} style={{ flex: 1, background: 'var(--color-bg)', borderRadius: '8px', padding: '6px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: m.color }}>{m.val}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' as const }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {recipe.timeTag && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'var(--color-blue-pale)', color: 'var(--color-blue)', border: '1px solid var(--color-blue-border)' }}>{recipe.timeTag}</span>}
            {recipe.diffTag && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'var(--color-amber-pale)', color: 'var(--color-amber)', border: '1px solid var(--color-amber-border)' }}>{recipe.diffTag}</span>}
          </div>
          <button onClick={() => onAddToDay({ ...recipe, desc: recipe.description })}
            style={{ width: '100%', marginTop: '10px', padding: '9px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Add to today →
          </button>
        </div>
      ))}
    </div>
  )
}