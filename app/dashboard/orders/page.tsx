"use client";

import { useEffect, useState } from "react";
import { CompletedOrdersPanel } from "@/components/orders/CompletedOrdersPanel";
import { COMPLETED_ORDERS_CHANGED_EVENT } from "@/lib/dashboard-events";

export default function DashboardOrdersPage() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    const onSale = () => setRefreshSignal((s) => s + 1);
    window.addEventListener(COMPLETED_ORDERS_CHANGED_EVENT, onSale);
    return () =>
      window.removeEventListener(COMPLETED_ORDERS_CHANGED_EVENT, onSale);
  }, []);

  return <CompletedOrdersPanel refreshSignal={refreshSignal} />;
}
