// App.tsx

import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AppNavigator from "./src/navigation/index";
import SplashScreen from "./src/screens/SplashScreen";
import * as Notifications from "expo-notifications";
import { markWaterDrank } from "./src/services/waterReminder";

const queryClient = new QueryClient();

// Alt bileşen oluşturuyoruz çünkü useAuth() kullanabilmek için AuthProvider içinde olmalıyız
function RootApp() {
  const { loading: authLoading } = useAuth();
  const [timerFinished, setTimerFinished] = useState(false);

  // Su içme bildirimi response handler
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === "water_reminder") {
          // "İçtim" butonuna basıldı veya bildirime tıklandı
          if (response.actionIdentifier === "drank" || response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
            await markWaterDrank(data.memberId, data.timeSlot || "");
          }
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // Uygulama ne zaman hazır? Hem auth kontrolü bitmeli hem Splash süresi dolmalı
  const isReady = !authLoading && timerFinished;

  return (
    <>
      {!isReady ? (
        <SplashScreen onFinish={() => setTimerFinished(true)} />
      ) : (
        <AppNavigator />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <RootApp />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
