import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripModelFooters } from "@/lib/claude-generate";
import {
  customerAsksAboutExistingOrder,
  customerAsksOrderStatus,
} from "@/lib/customer-order-status";
import {
  customerRequestsOrderCancel,
  resolveOrderUpdateConfirmedForDb,
} from "@/lib/order-customer-intent";
import { detectCustomerLanguageLocal } from "@/lib/customer-language-detect";
import {
  parseOrderAiEvent,
  parseOrderEventFromAiReply,
  validateOrderAiEvent,
} from "@/lib/order-ai-events";
import {
  customerRequestsAddressUpdate,
  extractAddressFromCombinedOrderMessage,
  isCustomerOrderUpdateConfirmation,
  isOrderUpdateRequest,
} from "@/lib/whatsapp-catalog-match";

function confirm(text: string): boolean {
  return isCustomerOrderUpdateConfirmation(text);
}

describe("ORDER_EVENT parse + validate", () => {
  it("parses order_create with items and address", () => {
    const json =
      '{"event":"order_create","items":[{"productId":2,"qty":1,"unitPrice":2000,"size":"Large"}],"address":"Karachi Korangi"}';
    const parsed = parseOrderAiEvent(json);
    assert.ok(parsed);
    assert.equal(parsed!.event, "order_create");
    assert.equal(parsed!.items[0]!.productId, 2);
    const v = validateOrderAiEvent(parsed!, new Set([1, 2]));
    assert.equal(v.ok, true);
  });

  it("parses order_status without items", () => {
    const parsed = parseOrderAiEvent('{"event":"order_status"}');
    assert.ok(parsed);
    assert.equal(parsed!.event, "order_status");
    const v = validateOrderAiEvent(parsed!, new Set([1, 2]));
    assert.equal(v.ok, true);
  });

  it("extracts ORDER_EVENT from reply text", () => {
    const raw =
      'Your order is pending. [[ORDER_EVENT:{"event":"order_status"}]]';
    const event = parseOrderEventFromAiReply(raw);
    assert.equal(event?.event, "order_status");
    const stripped = stripModelFooters(raw);
    assert.ok(!stripped.body.includes("ORDER_EVENT"));
  });

  it("rejects unknown product id in catalog validation", () => {
    const parsed = parseOrderAiEvent(
      '{"event":"order_create","items":[{"productId":99,"qty":1,"unitPrice":100}],"address":"Test City Road 12"}'
    );
    assert.ok(parsed);
    const v = validateOrderAiEvent(parsed!, new Set([1, 2]));
    assert.equal(v.ok, false);
  });
});

describe("Order update confirmation gate", () => {
  it("confirms update when order_update event present", () => {
    assert.equal(
      resolveOrderUpdateConfirmedForDb({
        rawReply:
          'Done [[ORDER_EVENT:{"event":"order_update","items":[{"productId":2,"qty":1,"unitPrice":2000}],"address":"Karachi"}]]',
        userText: "anything",
        hasPendingOrder: true,
        hasOrderPayload: true,
        isCustomerConfirmation: confirm,
      }),
      true
    );
  });

  it("confirms update on yes + payload only when pending order exists", () => {
    assert.equal(
      resolveOrderUpdateConfirmedForDb({
        rawReply:
          '[[ORDER_EVENT:{"event":"order_update","items":[{"productId":2,"qty":1,"unitPrice":2000}],"address":"Karachi"}]]',
        userText: "theek hai",
        hasPendingOrder: true,
        hasOrderPayload: true,
        isCustomerConfirmation: confirm,
      }),
      true
    );
  });

  it("does not confirm on update request alone", () => {
    assert.equal(
      resolveOrderUpdateConfirmedForDb({
        rawReply: "What would you like to change?",
        userText: "order update karo",
        hasPendingOrder: true,
        hasOrderPayload: false,
        isCustomerConfirmation: confirm,
      }),
      false
    );
  });
});

describe("Address extraction", () => {
  it("pulls address from combined order message", () => {
    const addr = extractAddressFromCombinedOrderMessage(
      "confirm order address: House 5 Street 2 Karachi"
    );
    assert.ok(addr?.includes("Karachi"));
  });

  it("detects address update intent", () => {
    assert.equal(customerRequestsAddressUpdate("address change kar do"), true);
  });
});

describe("DB order context detection", () => {
  it("detects status, update, and address questions", () => {
    assert.equal(customerAsksAboutExistingOrder("mera order kya hua"), true);
    assert.equal(isOrderUpdateRequest("order update karo"), true);
  });

  it("status inquiry matches customerAsksOrderStatus", () => {
    assert.equal(customerAsksOrderStatus("order status?"), true);
  });
});

describe("Cancel intent", () => {
  it("detects cancel phrases", () => {
    assert.equal(customerRequestsOrderCancel("order cancel kar do"), true);
    assert.equal(customerRequestsOrderCancel("how to cancel"), false);
  });
});

describe("Language detection (local)", () => {
  it("detects Roman Urdu", () => {
    assert.equal(
      detectCustomerLanguageLocal({ userText: "mujhe shirt chahiye kitne ki hai" }),
      "ur_roman"
    );
  });

  it("detects English", () => {
    assert.equal(
      detectCustomerLanguageLocal({ userText: "What is the price of this shirt?" }),
      "en"
    );
  });
});

describe("ORDER_EVENT normalize", () => {
  it("parses order_cancel", () => {
    const event = parseOrderEventFromAiReply(
      'Cancelled [[ORDER_EVENT:{"event":"order_cancel"}]]'
    );
    assert.equal(event?.event, "order_cancel");
  });
});

describe("Customer confirmation phrases", () => {
  it("accepts common confirm words", () => {
    assert.equal(confirm("yes"), true);
    assert.equal(confirm("theek hai"), true);
  });
});
