import { supabase } from './supabase';

export interface Pet {
  id: string;
  name: string;
  type: string;
  color: string | null;
  gender: string | null;
  image_url: string | null;
  family_id: string;
  created_at: string;
}

export interface PetRoutine {
  id: string;
  pet_id: string;
  title: string;
  points: number;
  frequency: string;
  requires_verification: boolean;
  assigned_to: string[] | null;
}

export async function getPets() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { pets: [] };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) return { pets: [] };

  const { data: pets } = await supabase
    .from('pets')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: false });

  return { pets: pets || [] };
}

export async function getPetRoutines(petId: string) {
  const { data } = await supabase
    .from('pet_routines')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: true });
  return { routines: data || [] };
}

export async function createPet(petData: {
  name: string;
  type: string;
  color?: string;
  gender?: string;
  imageUri?: string;
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

  let imageUrl = null;
  if (petData.imageUri) {
    const fileExt = petData.imageUri.split('.').pop();
    const fileName = `pets/${user.id}-${Date.now()}.${fileExt}`;
    
    // Convert URI to blob
    const response = await fetch(petData.imageUri);
    const blob = await response.blob();
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, blob, { upsert: true });
    
    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('images').getPublicUrl(fileName);
      imageUrl = publicUrl;
    }
  }

  const { data, error } = await supabase
    .from('pets')
    .insert({
      family_id: profile.family_id,
      name: petData.name,
      type: petData.type,
      color: petData.color || null,
      gender: petData.gender || null,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, error: null };
}

export async function deletePet(petId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('pets').delete().eq('id', petId);
  if (error) return { error: error.message };
  return { success: true };
}

