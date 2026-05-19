export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doctorName, date } = body?.message?.toolCallList?.[0]?.function?.parameters ?? body;

    if (!date) {
      return NextResponse.json({ error: "Tarih gerekli" }, { status: 400 });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const booked = await db
      .select({ appointmentAt: appointments.appointmentAt })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentAt, startOfDay),
          lte(appointments.appointmentAt, endOfDay),
          doctorName ? eq(appointments.doctorName, doctorName) : undefined,
          eq(appointments.status, "onaylandi")
        )
      );

    const bookedTimes = booked.map((a) => {
      if (!a.appointmentAt) return null;
      const d = new Date(a.appointmentAt);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    }).filter(Boolean);

    const allSlots = [];
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        if (!bookedTimes.includes(time)) {
          allSlots.push(time);
        }
      }
    }

    return NextResponse.json({
      results: [
        {
          toolCallId: body?.message?.toolCallList?.[0]?.id ?? "unknown",
          result: {
            available: allSlots.length > 0,
            slots: allSlots.slice(0, 6),
            date,
            doctorName: doctorName ?? "Herhangi bir doktor",
          },
        },
      ],
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json({ error: "Müsaitlik kontrolü başarısız" }, { status: 500 });
  }
}
