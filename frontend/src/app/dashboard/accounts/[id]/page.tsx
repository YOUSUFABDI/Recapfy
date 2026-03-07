import AccountDetailView from "@/sections/accounts/view/AccountDetailView"
import { Suspense, use } from "react"

type Props = { params: Promise<{ id: string }> }

function AccountDetailContent({ id }: { id: string }) {
  return <AccountDetailView accountId={id} />
}

export default function AccountDetailPage({ params }: Props) {
  const { id } = use(params)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountDetailContent id={id} />
    </Suspense>
  )
}
