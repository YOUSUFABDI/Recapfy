import { Box } from "@mui/material"
import React from "react"

type Props = {
  children: React.ReactNode
  sx?: object
}

const DashboardView = ({ children, sx }: Props) => {
  return <Box sx={{ mx: "20px", mt: "20px", ...sx }}>{children}</Box>
}

export default DashboardView
