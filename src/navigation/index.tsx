import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../contexts/AuthContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import TaskDetailScreen from "../screens/TaskDetailScreen";
import GivePointsScreen from "../screens/GivePointsScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  // Yükleme ekranı
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Kullanıcı giriş yapmamışsa sadece Login/Register sayfaları görünür
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          // Kullanıcı giriş yapmışsa ana uygulama başlar
          <>
            <Stack.Screen name="MainTabs" component={MainNavigator} />

            {/* Detay sayfaları genelde Stack'te tutulur ki her yerden erişilebilsin */}
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ headerShown: true, title: "Görev Detayı" }}
            />
            <Stack.Screen
              name="GivePoints"
              component={GivePointsScreen}
              options={{ headerShown: true, title: "Puan Ver" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
