export const dynamic = "force-dynamic";

import { db } from "@/db";
import { services } from "@/db/schema";
import ServicesList from "@/components/services-list";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  price: string | null;
  active: boolean | null;
};

export default async function ServicesPage() {
  let records: ServiceRow[] = [];
  try {
    records = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        durationMinutes: services.durationMinutes,
        price: services.price,
        active: services.active,
      })
      .from(services);
  } catch (e) {
    console.error("ServicesPage fetch error:", e);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ServicesList initial={records} />
    </div>
  );
}
