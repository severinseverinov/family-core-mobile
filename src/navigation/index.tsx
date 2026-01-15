import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  ImageBackground,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";

// Ekran Importları
import TaskDetailScreen from "../screens/TaskDetailScreen";
import AddTaskScreen from "../screens/task/AddTaskScreen";
import AddPetScreen from "../screens/pets/AddPetScreen";
import AddKitchenItemScreen from "../screens/kitchen/AddKitchenItemScreen";
import AddVaultItemScreen from "../screens/dashboard/AddVaultItemScreen";
import VaultScreen from "../screens/dashboard/VaultScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import FamilyManagementScreen from "../screens/family/FamilyManagementScreen";
import MemberDetailScreen from "../screens/family/MemberDetailScreen";
import ReceiptConfirmScreen from "../screens/kitchen/ReceiptConfirmScreen";
import FinanceSettingsScreen from "../screens/finance/FinanceSettingsScreen";
import FamilyFinanceScreen from "../screens/family/FamilyFinanceScreen";
import { fetchWeather } from "../services/weather";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();
  const { themeMode, colors } = useTheme();
  const fallbackTint = "rgba(120,130,150,0.12)";
  const [weatherColor, setWeatherColor] = useState<string>(fallbackTint);
  const [weatherImage, setWeatherImage] = useState<string | null>(null);

  const baseTheme = themeMode === "dark" ? DarkTheme : DefaultTheme;

  // Hafif hava durumu bazlı arka plan
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({});
        const data = await fetchWeather(
          loc.coords.latitude,
          loc.coords.longitude
        );
        const main = data?.current?.weather?.[0]?.main || "";
        const palette: Record<string, string> = {
          Clear: "rgba(255,210,130,0.18)",
          Clouds: "rgba(180,195,210,0.18)",
          Rain: "rgba(120,150,200,0.18)",
          Snow: "rgba(200,220,240,0.18)",
          Thunderstorm: "rgba(130,120,180,0.18)",
        };
        const images: Record<string, string> = {
          Clear:
            "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1600&q=60",
          Clouds:
            "https://images.unsplash.com/photo-1505764706515-aa95265c5abb?auto=format&fit=crop&w=1600&q=60",
          Rain: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=60",
          Snow: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=60",
          Thunderstorm:
            "https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&w=1600&q=60",
        };
        if (!cancelled) {
          setWeatherColor(palette[main] || fallbackTint);
          setWeatherImage(images[main] || images.Clouds);
        }
      } catch (e) {
        if (!cancelled) setWeatherColor(fallbackTint);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {weatherImage ? (
        <ImageBackground
          source={{ uri: weatherImage }}
          resizeMode="cover"
          blurRadius={20}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}

      {weatherColor && (
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: weatherColor,
            zIndex: 1,
          }}
        />
      )}

      <View style={{ flex: 1, zIndex: 2 }}>
        <NavigationContainer
          theme={{
            ...baseTheme,
            colors: {
              ...baseTheme.colors,
              primary: colors.primary,
              background: "transparent",
              card: colors.card,
              text: colors.text,
              border: colors.border,
              notification: colors.accent,
            },
          }}
        >
          <StatusBar
            style={themeMode === "dark" ? "light" : "dark"}
            translucent
            backgroundColor="transparent"
          />

          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.background },
            }}
          >
            {!user ? (
              <Stack.Screen name="Auth" component={AuthNavigator} />
            ) : (
              <>
                <Stack.Screen name="MainTabs" component={MainNavigator} />
                <Stack.Screen
                  name="AddTask"
                  component={AddTaskScreen}
                  options={{
                    headerShown: true,
                    title: "Hatırlatma / Yeni Görev Tanımla",
                  }}
                />
                <Stack.Screen
                  name="AddPet"
                  component={AddPetScreen}
                  options={{ headerShown: true, title: "Yeni Pet" }}
                />
                <Stack.Screen
                  name="AddKitchenItem"
                  component={AddKitchenItemScreen}
                  options={{ headerShown: true, title: "Ürün Ekle" }}
                />
                <Stack.Screen
                  name="AddVaultItem"
                  component={AddVaultItemScreen}
                  options={{ headerShown: true, title: "Kasa Kaydı" }}
                />
                <Stack.Screen
                  name="Vault"
                  component={VaultScreen}
                  options={{ headerShown: true, title: "Aile Kasası" }}
                />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{ headerShown: true, title: "Ayarlar" }}
                />
                <Stack.Screen
                  name="FamilyManagement"
                  component={FamilyManagementScreen}
                  options={{ headerShown: true, title: "Üyeleri Yönet" }}
                />
                <Stack.Screen
                  name="MemberDetail"
                  component={MemberDetailScreen}
                  options={{ headerShown: true, title: "Kişi Detayı" }}
                />
                <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
                <Stack.Screen
                  name="ReceiptConfirm"
                  component={ReceiptConfirmScreen}
                  options={{
                    headerShown: true,
                    title: "Fiş Detaylarını Onayla",
                  }}
                />
                <Stack.Screen
                  name="FinanceSettings"
                  component={FinanceSettingsScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="FamilyFinance"
                  component={FamilyFinanceScreen}
                  options={{ headerShown: true, title: "Aile Finansları" }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </View>
  );
}
