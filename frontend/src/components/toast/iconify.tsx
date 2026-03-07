"use client"

import * as React from "react"
import { Icon, type IconProps } from "@iconify/react"
import { SxProps } from "@mui/material/styles"

type Props = {
  icon: IconProps["icon"]
  className?: string
  style?: React.CSSProperties
  width?: number | string
  height?: number | string
  sx?: SxProps
}

export function Iconify({
  icon,
  className,
  style,
  width = 18,
  height = 18,
}: Props) {
  return (
    <Icon
      icon={icon}
      className={className}
      style={style}
      width={width}
      height={height}
      aria-hidden="true"
    />
  )
}

export default Iconify
