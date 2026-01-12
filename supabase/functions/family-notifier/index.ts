// @ts-nocheck
// Deno Edge Function - TypeScript linter desteği yok
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req: Request) => {
  const { record, old_record, type } = await req.json();

  // Supabase istemcisini kur (Bildirim token'larını çekmek için)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let targetUserIds: string[] = [];
  let messageTitle = "Aile Bildirimi";
  let messageBody = "";

  // SENARYO 1: Yeni Görev Atandığında (INSERT)
  if (type === "INSERT" && record.assigned_to) {
    targetUserIds = record.assigned_to.split(",");
    messageTitle = "Yeni Görev Atandı! 📋";
    messageBody = `${record.title} görevi sana atandı.`;
  }

  // SENARYO 2: Görev Onaylandığında (UPDATE - Status Değişimi)
  if (
    type === "UPDATE" &&
    record.status === "completed" &&
    old_record.status !== "completed"
  ) {
    targetUserIds = [record.created_by];
    messageTitle = "Görev Tamamlandı! ✅";
    messageBody = `${record.title} görevi başarıyla tamamlandı ve onaylandı.`;
  }

  if (targetUserIds.length > 0) {
    // Alıcıların push_token bilgilerini al
    const { data: profiles } = await supabase
      .from("profiles")
      .select("push_token")
      .in("id", targetUserIds);

    const tokens = profiles
      ?.map((p: any) => p.push_token)
      .filter((t: any) => t);

    if (tokens && tokens.length > 0) {
      const messages = tokens.map((token: string) => ({
        to: token,
        sound: "default",
        title: messageTitle,
        body: messageBody,
        data: { eventId: record.id },
      }));

      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
