import { Suspense } from "react";
import BillingCancelClient from "./BillingCancelClient";

export default function BillingCancelPage() {
  return (
    <Suspense fallback={null}>
      <BillingCancelClient />
    </Suspense>
  );
}
