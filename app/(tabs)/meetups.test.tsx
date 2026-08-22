jest.mock("../../src/features/meetups/meetupsRepository", () => ({
  listUpcomingMeetups: jest.fn(),
  createMeetup: jest.fn()
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { createMeetup, listUpcomingMeetups } from "../../src/features/meetups/meetupsRepository";
import MeetupsScreen from "./meetups";

const meetup = {
  id: "m1",
  title: "Troca na praça",
  city: "Curitiba",
  startsAt: "2099-01-10T14:00:00.000Z",
  description: null
};

describe("MeetupsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    (listUpcomingMeetups as jest.Mock).mockResolvedValue([meetup]);
  });

  it("expõe publicar encontro como botão", async () => {
    const { findByRole } = render(<MeetupsScreen />);

    await findByRole("button", { name: "Publicar encontro" });
  });

  it("renders the upcoming meetups", async () => {
    const { findByText } = render(<MeetupsScreen />);

    await findByText("Troca na praça");
    expect(listUpcomingMeetups).toHaveBeenCalled();
  });

  it("rejects a past date without creating the meetup", async () => {
    const { getByTestId } = render(<MeetupsScreen />);

    fireEvent.changeText(getByTestId("meetup-title"), "Encontro antigo");
    fireEvent.changeText(getByTestId("meetup-city"), "Curitiba");
    fireEvent.changeText(getByTestId("meetup-date"), "2000-01-01");
    fireEvent.press(getByTestId("meetup-create"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("A data do encontro precisa ser futura");
    });
    expect(createMeetup).not.toHaveBeenCalled();
  });

  it("creates a meetup with valid data and reloads the list", async () => {
    (createMeetup as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId } = render(<MeetupsScreen />);

    fireEvent.changeText(getByTestId("meetup-title"), "Feira de trocas");
    fireEvent.changeText(getByTestId("meetup-city"), "São Paulo");
    fireEvent.changeText(getByTestId("meetup-date"), "2099-01-10");
    fireEvent.press(getByTestId("meetup-create"));

    await waitFor(() => {
      expect(createMeetup).toHaveBeenCalledWith({
        title: "Feira de trocas",
        city: "São Paulo",
        startsAt: new Date("2099-01-10").toISOString(),
        description: null
      });
      expect(listUpcomingMeetups).toHaveBeenCalledTimes(2);
    });
  });

  it("alerts when required fields are missing", async () => {
    const { getByTestId } = render(<MeetupsScreen />);

    fireEvent.press(getByTestId("meetup-create"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Preencha título, cidade e uma data válida (AAAA-MM-DD)");
    });
    expect(createMeetup).not.toHaveBeenCalled();
  });

  it("puxar para atualizar refaz a busca e mostra o encontro novo", async () => {
    (listUpcomingMeetups as jest.Mock)
      .mockResolvedValueOnce([meetup])
      .mockResolvedValueOnce([meetup, { ...meetup, id: "m2", title: "Feira nova" }]);
    const { findByTestId, getByTestId, getByText } = render(<MeetupsScreen />);

    await findByTestId("meetup-m1");

    await act(async () => {
      fireEvent(getByTestId("meetups-list"), "refresh");
    });

    expect(listUpcomingMeetups).toHaveBeenCalledTimes(2);
    expect(getByText("Feira nova")).toBeTruthy();
  });

  it("mostra o estado vazio quando não há encontros publicados", async () => {
    (listUpcomingMeetups as jest.Mock).mockResolvedValue([]);
    const { findByTestId } = render(<MeetupsScreen />);

    const empty = await findByTestId("meetups-empty");
    expect(empty).toBeTruthy();
  });
});
