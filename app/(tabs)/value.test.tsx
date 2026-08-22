jest.mock("../../src/features/collection/valueRepository", () => ({
  fetchValueSnapshots: jest.fn()
}));
jest.mock("../../src/features/premium/entitlementsRepository", () => ({
  isPremium: jest.fn()
}));
jest.mock("../../src/features/premium/priceAlertsRepository", () => ({
  listTriggeredPriceAlerts: jest.fn(),
  removePriceAlert: jest.fn()
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { fetchValueSnapshots } from "../../src/features/collection/valueRepository";
import { isPremium } from "../../src/features/premium/entitlementsRepository";
import {
  listTriggeredPriceAlerts,
  removePriceAlert
} from "../../src/features/premium/priceAlertsRepository";
import ValueScreen from "./value";

describe("ValueScreen triggered price alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchValueSnapshots as jest.Mock).mockResolvedValue([]);
    (isPremium as jest.Mock).mockResolvedValue(true);
    (listTriggeredPriceAlerts as jest.Mock).mockResolvedValue([
      {
        alertId: "alert-1",
        catalogCardId: "card-1",
        cardName: "Pikachu",
        language: "en",
        thresholdBrl: 90,
        currentPrice: 100
      }
    ]);
    (removePriceAlert as jest.Mock).mockResolvedValue(undefined);
  });

  it("lists triggered alerts with card, threshold and current price", async () => {
    const { getByTestId, getByText } = render(<ValueScreen />);

    await waitFor(() => {
      expect(getByTestId("triggered-alert-alert-1")).toBeTruthy();
      expect(getByText("Pikachu passou de R$ 90,00 — atual R$ 100,00")).toBeTruthy();
    });
  });

  it("expõe remover alerta como botão", async () => {
    const { findByRole } = render(<ValueScreen />);

    await findByRole("button", { name: "Remover alerta" });
  });

  it("removes an alert and hides it from the list", async () => {
    const { getByTestId, queryByTestId } = render(<ValueScreen />);

    await waitFor(() => {
      expect(getByTestId("triggered-alert-remove-alert-1")).toBeTruthy();
    });

    fireEvent.press(getByTestId("triggered-alert-remove-alert-1"));

    await waitFor(() => {
      expect(removePriceAlert).toHaveBeenCalledWith("alert-1");
    });
    await waitFor(
      () => {
        expect(queryByTestId("triggered-alert-alert-1")).toBeNull();
      },
      { timeout: 3000 }
    );
  });
});
