"use client"

import { Typography } from "@mui/material"
import { ComponentProps, useEffect, useState } from "react"

type Props = {
  timeZone?: string // e.g. "Africa/Mogadishu"
  locale?: string // e.g. "en-US"
  variant?: ComponentProps<typeof Typography>["variant"]
}

export default function NowStamp({
  timeZone = "Africa/Mogadishu",
  locale = "en-US",
  variant = "subtitle2",
}: Props) {
  const [text, setText] = useState("")

  useEffect(() => {
    // Build "Oct 25 10:36:27" using formatToParts (no commas, 24h)
    const fmt = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone,
    })

    const tick = () => {
      const parts = fmt.formatToParts(new Date())
      const get = (t: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === t)?.value ?? ""

      const month = get("month")
      const day = get("day")
      const hour = get("hour")
      const minute = get("minute")
      const second = get("second")

      setText(`${month} ${day} ${hour}:${minute}:${second}`)
    }

    tick() // set immediately
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [locale, timeZone])

  return (
    <Typography variant={variant} suppressHydrationWarning>
      {text}
    </Typography>
  )
}
