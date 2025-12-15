import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';

type JoinScreenRouteProp = RouteProp<RootStackParamList, 'Join'>;
type JoinScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Join'>;

export default function JoinScreen() {
  const { t } = useTranslation();
  const route = useRoute<JoinScreenRouteProp>();
  const navigation = useNavigation<JoinScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const token = route.params?.token;

  useEffect(() => {
    if (!token) {
      Alert.alert(t('Common.error'), t('Common.invalidToken') || 'Invalid token');
      navigation.navigate('Login');
      return;
    }

    handleJoinFamily();
  }, [token]);

  const handleJoinFamily = async () => {
    try {
      const { data: invitation, error: inviteError } = await supabase.rpc(
        'get_invitation_by_token',
        { token_input: token }
      );

      if (inviteError || !invitation || invitation.length === 0) {
        Alert.alert(t('Common.error'), t('Common.invalidInvitation') || 'Invalid invitation');
        navigation.navigate('Login');
        return;
      }

      const invite = invitation[0];
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(t('Common.error'), t('Common.pleaseLogin') || 'Please login first');
        navigation.navigate('Login');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          family_id: invite.family_id,
          role: invite.role || 'member',
        })
        .eq('id', user.id);

      if (updateError) {
        Alert.alert(t('Common.error'), updateError.message);
        return;
      }

      await supabase.rpc('mark_invitation_accepted', { invite_id: invite.id });
      Alert.alert(t('Common.success'), t('Common.joinedFamily') || 'Successfully joined family!');
    } catch (error: any) {
      Alert.alert(t('Common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>{t('Common.loading')}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
});

