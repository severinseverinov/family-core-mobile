import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { supabase } from "../services/supabase";
import { RootStackParamList } from "./types";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import PublicPetProfileScreen from "../screens/public/PetProfileScreen";
import PublicEmergencyCardScreen from "../screens/public/EmergencyCardScreen";

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: false,
          gestureEnabled: false,
          detachInactiveScreens: false,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="PublicPetProfile"
              component={PublicPetProfileScreen}
            />
            <Stack.Screen
              name="PublicEmergencyCard"
              component={PublicEmergencyCardScreen}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
