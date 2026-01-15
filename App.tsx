// App.tsx

import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AppNavigator from "./src/navigation/index";
import SplashScreen from "./src/screens/SplashScreen";

const queryClient = new QueryClient();

// Alt bileşen oluşturuyoruz çünkü useAuth() kullanabilmek için AuthProvider içinde olmalıyız
function RootApp() {
  const { loading: authLoading } = useAuth();
  const [timerFinished, setTimerFinished] = useState(false);

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
