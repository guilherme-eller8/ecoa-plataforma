import type { UserIdentity } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { identidadeAceitavel } from "./acesso";

const id = (provider: string) => ({ provider }) as UserIdentity;

describe("identidadeAceitavel", () => {
  it("aceita conta só com e-mail, só com Google, ou com os dois", () => {
    expect(
      identidadeAceitavel({
        identities: [id("email")],
        app_metadata: { providers: ["email"] },
      }),
    ).toBe(true);
    expect(
      identidadeAceitavel({ identities: [id("google")], app_metadata: {} }),
    ).toBe(true);
    expect(
      identidadeAceitavel({
        identities: [id("email"), id("google")],
        app_metadata: {},
      }),
    ).toBe(true);
  });

  it("aceita conta recém-criada sem identidade", () => {
    expect(identidadeAceitavel({ identities: [], app_metadata: {} })).toBe(
      true,
    );
  });

  it("recusa conta com outro provedor", () => {
    expect(
      identidadeAceitavel({ identities: [id("github")], app_metadata: {} }),
    ).toBe(false);
    expect(
      identidadeAceitavel({
        identities: [id("email")],
        app_metadata: { providers: ["phone"] },
      }),
    ).toBe(false);
  });
});
