import { supabase } from './supabase'

// ── MEALS ──
export async function saveMeal(userId, weekStart, dayIndex, meal) {
  const { data, error } = await supabase
    .from('meals')
    .upsert({
      user_id: userId,
      week_start: weekStart,
      day_index: dayIndex,
      name: meal.name,
      description: meal.desc,
      tags: meal.tags,
      time_tag: meal.timeTag,
      diff_tag: meal.diffTag,
      macros: meal.macros,
      ingredients: meal.ingredients,
      servings: meal.servings || 2,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMeals(userId, weekStart) {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
  if (error) throw error
  return data
}

export async function deleteMeal(userId, weekStart, dayIndex) {
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('day_index', dayIndex)
  if (error) throw error
}

// ── FOOD LOG ──
export async function addFoodLog(userId, entry) {
  const { data, error } = await supabase
    .from('food_log')
    .insert({
      user_id: userId,
      logged_date: entry.date,
      meal_time: entry.mealTime,
      name: entry.name,
      portion: entry.portion,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getFoodLog(userId, date) {
  const { data, error } = await supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function deleteFoodLog(userId, id) {
  const { error } = await supabase
    .from('food_log')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ── WATER LOG ──
export async function saveWaterLog(userId, date, amount, goal) {
  const { data, error } = await supabase
    .from('water_log')
    .upsert({
      user_id: userId,
      logged_date: date,
      amount,
      goal,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getWaterLog(userId, fromDate) {
  const { data, error } = await supabase
    .from('water_log')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_date', fromDate)
    .order('logged_date', { ascending: true })
  if (error) throw error
  return data
}

// ── WEIGHT LOG ──
export async function saveWeightLog(userId, date, value) {
  const { data, error } = await supabase
    .from('weight_log')
    .upsert({
      user_id: userId,
      logged_date: date,
      value,
    })
    .select()
    .single()
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
  return data
}

export async function deleteWeightLog(userId, id) {
  const { error } = await supabase
    .from('weight_log')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ── ACTIVITY LOG ──
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
    .single()
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
  return data
}

export async function deleteActivityLog(userId, id) {
  const { error } = await supabase
    .from('activity_log')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ── GROCERY ──
export async function saveGroceryItems(userId, weekStart, items) {
  // Delete existing items for this week first
  await supabase
    .from('grocery_items')
    .delete()
    .eq('user_id', userId)
    .eq('week_start', weekStart)

  if (!items.length) return

  const { data, error } = await supabase
    .from('grocery_items')
    .insert(items.map(item => ({
      user_id: userId,
      week_start: weekStart,
      name: item.name,
      qty: item.qty,
      section: item.section,
      checked: item.checked || false,
    })))
    .select()
  if (error) throw error
  return data
}

export async function getGroceryItems(userId, weekStart) {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('section', { ascending: true })
  if (error) throw error
  return data
}

export async function toggleGroceryItem(userId, id, checked) {
  const { error } = await supabase
    .from('grocery_items')
    .update({ checked })
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

// ── SAVED RECIPES ──
export async function saveRecipe(userId, recipe) {
  const { data, error } = await supabase
    .from('saved_recipes')
    .insert({
      user_id: userId,
      name: recipe.name,
      description: recipe.desc,
      tags: recipe.tags,
      time_tag: recipe.timeTag,
      diff_tag: recipe.diffTag,
      macros: recipe.macros,
      ingredients: recipe.ingredients,
    })
    .select()
    .single()
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
  return data
}

export async function deleteSavedRecipe(userId, id) {
  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}
export async function saveMacroTargets(userId, targets) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      tdee: targets.tdee,
      protein_target: targets.protein,
      carbs_target: targets.carbs,
      fat_target: targets.fat,
    })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}