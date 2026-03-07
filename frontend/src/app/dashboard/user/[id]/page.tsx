"use client";

import { useOneUser } from "@/sections/user/hooks/use-one-user";
import UserDetailView from "@/sections/user/view/user-detail-view";
import { use } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

export default function UserDetailPage({ params }: Props) {
  const { id } = use(params);
  const { user } = useOneUser(id);
  // console.log("user", user);

  return <UserDetailView user={user} />;
}
