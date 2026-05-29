import { describe, expect, it } from "vitest";
import { buildInviteMailto } from "./invites";

describe("buildInviteMailto", () => {
  it("addresses the invitee and encodes subject and body", () => {
    const url = buildInviteMailto("ana@ejemplo.com", "Cálculo II", "Mateo");
    expect(url.startsWith("mailto:ana@ejemplo.com?")).toBe(true);
    expect(url).toContain(`subject=${encodeURIComponent("Invitacion a WorkSync: Cálculo II")}`);
    expect(decodeURIComponent(url)).toContain("Mateo te invita");
    expect(decodeURIComponent(url)).toContain("ana@ejemplo.com");
    expect(decodeURIComponent(url)).toContain("worksync-gangale.web.app");
  });

  it("falls back to a generic group name and inviter", () => {
    const url = buildInviteMailto("x@y.com", "   ");
    expect(decodeURIComponent(url)).toContain('grupo "un grupo"');
    expect(decodeURIComponent(url)).toContain("Te invito");
  });
});
