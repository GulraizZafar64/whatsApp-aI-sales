import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractOrderJsonPayloadFromText,
  parseOrderJsonPayload,
  stripModelFooters,
  validateParsedAiOrderJson,
} from "@/lib/claude-generate";
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
  customerRequestsAddressUpdate,
  extractAddressFromCombinedOrderMessage,
  isCustomerOrderUpdateConfirmation,
  isOrderUpdateRequest,
  orderIntentsFromConversation,
  resolveCheckoutOrderIntents,
} from "@/lib/whatsapp-catalog-match";

const catalog = [
  { id: 1, productName: "Jogger", productDescription: "" },
  { id: 2, productName: "Blue Shirt", productDescription: "L XL" },
];

function confirm(text: string): boolean {
  return isCustomerOrderUpdateConfirmation(text);
}

describe("ORDER_JSON parse + validate", () => {
  it("parses valid single-item order with size and address", () => {
    const json =
      '{"items":[{"productId":2,"qty":1,"unitPrice":2000,"size":"Large"}],"address":"Karachi Korangi"}';
    const parsed = parseOrderJsonPayload(json);
    assert.ok(parsed);
    assert.equal(parsed!.items.length, 1);
    assert.equal(parsed!.items[0]!.productId, 2);
    assert.equal(parsed!.items[0]!.size, "Large");
    assert.equal(parsed!.address, "Karachi Korangi");
    const v = validateParsedAiOrderJson(parsed!, new Set([1, 2]));
    assert.equal(v.ok, true);
  });

  it("rejects unknown product id in catalog validation", () => {
    const parsed = parseOrderJsonPayload(
      '{"items":[{"productId":99,"qty":1,"unitPrice":100}],"address":"Test City Road 12"}'
    );
    assert.ok(parsed);
    const v = validateParsedAiOrderJson(parsed!, new Set([1, 2]));
    assert.equal(v.ok, false);
  });

  it("extracts nested JSON from ORDER_JSON tag via balanced braces", () => {
    const raw =
      'Thanks! [[ORDER_JSON:{"items":[{"productId":2,"qty":1,"unitPrice":2000}],"address":"Faisalabad"}]]';
    const payload = extractOrderJsonPayloadFromText(raw);
    assert.ok(payload?.includes('"productId":2'));
    const stripped = stripModelFooters(raw);
    assert.ok(!stripped.body.includes("ORDER_JSON"));
    assert.equal(stripped.orderJson?.items[0]?.productId, 2);
  });
});

describe("Order update confirmation gate", () => {
  it("confirms update when tag present", () => {
    assert.equal(
      resolveOrderUpdateConfirmedForDb({
        rawReply: "Done [[ORDER_UPDATE_CONFIRMED]]",
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
        rawReply: "[[ORDER_JSON:{\"items\":[]}]]",
        userText: "theek hai",
        hasPendingOrder: true,
        hasOrderPayload: true,
        isCustomerConfirmation: confirm,
      }),
      true
    );
    assert.equal(
      resolveOrderUpdateConfirmedForDb({
        rawReply: "[[ORDER_JSON:{\"items\":[]}]]",
        userText: "theek hai",
        hasPendingOrder: false,
        hasOrderPayload: true,
        isCustomerConfirmation: confirm,
      }),
      false
    );
  });

  it("does not confirm on update request alone", () => {
    assert.equal(isOrderUpdateRequest("address update krna"), true);
    assert.equal(isOrderUpdateRequest("order change karo"), true);
    assert.equal(
      resolveOrderUpdateConfirmedForDb({
        rawReply: "",
        userText: "address update krna",
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
      "shirt blue large me order krni address karchi kornagi"
    );
    assert.ok(addr?.toLowerCase().includes("karchi"));
  });

  it("detects address update intent", () => {
    assert.equal(customerRequestsAddressUpdate("address update krna"), true);
  });
});

describe("Cart from conversation — no stale items", () => {
  it("one-line order only includes products from that message", () => {
    const history = [
      { role: "user" as const, content: "jogger dikhao" },
      { role: "assistant" as const, content: "Jogger Rs 3000" },
    ];
    const lines = orderIntentsFromConversation({
      history,
      userText: "blue shirt large order krni address karachi",
      products: catalog,
    });
    const ids = lines.map((l) => l.productId);
    assert.ok(ids.includes(2));
    assert.ok(!ids.includes(1), "jogger from old browse must not appear");
  });
});

describe("resolveCheckoutOrderIntents — model footers win", () => {
  it("uses footer only, not chat history", () => {
    const intents = resolveCheckoutOrderIntents(
      [{ productId: 2, quantity: 1, unitPrice: 2000 }],
      {
        visibleText: "Your Blue Shirt order is confirmed.",
        userText: "ok",
        history: [
          { role: "user", content: "jogger chahiye" },
          { role: "assistant", content: "Jogger available" },
        ],
        products: catalog,
      },
      (id) => (id === 2 ? 2000 : 3000)
    );
    assert.equal(intents.length, 1);
    assert.equal(intents[0]!.productId, 2);
  });
});

describe("DB order context detection", () => {
  it("detects status, update, and address questions", () => {
    assert.equal(customerAsksAboutExistingOrder("mera order kya hua"), true);
    assert.equal(customerAsksAboutExistingOrder("address update krna"), true);
    assert.equal(customerAsksAboutExistingOrder("mera address kya hai"), true);
    assert.equal(customerAsksAboutExistingOrder("delivery address batao"), true);
    assert.equal(customerAsksAboutExistingOrder("blue shirt chahiye"), false);
  });

  it("status inquiry matches customerAsksOrderStatus", () => {
    assert.equal(customerAsksOrderStatus("order status kya hai"), true);
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
      detectCustomerLanguageLocal({ userText: "I want to order a blue shirt please" }),
      "en"
    );
  });
});

describe("Customer confirmation phrases", () => {
  it("accepts common confirm words", () => {
    for (const t of ["yes", "ok", "theek hai", "confirm", "krdo"]) {
      assert.equal(isCustomerOrderUpdateConfirmation(t), true, t);
    }
  });
});
