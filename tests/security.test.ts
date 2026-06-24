import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/security";

describe("credential encryption", () => {
  it("round-trips a password without storing plaintext", () => {
    const encrypted = encryptSecret("very-secret-password");

    expect(encrypted.encryptedPassword).not.toContain("very-secret-password");
    expect(decryptSecret(encrypted.encryptedPassword, encrypted.encryptionMetaJson)).toBe("very-secret-password");
  });
});
