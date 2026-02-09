"use client"

import { useEffect } from "react"
import { hydrateStoreFromSupabase } from "@/lib/supabase-sync"

/** Carrega todas as tabelas do Supabase no store ao montar a aplicação. */
export function SupabaseHydrate() {
  useEffect(() => {
    hydrateStoreFromSupabase()
  }, [])
  return null
}
