jest.mock("../../lib/supabaseClient", () => ({
  getSupabaseClient: jest.fn()
}));

import { getSupabaseClient } from "../../lib/supabaseClient";
import { getOrCreateConversation, listMessages, sendMessage } from "./chatRepository";

describe("getOrCreateConversation", () => {
  it("returns the existing conversation for the sorted pair", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: { id: "conv-1" }, error: null });
    const eq2Mock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-b" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const id = await getOrCreateConversation("user-a");

    expect(fromMock).toHaveBeenCalledWith("conversations");
    expect(eq1Mock).toHaveBeenCalledWith("participant_a", "user-a");
    expect(eq2Mock).toHaveBeenCalledWith("participant_b", "user-b");
    expect(id).toBe("conv-1");
  });

  it("creates the conversation when none exists", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq2Mock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    const singleMock = jest.fn().mockResolvedValue({ data: { id: "conv-new" }, error: null });
    const insertSelectMock = jest.fn().mockReturnValue({ single: singleMock });
    const insertMock = jest.fn().mockReturnValue({ select: insertSelectMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock, insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-b" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    const id = await getOrCreateConversation("user-a");

    expect(insertMock).toHaveBeenCalledWith({
      participant_a: "user-a",
      participant_b: "user-b"
    });
    expect(id).toBe("conv-new");
  });
});

describe("listMessages", () => {
  it("maps rows ordered by created_at to ChatMessage", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        { id: "msg-1", sender_id: "user-a", body: "oi", created_at: "2026-08-19T10:00:00Z" }
      ],
      error: null
    });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromMock });

    const result = await listMessages("conv-1");

    expect(fromMock).toHaveBeenCalledWith("messages");
    expect(eqMock).toHaveBeenCalledWith("conversation_id", "conv-1");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual([
      { id: "msg-1", senderId: "user-a", body: "oi", createdAt: "2026-08-19T10:00:00Z" }
    ]);
  });
});

describe("sendMessage", () => {
  it("inserts a message with the current user as sender", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-a" } } });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock }
    });

    await sendMessage("conv-1", "olá!");

    expect(fromMock).toHaveBeenCalledWith("messages");
    expect(insertMock).toHaveBeenCalledWith({
      conversation_id: "conv-1",
      sender_id: "user-a",
      body: "olá!"
    });
  });
});
