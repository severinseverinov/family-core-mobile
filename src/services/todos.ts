import { supabase } from "./supabase";
import { sendPushToFamily } from "./notifications";

export async function addTodoItem(input: {
  title: string;
  dueDate?: string | null;
  assigneeIds?: string[];
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

  const assignees = input.assigneeIds?.length
    ? input.assigneeIds
    : [user.id];

  const { data: assigneeProfiles } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", assignees);

  const rows = assignees.map(assigneeId => {
    const role = assigneeProfiles?.find(p => p.id === assigneeId)?.role;
    const requiresApproval =
      (role === "owner" || role === "admin") && assigneeId !== user.id;
    return {
      family_id: profile.family_id,
      profile_id: assigneeId,
      assigned_to: assigneeId,
      created_by: user.id,
      title: input.title,
      due_date: input.dueDate || null,
      requires_approval: requiresApproval,
      status: requiresApproval ? "pending_approval" : "approved",
    };
  });

  const { error } = await supabase.from("todo_items").insert(rows);

  if (error) return { success: false, error: error.message };

  const pendingAssignees = rows
    .filter(r => r.status === "pending_approval")
    .map(r => r.profile_id)
    .filter(id => id !== user.id);
  const approvedAssignees = rows
    .filter(r => r.status === "approved")
    .map(r => r.profile_id)
    .filter(id => id !== user.id);

  if (pendingAssignees.length > 0) {
    await sendPushToFamily({
      familyId: profile.family_id,
      title: "To Do onayı gerekli",
      body: `"${input.title}" için onay bekleniyor.`,
      excludeUserId: user.id,
      targetUserIds: pendingAssignees,
      dataType: "todo_approval",
    });
  }

  if (approvedAssignees.length > 0) {
    await sendPushToFamily({
      familyId: profile.family_id,
      title: "To Do eklendi",
      body: `"${input.title}" yapılacaklarına eklendi.`,
      excludeUserId: user.id,
      targetUserIds: approvedAssignees,
      dataType: "todo_assigned",
    });
  }

  return { success: true };
}

export async function approveTodoItem(todoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın." };

  const { data: todo } = await supabase
    .from("todo_items")
    .select("id, title, family_id, created_by, profile_id, status")
    .eq("id", todoId)
    .single();
  if (!todo) return { success: false, error: "To Do bulunamadı." };

  const { error } = await supabase
    .from("todo_items")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", todoId)
    .eq("profile_id", user.id)
    .eq("status", "pending_approval");

  if (error) return { success: false, error: error.message };

  if (todo.created_by && todo.created_by !== user.id) {
    await sendPushToFamily({
      familyId: todo.family_id,
      title: "To Do onaylandı",
      body: `"${todo.title}" onaylandı.`,
      excludeUserId: user.id,
      targetUserIds: [todo.created_by],
      dataType: "todo_approved",
    });
  }
  return { success: true };
}

export async function toggleTodoComplete(todoId: string, nextValue: boolean) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın." };

  const { error } = await supabase
    .from("todo_items")
    .update({ is_completed: nextValue })
    .eq("id", todoId)
    .eq("profile_id", user.id)
    .eq("status", "approved");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateTodoItem(todoId: string, updates: { title?: string; dueDate?: string | null }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın." };

  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;

  const { error } = await supabase
    .from("todo_items")
    .update(payload)
    .eq("id", todoId)
    .eq("created_by", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteTodoItem(todoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum açın." };

  const { error } = await supabase
    .from("todo_items")
    .delete()
    .eq("id", todoId)
    .or(`created_by.eq.${user.id},profile_id.eq.${user.id}`);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
