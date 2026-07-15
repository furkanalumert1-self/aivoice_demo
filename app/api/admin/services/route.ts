export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

const COLS = {
  id: services.id,
  name: services.name,
  description: services.description,
  durationMinutes: services.durationMinutes,
  price: services.price,
  active: services.active,
  createdAt: services.createdAt,
};

export async function GET() {
  try {
    const rows = await db.select(COLS).from(services);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/admin/services", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, durationMinutes, price, active } = body;
    if (!name) return NextResponse.json({ error: "Hizmet adı gerekli" }, { status: 400 });
    const [row] = await db
      .insert(services)
      .values({
        name,
        description: description ?? null,
        durationMinutes: durationMinutes ?? 30,
        price: price ? String(price) : null,
        active: active ?? true,
      })
      .returning(COLS);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/services", e);
    return NextResponse.json({ error: "Hizmet eklenemedi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    const body = await req.json();
    const { name, description, durationMinutes, price, active } = body;
    const [row] = await db
      .update(services)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(durationMinutes !== undefined && { durationMinutes }),
        ...(price !== undefined && { price: price ? String(price) : null }),
        ...(active !== undefined && { active }),
      })
      .where(eq(services.id, id))
      .returning(COLS);
    if (!row) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    console.error("PATCH /api/admin/services", e);
    return NextResponse.json({ error: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    await db.delete(services).where(eq(services.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/services", e);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
