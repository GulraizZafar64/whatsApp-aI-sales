import { CustomerOrderSession } from "@/lib/models";

export async function resetCustomerCheckoutSession(params: {
  businessId: number;
  customerWaId: string;
}): Promise<void> {
  const session = await CustomerOrderSession.findOne({
    where: {
      businessId: params.businessId,
      customerWaId: params.customerWaId,
    },
  });
  if (!session) return;

  await session.update({
    committed: false,
    cartJson: null,
    deliveryAddress: null,
    deliveryPaymentProof: null,
    orderPaymentProof: null,
    orderGroupId: null,
    placedAt: null,
  });
}
