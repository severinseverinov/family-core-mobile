import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
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

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { themeMode } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainNavigator} />

            {/* Navigasyon Hatalarını Çözen Stack Kayıtları */}
            <Stack.Screen
              name="AddTask"
              component={AddTaskScreen}
              options={{ headerShown: true, title: "Yeni Görev" }}
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
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
