import {
  pgTable, uuid, text, integer, numeric, boolean,
  timestamp, jsonb
} from "drizzle-orm/pg-core";

// DOCTORS table - new
export const doctors = pgTable("doctors", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  specialization: text("specialization").notNull(),
  workingHours: jsonb("working_hours"), // {mon: "09:00-17:00", tue: "09:00-17:00", ...}
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// APPOINTMENTS table - extended
export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  doctorId: uuid("doctor_id").references(() => doctors.id),
  doctorName: text("doctor_name"), // denormalized for display
  appointmentDate: text("appointment_date"), // "2025-09-10"
  appointmentTime: text("appointment_time"), // "10:00"
  appointmentAt: timestamp("appointment_at"),
  status: text("status").default("onaylandi"), // onaylandi | bekliyor | iptal | tamamlandi
  notes: text("notes"),
  source: text("source").default("voice_agent"), // voice_agent | web | manual
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CALL_LOGS table - new (replaces/extends calls for VAPI logging)
export const callLogs = pgTable("call_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  callerNumber: text("caller_number"),
  vapiCallId: text("vapi_call_id").unique(),
  transcript: text("transcript"),
  summary: text("summary"),
  duration: integer("duration"), // seconds
  intent: text("intent"), // randevu_alma | randevu_iptal | bilgi | geri_arama | diger
  callStatus: text("call_status").default("completed"), // completed | missed | failed
  cost: numeric("cost"),
  recordingUrl: text("recording_url"),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Keep existing calls table for backward compat
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

// AI_ACTIONS table - new
export const aiActions = pgTable("ai_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  actionType: text("action_type").notNull(), // check_availability | create_appointment | cancel | reschedule | doctor_info | callback
  payload: jsonb("payload"),
  result: text("result"),
  callLogId: uuid("call_log_id").references(() => callLogs.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// CLINIC_SETTINGS table - new
export const clinicSettings = pgTable("clinic_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  clinicName: text("clinic_name").default("Klinik AI"),
  openingHour: text("opening_hour").default("09:00"),
  closingHour: text("closing_hour").default("18:00"),
  timezone: text("timezone").default("Europe/Istanbul"),
  emergencyMessage: text("emergency_message"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CALLBACK_REQUESTS table - new
export const callbackRequests = pgTable("callback_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientName: text("patient_name"),
  phone: text("phone").notNull(),
  reason: text("reason"),
  status: text("status").default("bekliyor"), // bekliyor | tamamlandi | iptal
  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// NOTIFICATIONS - keep existing
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title"),
  description: text("description"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export all types
export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type CallLog = typeof callLogs.$inferSelect;
export type NewCallLog = typeof callLogs.$inferInsert;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type AiAction = typeof aiActions.$inferSelect;
export type NewAiAction = typeof aiActions.$inferInsert;
export type ClinicSettings = typeof clinicSettings.$inferSelect;
export type CallbackRequest = typeof callbackRequests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
