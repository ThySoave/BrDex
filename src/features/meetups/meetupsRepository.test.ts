jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { createMeetup, listUpcomingMeetups } from "./meetupsRepository";

describe("listUpcomingMeetups", () => {
  it("lists upcoming meetups ordered by start date and maps rows", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "meetup-1",
          title: "Feira de trocas TCG",
          city: "Curitiba",
          starts_at: "2026-09-01T14:00:00Z",
          description: "Praça central"
        }
      ],
      error: null
    });
    const gteMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ gte: gteMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await listUpcomingMeetups();

    expect(fromMock).toHaveBeenCalledWith("meetups");
    expect(gteMock).toHaveBeenCalledWith("starts_at", expect.any(String));
    expect(orderMock).toHaveBeenCalledWith("starts_at");
    expect(result).toEqual([
      {
        id: "meetup-1",
        title: "Feira de trocas TCG",
        city: "Curitiba",
        startsAt: "2026-09-01T14:00:00Z",
        description: "Praça central"
      }
    ]);
  });

  it("throws when the query fails", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const gteMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ gte: gteMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    await expect(listUpcomingMeetups()).rejects.toThrow("boom");
  });
});

describe("createMeetup", () => {
  it("inserts a meetup with the current user as creator", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await createMeetup({
      title: "Feira de trocas TCG",
      city: "Curitiba",
      startsAt: "2026-09-01T14:00:00Z",
      description: "Praça central"
    });

    expect(fromMock).toHaveBeenCalledWith("meetups");
    expect(insertMock).toHaveBeenCalledWith({
      created_by: "user-1",
      title: "Feira de trocas TCG",
      city: "Curitiba",
      starts_at: "2026-09-01T14:00:00Z",
      description: "Praça central"
    });
  });
});
