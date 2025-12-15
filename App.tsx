import "react-native-gesture-handler";
import React, { useState } from "react";
import "./src/i18n/config";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import AppNavigator from "./src/navigation/index";
import SplashScreen from "./src/screens/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <AppNavigator />
      )}
    </ThemeProvider>
  );
}
