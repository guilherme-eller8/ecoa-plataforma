import { describe, expect, it } from "vitest";
import { endpointTus } from "./tus";

describe("endpointTus", () => {
  it("usa o host direto do Storage no Supabase", () => {
    expect(endpointTus("https://abcd.supabase.co")).toBe(
      "https://abcd.storage.supabase.co/storage/v1/upload/resumable/sign",
    );
  });

  it("mantém o host em ambiente local", () => {
    expect(endpointTus("http://127.0.0.1:54321")).toBe(
      "http://127.0.0.1:54321/storage/v1/upload/resumable/sign",
    );
  });
});
