import { supabase } from './supabase'

// ─── MEALS ────────────────────────────────────────────────────────────────────

export async function saveMeal(userId, weekStart, dayIndex, meal) {
  // Support both old day_index system and new slot_key system
  const planDate = meal.plan_date || (() => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + dayIndex)
    return d.toISOString().split('T')[0]
  })()
  
  const mealSlot = meal.meal_slot || 'lunch'
  const slotKey = meal.slot_key || `${planDate}_${mealSlot}`

  const { data, error } = await supabase
    .from('meals')
    .upsert({
      user_id: userId,
      week_start: weekStart,
      day_index: dayIndex,
      plan_date: planDate,
      meal_slot: mealSlot,
      slot_key: slotKey,
      name: meal.name,
      description: meal.desc || meal.description || '',
      servings: meal.servings || 2,
      macros: meal.macros || null,
      ingredients: meal.ingredients || null,
      emoji: meal.emoji || null,
      cuisine: meal.cuisine || null,
      time_tag: meal.timeTag || null,
      diff_tag: meal.diffTag || null,
    }, {
      onConflict: 'user_id,slot_key',
      ignoreDuplicates: false,
    })
    .select()

  if (error) {
    // Fallback: try upsert by day_index if slot_key conflict fails
    console.error('saveMeal error:', error)
    const { data: d2, error: e2 } = await supabase
      .from('meals')
      .upsert({
        user_id: userId,
        week_start: weekStart,
        day_index: dayIndex,
        plan_date: planDate,
        meal_slot: mealSlot,
        slot_key: slotKey,
        name: meal.name,
        description: meal.desc || meal.description || '',
        servings: meal.servings || 2,
        macros: meal.macros || null,
        ingredients: meal.ingredients || null,
      }, { onConflict: 'user_id,week_start,day_index' })
      .select()
    if (e2) throw e2
    return d2
  }
  return data
}

export async function getMeals(userId, weekStartOrDate) {
  // Fetch meals for a wide date range (30 days) to support the week calendar
  const startDate = weekStartOrDate
  const endDate = (() => {
    const d = new Date(startDate + 'T12:00:00')
    d.setDate(d.getDate() + 60) // 60 days forward
    return d.toISOString().split('T')[0]
  })()

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .or(`plan_date.gte.${startDate},week_start.eq.${weekStartOrDate}`)
    .order('plan_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function deleteMeal(userId, slotKey) {
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('user_id', userId)
    .eq('slot_key', slotKey)
  if (error) throw error
}

// ─── FOOD LOG ─────────────────────────────────────────────────────────────────

export async function addFoodLog(userId, entry) {
  const { data, error } = await supabase
    .from('food_log')
    .insert({
      user_id: userId,
      date: entry.date,
      meal_time: entry.mealTime,
      name: entry.name,
      portion: entry.portion || null,
      calories: Math.round(entry.calories || 0),
      protein: Math.round((entry.protein || 0) * 10) / 10,
      carbs: Math.round((entry.carbs || 0) * 10) / 10,
      fat: Math.round((entry.fat || 0) * 10) / 10,
    })
    .select()
  if (error) throw error
  return data
}

export async function getFoodLog(userId, date) {
  const { data, error } = await supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function deleteFoodLog(userId, id) {
  const { error } = await supabase
    .from('food_log')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ─── WATER LOG ────────────────────────────────────────────────────────────────

export async function saveWaterLog(userId, date, amount, goal) {
  const { data, error } = await supabase
    .from('water_log')
    .upsert(
      { user_id: userId, logged_date: date, amount: Math.round(amount), goal: goal || 2500 },
      { onConflict: 'user_id,logged_date' }
    )
    .select()
  if (error) throw error
  return data
}

export async function getWaterLog(userId, fromDate) {
  const { data, error } = await supabase
    .from('water_log')
    .select('logged_date, amount, goal')
    .eq('user_id', userId)
    .gte('logged_date', fromDate)
    .order('logged_date', { ascending: true })
  if (error) throw error
  return data || []
}

// ─── WEIGHT LOG ───────────────────────────────────────────────────────────────

export async function saveWeightLog(userId, date, value) {
  const { data, error } = await supabase
    .from('weight_log')
    .upsert(
      { user_id: userId, logged_date: date, value },
      { onConflict: 'user_id,logged_date' }
    )
    .select()
  if (error) throw error
  return data
}

export async function getWeightLog(userId) {
  const { data, error } = await supabase
    .from('weight_log')
    .select('*')
    .eq('user_id', userId)
    .order('logged_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function deleteWeightLog(userId, id) {
  const { error } = await supabase
    .from('weight_log')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────

export async function addActivityLog(userId, date, activity) {
  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      user_id: userId,
      logged_date: date,
      type: activity.type,
      label: activity.label,
      duration: activity.duration,
      burned: activity.burned,
    })
    .select()
  if (error) throw error
  return data
}

export async function getActivityLog(userId, date) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function deleteActivityLog(userId, id) {
  const { error } = await supabase
    .from('activity_log')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ─── GROCERY ──────────────────────────────────────────────────────────────────

export async function saveGroceryItems(userId, weekStart, items) {
  // Delete existing items for this week
  await supabase.from('grocery_items').delete().eq('user_id', userId).eq('week_start', weekStart)
  
  if (!items.length) return []
  
  const { data, error } = await supabase
    .from('grocery_items')
    .insert(items.map(item => ({
      user_id: userId,
      week_start: weekStart,
      name: item.name,
      qty: item.qty,
      section: item.section || 'Other',
      checked: item.checked || false,
      meal_source: item.meal_source || null,
    })))
    .select()
  if (error) throw error
  return data || []
}

export async function getGroceryItems(userId, weekStart) {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('section', { ascending: true })
  if (error) throw error
  return data || []
}

export async function toggleGroceryItem(userId, id, checked) {
  const { error } = await supabase
    .from('grocery_items')
    .update({ checked })
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ─── SAVED RECIPES ────────────────────────────────────────────────────────────

export async function saveRecipe(userId, meal) {
  // Toggle: if exists, delete; if not, insert
  const { data: existing } = await supabase
    .from('saved_recipes')
    .select('id')
    .eq('user_id', userId)
    .eq('name', meal.name)
    .single()

  if (existing) {
    await supabase.from('saved_recipes').delete().eq('id', existing.id)
    return null
  }

  const { data, error } = await supabase
    .from('saved_recipes')
    .insert({
      user_id: userId,
      name: meal.name,
      description: meal.desc || meal.description || '',
      macros: meal.macros || null,
      ingredients: meal.ingredients || null,
      emoji: meal.emoji || null,
      cuisine: meal.cuisine || null,
    })
    .select()
  if (error) throw error
  return data
}

export async function getSavedRecipes(userId) {
  const { data, error } = await supabase
    .from('saved_recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function deleteSavedRecipe(userId, id) {
  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}