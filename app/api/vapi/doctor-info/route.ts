export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctors, aiActions } from "@/db/schema";
import { eq, like } from "drizzle-orm";

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

    const { doctorName, specialization } = params;

    let doctorList;
    if (doctorName) {
      doctorList = await db
        .select()
        .from(doctors)
        .where(like(doctors.fullName, `%${doctorName}%`));
    } else if (specialization) {
      doctorList = await db
        .select()
        .from(doctors)
        .where(like(doctors.specialization, `%${specialization}%`));
    } else {
      doctorList = await db
        .select()
        .from(doctors)
        .where(eq(doctors.active, true));
    }

    // Log ai_action
    await db.insert(aiActions).values({
      actionType: "doctor_info",
      payload: { doctorName: doctorName ?? null, specialization: specialization ?? null },
      result: `${doctorList.length} doktor bilgisi döndürüldü.`,
    });

    if (doctorList.length === 0) {
      return NextResponse.json({
        results: [
          {
            toolCallId,
            result: "Aradığınız kriterlere uyan doktor bulunamadı.",
          },
        ],
      });
    }

    const infoLines = doctorList.map((doc) => {
      const wh = doc.workingHours as Record<string, string | null> | null;
      let schedule = "";
      if (wh) {
        const days: Record<string, string> = {
          mon: "Pzt",
          tue: "Sal",
          wed: "Çar",
          thu: "Per",
          fri: "Cum",
          sat: "Cmt",
          sun: "Paz",
        };
        const activeDays = Object.entries(wh)
          .filter(([, v]) => v)
          .map(([k, v]) => `${days[k] ?? k}: ${v}`)
          .join(", ");
        schedule = ` Çalışma saatleri: ${activeDays}.`;
      }
      return `${doc.fullName} (${doc.specialization}).${schedule}`;
    });

    const resultMessage = infoLines.join(" | ");

    return NextResponse.json({
      results: [
        {
          toolCallId,
          result: resultMessage,
        },
      ],
    });
  } catch (error) {
    console.error("Doctor info error:", error);
    return NextResponse.json({ error: "Doktor bilgisi alınamadı" }, { status: 500 });
  }
}
