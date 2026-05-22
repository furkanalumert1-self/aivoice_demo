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

// WORKFLOW_LOGS — n8n execution tracking
export const workflowLogs = pgTable("workflow_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowName: text("workflow_name").notNull(),
  executionId: text("execution_id"),
  correlationId: text("correlation_id"),
  status: text("status").notNull(), // success | failed | timeout
  errorMessage: text("error_message"),
  payload: jsonb("payload"),
  executionDuration: integer("execution_duration"), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// SYSTEM_EVENTS — internal event log (replaces external notifications)
export const systemEvents = pgTable("system_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(), // appointment_created | appointment_cancelled | call_received | etc
  source: text("source").notNull(), // n8n_workflow | vapi_webhook | admin_action | api_route
  severity: text("severity").default("info"), // info | warning | error | critical
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ADMIN_AUDIT_LOGS — admin action tracking
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull(), // appointment_status_changed | call_viewed | doctor_updated
  actor: text("actor"), // user email or "system"
  target: text("target"), // resource id
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// WORKFLOW_HEALTH — aggregated workflow health metrics
export const workflowHealth = pgTable("workflow_health", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowName: text("workflow_name").notNull().unique(),
  lastExecution: timestamp("last_execution"),
  successRate: numeric("success_rate"), // 0.00-1.00
  avgDuration: integer("avg_duration"), // ms
  failedCount: integer("failed_count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Observability type exports
export type WorkflowLog = typeof workflowLogs.$inferSelect;
export type NewWorkflowLog = typeof workflowLogs.$inferInsert;
export type SystemEvent = typeof systemEvents.$inferSelect;
export type NewSystemEvent = typeof systemEvents.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type WorkflowHealthRecord = typeof workflowHealth.$inferSelect;
