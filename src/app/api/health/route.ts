import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    await db.user.findUnique({
      where: {
        id: process.env.APP_OWNER_ID ?? "00000000-0000-4000-8000-000000000000",
      },
      select: { id: true },
    });
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
