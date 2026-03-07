"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../hooks/useUser";
import Loading from "@/components/LoadingScreen"; // Assuming path is correct

// Define the role type based on your Prisma schema
type Role = "ADMIN" | "USER";

export default function RoleGuard({
  children,
  roles, // Now accepts a single role OR an array of roles
  fallback = "/unauthorized",
}: {
  children: React.ReactNode;
  roles: Role | readonly Role[];
  fallback?: string;
}) {
  const router = useRouter();
  const user = useUser();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Convert single role string to an array for simpler checking
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  useEffect(() => {
    // If the user object is not yet loaded, wait.
    // AuthGuard ensures the user is authenticated, but 'useUser' might still be fetching details.
    if (!user) {
      return;
    }

    const userRole: Role = user.role as Role; // Assume user.role matches Role type
    const isAllowed = allowedRoles.includes(userRole);

    if (!isAllowed) {
      // Role is not allowed -> Redirect
      router.replace(fallback);
    } else {
      // Role is allowed -> Stop checking and render content
      setIsCheckingRole(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, fallback]);
  // Note: allowedRoles is derived from props and doesn't need to be in the dependency array if props are stable

  // Show loading screen while user data is fetching or we are checking permissions
  if (!user || isCheckingRole) {
    return <Loading />;
  }

  // Role check passed, render content
  return <>{children}</>;
}
