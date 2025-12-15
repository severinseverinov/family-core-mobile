import { supabase } from './supabase';

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

export interface DashboardItem {
  id: string;
  type: 'event' | 'task';
  title: string;
  description?: string;
  category?: string;
  time?: string;
  is_completed?: boolean;
  completed_by?: string;
  creator?: {
    full_name: string;
    avatar_url: string;
  } | null;
  points?: number;
  pet_name?: string;
  pet_color?: string;
  pet_id?: string;
  routine_id?: string;
  frequency?: string;
  privacy_level?: string;
  assigned_to?: string[] | null;
  status?: 'pending' | 'completed' | 'pending_approval';
  log_id?: string;
  requires_verification?: boolean;
  task_type?: string;
  rule_id?: string;
}

export async function getPublicHolidays(countryCode: string = 'TR') {
  const year = new Date().getFullYear();
  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`
    );
    if (!response.ok) return [];
    return (await response.json()) as Holiday[];
  } catch (error) {
    return [];
  }
}

export async function getDashboardItems(dateStr?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role, id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) return { items: [] };

  const isAdmin = ['owner', 'admin'].includes(profile.role || '');
  const targetDate = dateStr ? new Date(dateStr) : new Date();

  const queryStart = new Date(targetDate);
  queryStart.setHours(0, 0, 0, 0);
  const queryStartStr = queryStart.toISOString();

  const queryEnd = new Date(targetDate);
  queryEnd.setHours(23, 59, 59, 999);
  const queryEndStr = queryEnd.toISOString();

  // One-time events
  const { data: oneTimeEvents } = await supabase
    .from('events')
    .select(
      `*, completer:completed_by(full_name), creator:created_by(full_name, avatar_url)`
    )
    .eq('family_id', profile.family_id)
    .or('frequency.eq.none,frequency.is.null')
    .gte('start_time', queryStartStr)
    .lte('start_time', queryEndStr)
    .order('start_time', { ascending: true });

  // Recurring events
  const { data: recurringEvents } = await supabase
    .from('events')
    .select(`*, creator:created_by(full_name, avatar_url)`)
    .eq('family_id', profile.family_id)
    .neq('frequency', 'none')
    .lte('start_time', queryEndStr);

  // Process recurring events
  const processedRecurring: DashboardItem[] = [];
  if (recurringEvents) {
    for (const event of recurringEvents) {
      const eventDate = new Date(event.start_time);
      const dayOfWeek = eventDate.getDay();
      const dayOfMonth = eventDate.getDate();

      let shouldInclude = false;
      if (event.frequency === 'daily') {
        shouldInclude = true;
      } else if (event.frequency === 'weekly' && eventDate.getDay() === new Date(targetDate).getDay()) {
        shouldInclude = true;
      } else if (event.frequency === 'monthly' && eventDate.getDate() === new Date(targetDate).getDate()) {
        shouldInclude = true;
      }

      if (shouldInclude) {
        processedRecurring.push({
          id: event.id,
          type: 'event',
          title: event.title,
          description: event.description,
          category: event.category,
          time: event.start_time,
          creator: event.creator,
        });
      }
    }
  }

  // Tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      `*, creator:created_by(full_name, avatar_url), completer:completed_by(full_name)`
    )
    .eq('family_id', profile.family_id)
    .gte('due_date', queryStartStr)
    .lte('due_date', queryEndStr)
    .order('due_date', { ascending: true });

  const allItems: DashboardItem[] = [
    ...(oneTimeEvents || []).map((e: any) => ({
      id: e.id,
      type: 'event' as const,
      title: e.title,
      description: e.description,
      category: e.category,
      time: e.start_time,
      is_completed: e.is_completed,
      completed_by: e.completer?.full_name,
      creator: e.creator,
    })),
    ...processedRecurring,
    ...(tasks || []).map((t: any) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      description: t.description,
      category: t.category,
      time: t.due_date,
      is_completed: t.is_completed,
      completed_by: t.completer?.full_name,
      creator: t.creator,
      assigned_to: t.assigned_to,
      points: t.points,
      status: t.status,
    })),
  ];

  return { items: allItems };
}

export async function createEvent(eventData: {
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  category?: string;
  frequency?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) return { error: 'No family' };

  const { data, error } = await supabase
    .from('events')
    .insert({
      family_id: profile.family_id,
      created_by: user.id,
      ...eventData,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, error: null };
}

export async function completeEvent(eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('events')
    .update({ is_completed: true, completed_by: user.id })
    .eq('id', eventId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteEvent(eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('events').delete().eq('id', eventId);

  if (error) return { error: error.message };
  return { success: true };
}

