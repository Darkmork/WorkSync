import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const Throw = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("test crash");
  return <p>ok</p>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(<ErrorBoundary><Throw shouldThrow={false} /></ErrorBoundary>);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("shows fallback UI on crash", () => {
    render(<ErrorBoundary><Throw shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
  });
});