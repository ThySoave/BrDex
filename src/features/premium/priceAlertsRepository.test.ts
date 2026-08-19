jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  createPriceAlert,
  listTriggeredPriceAlerts,
  removePriceAlert
} from "./priceAlertsRepository";

describe("createPriceAlert", () => {
  it("inserts an alert for the current user", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await createPriceAlert("card-1", "en", 90);

    expect(fromMock).toHaveBeenCalledWith("price_alerts");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      catalog_card_id: "card-1",
      language: "en",
      threshold_brl: 90
    });
  });

  it("throws when the insert fails", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: { message: "boom" } });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await expect(createPriceAlert("card-1", "en", 90)).rejects.toThrow("boom");
  });
});

describe("listTriggeredPriceAlerts", () => {
  it("maps the RPC rows", async () => {
    const rpcMock = jest.fn().mockResolvedValue({
      data: [
        {
          alert_id: "alert-1",
          catalog_card_id: "card-1",
          card_name: "Pikachu",
          language: "en",
          threshold_brl: 90,
          current_price: 100
        }
      ],
      error: null
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock });

    const result = await listTriggeredPriceAlerts();

    expect(rpcMock).toHaveBeenCalledWith("triggered_price_alerts");
    expect(result).toEqual([
      {
        alertId: "alert-1",
        catalogCardId: "card-1",
        cardName: "Pikachu",
        language: "en",
        thresholdBrl: 90,
        currentPrice: 100
      }
    ]);
  });
});

describe("removePriceAlert", () => {
  it("deletes the alert by id", async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ delete: deleteMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await removePriceAlert("alert-1");

    expect(fromMock).toHaveBeenCalledWith("price_alerts");
    expect(eqMock).toHaveBeenCalledWith("id", "alert-1");
  });
});
