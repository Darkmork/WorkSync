import { describe, expect, it } from "vitest";
import { groupStatusLabel, modalityLabel, sessionStatusLabel } from "./labels";

describe("labels", () => {
  it("translates modality to Spanish", () => {
    expect(modalityLabel("remote")).toBe("Online");
    expect(modalityLabel("in_person")).toBe("Presencial");
    expect(modalityLabel("hybrid")).toBe("Híbrida");
  });

  it("translates session status to Spanish", () => {
    expect(sessionStatusLabel("proposed")).toBe("Propuesta");
    expect(sessionStatusLabel("confirmed")).toBe("Confirmada");
    expect(sessionStatusLabel("cancelled")).toBe("Cancelada");
  });

  it("translates group status to Spanish", () => {
    expect(groupStatusLabel("active")).toBe("Activo");
    expect(groupStatusLabel("pending")).toBe("Pendiente");
    expect(groupStatusLabel("inactive")).toBe("Inactivo");
  });
});
