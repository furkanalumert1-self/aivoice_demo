import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientName: text("patient_name"),
  phone: text("phone"),
  doctorName: text("doctor_name"),
  appointmentAt: timestamp("appointment_at"),
  status: text("status").default("onaylandi"),
  source: text("source").default("voice_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  callerPhone: text("caller_phone"),
  durationSeconds: integer("duration_seconds"),
  transcript: text("transcript"),
  summary: text("summary"),
  cost: numeric("cost"),
  outcome: text("outcome"),
  appointmentId: uuid("appointment_id"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title"),
  description: text("description"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
