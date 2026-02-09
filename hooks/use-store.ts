"use client"

import { useSyncExternalStore } from "react"
import { getStore, subscribe, type AppStore } from "@/lib/store"

export function useAppStore(): AppStore {
  return useSyncExternalStore(subscribe, getStore, getStore)
}
