import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Family, FamilyMember } from '../../services/family';

interface FamilyWidgetProps {
  familyData: Family | null;
  userRole: string;
  userName: string;
  members?: FamilyMember[];
}

export default function FamilyWidget({ familyData, userRole, userName, members = [] }: FamilyWidgetProps) {
  const { t } = useTranslation();
  
  if (!familyData) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {familyData.image_url && (
        <Image source={{ uri: familyData.image_url }} style={styles.image} />
      )}
      <Text style={styles.title}>{familyData.name}</Text>
      <Text style={styles.subtitle}>
        {t('Settings.Members.roleOwner')} {userName}
      </Text>
      <Text style={styles.membersCount}>
        {members.length} {t('Settings.Members.members') || 'members'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 10,
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  membersCount: {
    fontSize: 14,
    color: '#999',
  },
});

