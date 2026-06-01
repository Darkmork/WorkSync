import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PollCard } from "./PollCard";
import type { Poll, WorkGroup } from "../types/worksync";

const mockPoll: Poll = {
  id: "poll1",
  groupId: "g1",
  title: "Test Poll",
  createdBy: "user1",
  status: "open",
  candidates: [
    { id: "c1", day: "mon", dateLabel: "Monday", start: "08:00", end: "09:00", modality: "in_person" },
    { id: "c2", day: "tue", dateLabel: "Tuesday", start: "10:00", end: "11:00", modality: "remote" },
  ],
  votes: {},
  createdAt: Date.now(),
};

const mockGroup: WorkGroup = {
  id: "g1",
  name: "Test Group",
  description: "",
  type: "study",
  color: "#0058be",
  ownerId: "user1",
  memberIds: ["user1", "user2"],
  status: "active",
};

// Mock the useAppData hook globally
vi.mock("../services/AppDataContext", async () => {
  const actual = await vi.importActual("../services/AppDataContext");
  return {
    ...actual,
    useAppData: () => ({
      currentUser: { id: "user1", name: "Alice", email: "alice@example.com", context: "" },
      castVote: vi.fn(),
      closePoll: vi.fn(),
      data: {
        users: [
          { id: "user1", name: "Alice", email: "", context: "" },
          { id: "user2", name: "Bob", email: "", context: "" },
        ],
      },
    }),
  };
});

describe("PollCard", () => {
  it("renders poll title", () => {
    render(<PollCard poll={mockPoll} group={mockGroup} />);
    expect(screen.getByText("Test Poll")).toBeInTheDocument();
  });

  it("renders all candidates", () => {
    render(<PollCard poll={mockPoll} group={mockGroup} />);
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Tuesday")).toBeInTheDocument();
  });
});
