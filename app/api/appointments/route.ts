export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const records = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get appointments error:", message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientName, patientPhone, phone, doctorName, appointmentAt, appointmentDate, appointmentTime, status, source } = body;

    const resolvedPhone = patientPhone ?? phone;
    if (!patientName || !resolvedPhone) {
      return NextResponse.json(
        { error: "Hasta adı ve telefon gerekli" },
        { status: 400 }
      );
    }

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        patientName,
        patientPhone: resolvedPhone,
        doctorName: doctorName ?? "Belirtilmedi",
        appointmentAt: appointmentAt ? new Date(appointmentAt) : null,
        appointmentDate: appointmentDate ?? null,
        appointmentTime: appointmentTime ?? null,
        status: status ?? "onaylandi",
        source: source ?? "web",
      })
      .returning();

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json({ error: "Randevu oluşturulamadı" }, { status: 500 });
  }
}
