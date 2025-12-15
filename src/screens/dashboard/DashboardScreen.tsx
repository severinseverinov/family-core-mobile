import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getFamilyDetails, getFamilyMembers } from '../../services/family';
import { getDashboardItems, getPublicHolidays } from '../../services/events';
import { getPets } from '../../services/pets';
import { getInventoryAndBudget } from '../../services/kitchen';
import { supabase } from '../../services/supabase';
import CalendarWidget from '../../components/widgets/CalendarWidget';
import TasksWidget from '../../components/widgets/TasksWidget';
import KitchenWidget from '../../components/widgets/KitchenWidget';
import PetWidget from '../../components/widgets/PetWidget';
import FamilyWidget from '../../components/widgets/FamilyWidget';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [membersData, setMembersData] = useState<any>(null);
  const [eventsData, setEventsData] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [petsData, setPetsData] = useState<any>(null);
  const [kitchenData, setKitchenData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) return;

      setUser(currentUser);

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (!currentProfile) return;
      setProfile(currentProfile);

      if (!currentProfile.family_id) {
        setLoading(false);
        return;
      }

      const [familyRes, membersRes, eventsRes, holidaysRes, petsRes, kitchenRes] = await Promise.all([
        getFamilyDetails(),
        getFamilyMembers(),
        getDashboardItems(),
        getPublicHolidays('TR'),
        getPets(),
        getInventoryAndBudget(),
      ]);

      setFamilyData(familyRes);
      setMembersData(membersRes);
      setEventsData(eventsRes);
      setHolidays(holidaysRes);
      setPetsData(petsRes);
      setKitchenData(kitchenRes);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>{t('Common.loading')}</Text>
      </View>
    );
  }

  if (!profile?.family_id) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('Common.noFamily') || 'No family found'}</Text>
      </View>
    );
  }

  const userName = profile.full_name || user?.email?.split('@')[0] || 'User';
  const userRole = profile.role || 'member';

  return (
    <ScrollView style={styles.container}>
      <FamilyWidget
        familyData={familyData?.family}
        userRole={userRole}
        userName={userName}
        members={membersData?.members || []}
      />
      
      <CalendarWidget
        initialHolidays={holidays}
        events={eventsData?.items || []}
      />
      
      <TasksWidget
        initialItems={eventsData?.items || []}
        userRole={userRole}
        userId={user.id}
        familyMembers={membersData?.members || []}
      />
      
      {petsData?.pets && petsData.pets.length > 0 && (
        <PetWidget
          pets={petsData.pets}
          userId={user.id}
          userRole={userRole}
        />
      )}
      
      <KitchenWidget
        initialInventory={kitchenData?.items || []}
        initialShoppingList={kitchenData?.shoppingList || []}
        initialBudget={kitchenData?.budget || 0}
        initialSpent={kitchenData?.spent || 0}
        currency={kitchenData?.currency || 'TL'}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginTop: 20,
  },
});

