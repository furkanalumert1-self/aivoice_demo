export const dynamic = "force-dynamic";

import { db } from "@/db";
import { doctors } from "@/db/schema";
import DoctorsList from "@/components/doctors-list";

export default async function DoctorsPage() {
  let records: typeof doctors.$inferSelect[] = [];
  try {
    records = await db.select().from(doctors);
  } catch (e) {
    console.error("DoctorsPage fetch error:", e);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DoctorsList initial={records} />
    </div>
  );
}
