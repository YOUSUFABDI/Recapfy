"use client"

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { AppDispatch } from "@/store"
import { setToken, fetchMe } from "@/store/auth/authSlice"

export default function CaptureAuthFromQuery() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    const token = sp.get("token")
    const userId = sp.get("userId")
    if (!token) return

    // 1) Save token (goes into Redux + localStorage via setToken)
    dispatch(setToken(token))

    // (Optional) persist userId if you want
    try {
      if (userId) localStorage.setItem("auth:userId", userId)
    } catch {}

    // 2) fetch current user
    dispatch(fetchMe())

    // 3) Clean the URL (remove query params)
    router.replace(pathname || "/")

    // 4) Optionally bounce to dashboard if you just logged in on root
    if (!pathname || pathname === "/") {
      router.push("/dashboard/connect")
    }
  }, [sp, router, pathname, dispatch])

  return null
}
