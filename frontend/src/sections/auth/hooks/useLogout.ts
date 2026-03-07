"use client"

import { useCallback } from "react"
import { useDispatch } from "react-redux"
import type { AppDispatch } from "@/store"
import { logout } from "@/store/auth/authSlice"

export function useLogout() {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(() => {
    dispatch(logout())
  }, [dispatch])
}
