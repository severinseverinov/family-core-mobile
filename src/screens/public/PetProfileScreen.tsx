import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import HeartbeatLoader from '../../components/ui/HeartbeatLoader';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';

type PetProfileRouteProp = RouteProp<RootStackParamList, 'PublicPetProfile'>;

export default function PetProfileScreen() {
  const route = useRoute<PetProfileRouteProp>();
  const { id } = route.params;
  const [pet, setPet] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPetData();
  }, [id]);

  const loadPetData = async () => {
    try {
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', id)
        .single();

      if (petError || !petData) {
        setLoading(false);
        return;
      }

      setPet(petData);

      // Get owner info
      const { data: familyData } = await supabase
        .from('families')
        .select('id')
        .eq('id', petData.family_id)
        .single();

      if (familyData) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('family_id', familyData.id)
          .eq('role', 'owner')
          .single();

        setOwner(ownerData);
      }
    } catch (error) {
      console.error('Error loading pet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <HeartbeatLoader size={56} variant="full" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Pet not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {pet.image_url && (
        <Image source={{ uri: pet.image_url }} style={styles.image} />
      )}
      <View style={styles.content}>
        <Text style={styles.name}>{pet.name}</Text>
        <Text style={styles.type}>{pet.type}</Text>
        
        {owner && (
          <View style={styles.ownerSection}>
            <Text style={styles.ownerLabel}>Owner:</Text>
            <Text style={styles.ownerName}>{owner.full_name}</Text>
            {owner.phone && (
              <Text style={styles.ownerPhone}>{owner.phone}</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  type: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  ownerSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  ownerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  ownerPhone: {
    fontSize: 16,
    color: '#007AFF',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginTop: 20,
  },
});

