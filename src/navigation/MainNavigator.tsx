import React, { useCallback, useState } from "react";
import { View, Image, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  CheckSquare,
  Apple,
  PawPrint,
  ShoppingCart,
  Wallet,
  Activity,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";

// Ekranlar
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import TaskScreen from "../screens/task/TaskScreen";
import PetScreen from "../screens/pets/PetScreen";
import KitchenScreen from "../screens/kitchen/KitchenScreen";
import FinanceScreen from "../screens/finance/FinanceScreen";
import ProfileHubScreen from "../screens/profile/ProfileHubScreen";
import ActiveDietScreen from "../screens/profile/ActiveDietScreen";
import { getMemberById } from "../services/family";

const Tab = createBottomTabNavigator();

const ProfileTabIcon = ({ focused, color }: any) => {
  const { profile } = useAuth();

  const getAvatarUri = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    const seed = profile?.gender === "female" ? "Aneka" : "Felix";
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4`;
  };

  return (
    <View
      style={[
        styles.hubWrapper,
        { borderColor: focused ? color : "transparent" },
      ]}
    >
      <Image source={{ uri: getAvatarUri() }} style={styles.hubImage} />
    </View>
  );
};

function hexToTransparent(hex: string): string {
  if (hex.startsWith("#") && (hex.length === 7 || hex.length === 9))
    return hex.length === 7 ? hex + "00" : hex.slice(0, 7) + "00";
  return "transparent";
}

export default function MainNavigator() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const transparentBg = hexToTransparent(colors.background);
  const [hasActiveDiet, setHasActiveDiet] = useState(false);

  const refreshDietStatus = useCallback(async () => {
    if (!profile?.id) return;
    const res = await getMemberById(profile.id);
    const mealPrefs: any = res.member?.meal_preferences || {};
    const dietEnabledValue: any = mealPrefs.diet_enabled;

    // Diyet özelliği açık mı kontrol et (diet_enabled true ise sekme göster)
    const isEnabled = dietEnabledValue !== false; // Varsayılan true

    setHasActiveDiet(Boolean(isEnabled));
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshDietStatus();
    }, [refreshDietStatus]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarBackground: () => (
            <LinearGradient
              colors={
                [transparentBg, colors.background, colors.background] as [
                  string,
                  string,
                  ...string[],
                ]
              }
              locations={[0, 0.3, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: Platform.OS === "ios" ? 85 : 70,
            paddingBottom: Platform.OS === "ios" ? 25 : 10,
            paddingTop: 10,
            elevation: 0,
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
            shadowColor: "transparent",
          },
          tabBarLabelStyle: { fontWeight: "700", fontSize: 10 },
        }}
      >
        <Tab.Screen
          name="Home"
          component={DashboardScreen}
          options={{
            tabBarLabel: "Özet",
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconShadowWrapper, iconShadow]}>
                <Home color={color} size={24} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Mutfak"
          component={KitchenScreen}
          options={{
            tabBarLabel: "Mutfak",
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconShadowWrapper, iconShadow]}>
                <ShoppingCart color={color} size={24} />
              </View>
            ),
          }}
        />
        {hasActiveDiet ? (
          <Tab.Screen
            name="Diet"
            component={ActiveDietScreen}
            options={{
              tabBarLabel: "Diyet",
              tabBarIcon: ({ color }) => (
                <View style={[styles.iconShadowWrapper, iconShadow]}>
                  <Activity color={color} size={24} />
                </View>
              ),
            }}
          />
        ) : null}
        <Tab.Screen
          name="Pet"
          component={PetScreen}
          options={{
            tabBarLabel: "Pet",
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconShadowWrapper, iconShadow]}>
                <PawPrint color={color} size={24} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            tabBarLabel: "Finans",
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconShadowWrapper, iconShadow]}>
                <Wallet color={color} size={24} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Hub"
          component={ProfileHubScreen}
          options={{
            tabBarLabel: () => null, // Yazı kaldırıldı
            tabBarIcon: props => <ProfileTabIcon {...props} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const iconShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.45,
  shadowRadius: 8,
  elevation: 8,
};

const styles = StyleSheet.create({
  iconShadowWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
  },
  hubWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    padding: 2,
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  hubImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
});
