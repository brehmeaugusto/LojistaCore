"use client"

import { useState, useEffect, type ReactNode } from "react"

/**
 * Renders children only after client-side mount to avoid hydration mismatch
 * with components that generate different IDs or content on server vs client (e.g. Radix UI).
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-sm text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    )
  }
  return <>{children}</>
}
