export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { eq } from "drizzle-orm";

const COLS = {
  id: doctors.id,
  fullName: doctors.fullName,
  specialization: doctors.specialization,
  workingHours: doctors.workingHours,
  active: doctors.active,
  createdAt: doctors.createdAt,
};

export async function GET() {
  try {
    const rows = await db.select(COLS).from(doctors);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/admin/doctors", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, specialization, workingHours, active } = body;
    if (!fullName || !specialization) {
      return NextResponse.json({ error: "Ad ve uzmanlık alanı gerekli" }, { status: 400 });
    }
    const [row] = await db
      .insert(doctors)
      .values({ fullName, specialization, workingHours: workingHours ?? null, active: active ?? true })
      .returning(COLS);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/doctors", e);
    return NextResponse.json({ error: "Doktor eklenemedi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    const body = await req.json();
    const { fullName, specialization, workingHours, active } = body;
    const [row] = await db
      .update(doctors)
      .set({
        ...(fullName !== undefined && { fullName }),
        ...(specialization !== undefined && { specialization }),
        ...(workingHours !== undefined && { workingHours }),
        ...(active !== undefined && { active }),
      })
      .where(eq(doctors.id, id))
      .returning(COLS);
    if (!row) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    console.error("PATCH /api/admin/doctors", e);
    return NextResponse.json({ error: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    await db.delete(doctors).where(eq(doctors.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/doctors", e);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
