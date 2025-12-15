import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pet } from '../../services/pets';

interface PetWidgetProps {
  pets: Pet[];
  userId: string;
  userRole: string;
}

export default function PetWidget({ pets, userId, userRole }: PetWidgetProps) {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('Pets.title') || 'Pets'}</Text>
      <Text style={styles.subtitle}>{t('Common.comingSoon') || 'Coming soon...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});

