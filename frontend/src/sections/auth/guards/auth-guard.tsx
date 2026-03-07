"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import Loading from "@/components/LoadingScreen";
import type { AppDispatch } from "@/store";
import { setToken } from "@/store/auth/authSlice";
import { useAuth } from "../hooks/useAuth";

type AuthGuardProps = {
  children: React.ReactNode;
};

const SIGN_IN_PATH = "/login";

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const { isAuthenticated, loading, token, user } = useAuth();

  const [isChecking, setIsChecking] = useState(true);

  // 1) Handle token coming from Google redirect: /path?token=...&userId=...
  useEffect(() => {
    const urlToken = searchParams.get("auth:token");
    const urlUserId = searchParams.get("auth:userId"); // optional, in case you use it later

    // If we have a token in the URL but not in Redux yet → save it
    if (urlToken && !token) {
      dispatch(setToken(urlToken));

      // Clean URL: remove token & userId from query
      const params = new URLSearchParams(searchParams.toString());
      params.delete("token");
      params.delete("userId");

      const qs = params.toString();
      const newUrl = qs ? `${pathname}?${qs}` : pathname;

      // Replace URL without adding history entry
      router.replace(newUrl);
    }
    // We don't set isChecking here; the next effect will decide when to finish
  }, [searchParams, token, dispatch, router, pathname]);

  const createRedirectPath = (currentPath: string) => {
    const queryString = new URLSearchParams({
      returnTo: pathname || "/",
    }).toString();

    return `${currentPath}?${queryString}`;
  };

  // 2) Actual permission check
  useEffect(() => {
    const urlToken = searchParams.get("auth:token");

    // If there's a token in the URL that we haven't processed yet,
    // wait until the first effect runs and Redux is updated.
    if (urlToken && !token) {
      return;
    }

    // While auth is loading / fetching user, don't redirect
    if (loading) {
      return;
    }

    // Not logged in → go to login with returnTo
    if (!token || !isAuthenticated || (token && !user)) {
      const redirectPath = createRedirectPath(SIGN_IN_PATH);
      router.replace(redirectPath);
      return;
    }

    // Auth OK -> allow render
    setIsChecking(false);
  }, [searchParams, loading, token, isAuthenticated, pathname, router, user]);

  if (isChecking) {
    return <Loading />;
  }

  return <>{children}</>;
}
