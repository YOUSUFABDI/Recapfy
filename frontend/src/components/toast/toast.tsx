"use client"

import { snackbarClasses } from "@/components/toast/classes"
import { Iconify } from "@/components/toast/iconify"
import { useTheme } from "@mui/material/styles"
import * as React from "react"
import {
  toast as hotToast,
  Toaster,
  type ToastOptions,
  type Renderable,
} from "react-hot-toast"

export function ToastHost() {
  const theme = useTheme()

  const base: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 10px 24px rgba(0,0,0,.35)"
        : "0 8px 20px rgba(16,24,40,.10)",
  }

  const success: React.CSSProperties = {
    borderColor: theme.palette.success.main,
  }
  const error: React.CSSProperties = {
    borderColor: theme.palette.error.main,
  }
  const loading: React.CSSProperties = {
    borderColor: theme.palette.info.main,
  }

  return (
    <Toaster
      position="top-right"
      gutter={12}
      toastOptions={{
        duration: 3000,
        style: base,
        success: { style: { ...base, ...success } },
        error: { style: { ...base, ...error } },
        loading: { style: { ...base, ...loading } },
      }}
    />
  )
}

function withDefaults(opts?: ToastOptions): ToastOptions {
  return { ...opts }
}

const toast = Object.assign(
  (message: Renderable, opts?: ToastOptions) =>
    hotToast(message, withDefaults(opts)),

  {
    success: (message: Renderable, opts?: ToastOptions) =>
      hotToast.success(
        message,
        withDefaults({
          icon: (
            <Iconify
              className={snackbarClasses?.iconSvg}
              icon="solar:check-circle-bold"
            />
          ),
          ...opts,
        })
      ),

    error: (message: Renderable, opts?: ToastOptions) =>
      hotToast.error(
        message,
        withDefaults({
          icon: (
            <Iconify
              className={snackbarClasses?.iconSvg}
              icon="solar:danger-bold"
            />
          ),
          ...opts,
        })
      ),

    warning: (message: Renderable, opts?: ToastOptions) =>
      hotToast(
        message,
        withDefaults({
          icon: (
            <Iconify
              className={snackbarClasses?.iconSvg}
              icon="solar:danger-triangle-bold"
            />
          ),
          ...opts,
        })
      ),

    info: (message: Renderable, opts?: ToastOptions) =>
      hotToast(
        message,
        withDefaults({
          icon: (
            <Iconify
              className={snackbarClasses?.iconSvg}
              icon="solar:info-circle-bold"
            />
          ),
          ...opts,
        })
      ),

    loading: (message: Renderable, opts?: ToastOptions) =>
      hotToast.loading(
        message,
        withDefaults({
          icon: <span className={snackbarClasses?.loadingIcon} />,
          ...opts,
        })
      ),

    promise: hotToast.promise,
    dismiss: hotToast.dismiss,
    remove: hotToast.remove,
  }
)

export default toast
