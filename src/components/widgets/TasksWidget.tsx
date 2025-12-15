import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DashboardItem } from '../../services/events';

interface TasksWidgetProps {
  initialItems: DashboardItem[];
  userRole: string;
  userId: string;
  familyMembers: any[];
}

export default function TasksWidget({ initialItems, userRole, userId, familyMembers }: TasksWidgetProps) {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('Tasks.title') || 'Tasks'}</Text>
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

