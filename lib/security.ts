import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const algorithm = "aes-256-gcm";

function getKey() {
  const configured = process.env.APP_ENCRYPTION_KEY;
  if (configured) {
    const decoded = Buffer.from(configured, "base64");
    if (decoded.length === 32) return decoded;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key in production.");
  }

  return scryptSync("local-development-only", "borabora", 32);
}

export function encryptSecret(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedPassword: encrypted.toString("base64"),
    encryptionMetaJson: JSON.stringify({
      algorithm,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64")
    })
  };
}

export function decryptSecret(encryptedPassword: string, encryptionMetaJson: string) {
  const meta = JSON.parse(encryptionMetaJson) as { iv: string; authTag: string };
  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(meta.iv, "base64"));
  decipher.setAuthTag(Buffer.from(meta.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPassword, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function assertPersonalAccess(request: Request) {
  const expected = process.env.PERSONAL_ACCESS_TOKEN;
  if (!expected) return;

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${expected}`) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
