import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';

type EmergencyCardRouteProp = RouteProp<RootStackParamList, 'PublicEmergencyCard'>;

export default function EmergencyCardScreen() {
  const route = useRoute<EmergencyCardRouteProp>();
  const { userId } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('full_name, phone, blood_type, allergies, medications')
        .eq('id', userId)
        .single();

      if (error || !profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Emergency Health Card</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{profile.full_name || 'N/A'}</Text>
        </View>

        {profile.phone && (
          <View style={styles.section}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{profile.phone}</Text>
          </View>
        )}

        {profile.blood_type && (
          <View style={styles.section}>
            <Text style={styles.label}>Blood Type:</Text>
            <Text style={styles.value}>{profile.blood_type}</Text>
          </View>
        )}

        {profile.allergies && (
          <View style={styles.section}>
            <Text style={styles.label}>Allergies:</Text>
            <Text style={styles.value}>{profile.allergies}</Text>
          </View>
        )}

        {profile.medications && (
          <View style={styles.section}>
            <Text style={styles.label}>Medications:</Text>
            <Text style={styles.value}>{profile.medications}</Text>
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginTop: 20,
  },
});

