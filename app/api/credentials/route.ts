import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertPersonalAccess, encryptSecret } from "@/lib/security";
import { credentialSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertPersonalAccess(request);
    const formData = await request.formData();
    const parsed = credentialSchema.parse(Object.fromEntries(formData.entries()));
    const encrypted = encryptSecret(parsed.password);

    const credential = await prisma.credential.upsert({
      where: { brand: parsed.brand },
      create: {
        brand: parsed.brand,
        username: parsed.username,
        encryptedPassword: encrypted.encryptedPassword,
        encryptionMetaJson: encrypted.encryptionMetaJson,
        status: "READY"
      },
      update: {
        username: parsed.username,
        encryptedPassword: encrypted.encryptedPassword,
        encryptionMetaJson: encrypted.encryptionMetaJson,
        status: "READY"
      },
      select: {
        id: true,
        brand: true,
        username: true,
        status: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save credential." }, { status: 400 });
  }
}
