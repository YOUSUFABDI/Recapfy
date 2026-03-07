"use client";

import AuthGuard from "@/sections/auth/guards/auth-guard";
import * as React from "react";

export default function Dashboard({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
