import { supabase } from "./supabase";
import { sendPushToFamily } from "./notifications";

export type RoutineKind = "routine" | "work" | "school";
export type RoutineRecurrence = "daily" | "weekly" | "monthly";

export async function addDailyRoutine(input: {
  title: string;
  kind: RoutineKind;
  shiftType?: "morning" | "evening" | "night";
  visibilityScope?: "family" | "spouse";
  recurrenceType: RoutineRecurrence;
  daysOfWeek?: string[];
  dayOfMonths?: number[] | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { success: false, error: "Aile bulunamadı." };

  const { error } = await supabase.from("daily_routines").insert({
    family_id: profile.family_id,
    title: input.title,
    kind: input.kind,
    shift_type: input.shiftType || "morning",
    visibility_scope: input.visibilityScope || "family",
    recurrence_type: input.recurrenceType,
    days_of_week: input.daysOfWeek || [],
    day_of_months: input.dayOfMonths || [],
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    notes: input.notes ?? null,
    created_by: user.id,
  });

  if (error) return { success: false, error: error.message };

  // Aileye bildirim gönder (oluşturan hariç)
  await sendPushToFamily({
    familyId: profile.family_id,
    title: "Yeni rutin eklendi",
    body: `"${input.title}" rutini eklendi.`,
    excludeUserId: user.id,
    dataType: "routine_added",
  });

  return { success: true };
}
