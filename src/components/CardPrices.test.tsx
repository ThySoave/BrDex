jest.mock("../features/pricing/pricingRepository", () => ({
  fetchCardPrices: jest.fn()
}));

import { render, waitFor } from "@testing-library/react-native";
import { fetchCardPrices } from "../features/pricing/pricingRepository";
import { CardPrices } from "./CardPrices";

describe("CardPrices", () => {
  it("shows community median with sample count and labeled EN reference", async () => {
    (fetchCardPrices as jest.Mock).mockResolvedValue({
      community: { medianPrice: 10.5, minPrice: 10, maxPrice: 12, sampleCount: 4 },
      reference: { priceBrl: 42.9, source: "seed-manual" }
    });

    const { getByTestId } = render(<CardPrices catalogCardId="card-1" language="en" />);

    await waitFor(() => {
      expect(getByTestId("community-price").props.children.join("")).toContain("R$ 10,50");
      expect(getByTestId("community-price").props.children.join("")).toContain("4");
      expect(getByTestId("reference-price").props.children.join("")).toContain("Referência internacional");
      expect(getByTestId("reference-price").props.children.join("")).toContain("R$ 42,90");
    });
  });

  it("shows a placeholder when there is no community price yet", async () => {
    (fetchCardPrices as jest.Mock).mockResolvedValue({ community: null, reference: null });

    const { getByTestId, queryByTestId } = render(
      <CardPrices catalogCardId="card-1" language="pt" />
    );

    await waitFor(() => {
      expect(getByTestId("community-price-empty")).toBeTruthy();
      expect(queryByTestId("reference-price")).toBeNull();
    });
  });
});
