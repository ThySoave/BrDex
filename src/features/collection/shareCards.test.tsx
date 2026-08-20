import { render } from "@testing-library/react-native";
import { ShareCollectionCard, ShareSingleCard } from "./shareCards";
import type { UserCard } from "./types";

const card: UserCard = {
  id: "uc-1",
  catalogCardId: "base1-4",
  cardName: "Charizard",
  cardImageUrl: "https://images.example/base1-4.png",
  language: "pt",
  condition: "near_mint",
  pricePaid: 500,
  status: "guardada"
};

describe("ShareCollectionCard", () => {
  it("mostra a contagem de cartas da coleção", () => {
    const { getByTestId } = render(<ShareCollectionCard cardCount={12} cardNames={["Pikachu", "Charizard"]} />);

    expect(getByTestId("share-card-summary").props.children).toBe("Minha coleção: 12 cartas");
  });

  it("mostra até 4 nomes e resume o excedente", () => {
    const names = ["Pikachu", "Charizard", "Blastoise", "Venusaur", "Mewtwo", "Mew"];
    const { getByTestId } = render(<ShareCollectionCard cardCount={6} cardNames={names} />);

    expect(getByTestId("share-card-name-0").props.children).toBe("Pikachu");
    expect(getByTestId("share-card-name-3").props.children).toBe("Venusaur");
    expect(getByTestId("share-card-more").props.children).toBe("+2 outras");
  });

  it("não mostra o resumo de excedente com 4 nomes ou menos", () => {
    const { queryByTestId } = render(<ShareCollectionCard cardCount={2} cardNames={["Pikachu", "Charizard"]} />);

    expect(queryByTestId("share-card-more")).toBeNull();
    expect(queryByTestId("share-card-name-2")).toBeNull();
  });
});

describe("ShareSingleCard", () => {
  it("mostra o nome da carta e os detalhes com o label do estado em pt-BR", () => {
    const { getByTestId } = render(<ShareSingleCard card={card} />);

    expect(getByTestId("share-single-name").props.children).toBe("Charizard");
    expect(getByTestId("share-single-details").props.children).toBe("Quase Nova · PT");
  });
});
