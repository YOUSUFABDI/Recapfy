"use client"

import { useSelector } from "react-redux"
import type { RootState } from "@/store"

export function useUser() {
  return useSelector((s: RootState) => s.auth.user)
}
