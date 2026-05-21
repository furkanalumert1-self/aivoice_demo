export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, doctors } from "@/db/schema";
import { and, gte, lte, eq, ne } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toolCall = body?.message?.toolCallList?.[0];
    const toolCallId = toolCall?.id ?? "unknown";

    let params: Record<string, string> = {};
    try {
      params = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch {
      params = toolCall?.function?.parameters ?? body;
    }

    const { doctorName, preferredDate, preferredTime, date } = params;
    const targetDate = preferredDate ?? date;

    if (!targetDate) {
      return NextResponse.json({ error: "Tarih gerekli" }, { status: 400 });
    }

    // Look up doctor in DB if name provided
    let doctorRecord = null;
    if (doctorName) {
      const doctorResults = await db
        .select()
        .from(doctors)
        .where(and(eq(doctors.fullName, doctorName), eq(doctors.active, true)));
      doctorRecord = doctorResults[0] ?? null;
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch booked slots for the day
    const bookedQuery = db
      .select({ appointmentTime: appointments.appointmentTime, doctorName: appointments.doctorName })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentAt, startOfDay),
          lte(appointments.appointmentAt, endOfDay),
          ne(appointments.status, "iptal")
        )
      );

    const booked = await bookedQuery;

    const bookedTimes = booked
      .filter((a) => !doctorName || a.doctorName === doctorName)
      .map((a) => a.appointmentTime)
      .filter(Boolean) as string[];

    // Generate available slots (09:00 - 17:30 in 30 min increments)
    const allSlots: string[] = [];
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        if (!bookedTimes.includes(time)) {
          allSlots.push(time);
        }
      }
    }

    const availableSlots = allSlots.slice(0, 6);
    const doctorDisplayName = doctorRecord?.fullName ?? doctorName ?? "Herhangi bir doktor";

    let resultMessage: string;
    if (availableSlots.length === 0) {
      resultMessage = `${doctorDisplayName} için ${targetDate} tarihinde müsait slot bulunmuyor.`;
    } else {
      const slotList = availableSlots.join(", ");
      if (preferredTime && availableSlots.includes(preferredTime)) {
        resultMessage = `${doctorDisplayName} ${targetDate} tarihinde ${preferredTime} saatinde müsait.`;
      } else {
        resultMessage = `${doctorDisplayName} ${targetDate} tarihinde müsait saatler: ${slotList}.`;
      }
    }

    return NextResponse.json({
      results: [
        {
          toolCallId,
          result: resultMessage,
        },
      ],
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json({ error: "Müsaitlik kontrolü başarısız" }, { status: 500 });
  }
}
