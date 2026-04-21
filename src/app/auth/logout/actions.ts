'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  let errorMsg: string | null = null;
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error.message)
      errorMsg = error.message;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Unexpected logout error:', message)
    errorMsg = message;
  }

  if (errorMsg) {
    return { success: false, error: errorMsg }
  }

  redirect('/')
}