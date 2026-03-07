"use client"

import CaptureAuthFromQuery from "@/components/CaptureAuthFromQuery"
import { ToastHost } from "@/components/toast/toast"
import { ThemeModeProvider } from "@/context/theme-mode-provider"
import { store } from "@/store"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter"
import React from "react"
import { Provider } from "react-redux"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <Provider store={store}>
        <CaptureAuthFromQuery />
        <ThemeModeProvider>
          <ToastHost />
          {children}
        </ThemeModeProvider>
      </Provider>
    </AppRouterCacheProvider>
  )
}
