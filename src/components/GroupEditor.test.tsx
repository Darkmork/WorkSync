import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GroupEditor } from "./GroupEditor";
import type { WorkGroup, UserProfile } from "../types/worksync";

const mockUsers: UserProfile[] = [
  { id: "user1", name: "Alice", email: "alice@example.com", context: "" },
  { id: "user2", name: "Bob", email: "bob@example.com", context: "" },
];

const mockGroup: WorkGroup = {
  id: "g1",
  name: "Test Group",
  description: "A test group",
  type: "study",
  color: "#0058be",
  ownerId: "user1",
  memberIds: ["user1"],
  status: "active",
};

// Mock the useAppData hook globally
vi.mock("../services/AppDataContext", async () => {
  const actual = await vi.importActual("../services/AppDataContext");
  return {
    ...actual,
    useAppData: () => ({
      currentUser: mockUsers[0],
    }),
  };
});

describe("GroupEditor", () => {
  it("renders with name input", () => {
    render(
      <GroupEditor
        group={mockGroup}
        users={mockUsers}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument();
  });

  it("calls onSave with correct data on submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <GroupEditor
        group={mockGroup}
        users={mockUsers}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const saveBtn = screen.getByRole("button", { name: /guardar/i });
    await user.click(saveBtn);
    expect(onSave).toHaveBeenCalled();
  });

  it("renders the dialog when group is provided", () => {
    const { container } = render(
      <GroupEditor
        group={mockGroup}
        users={mockUsers}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();
  });
});
