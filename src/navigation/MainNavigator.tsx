import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  PawPrint,
  CheckSquare,
  ShoppingCart,
  Lock,
} from "lucide-react-native";
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import PetScreen from "../screens/pets/PetScreen";
import TaskScreen from "../screens/task/TaskScreen";
import KitchenScreen from "../screens/kitchen/KitchenScreen";
import VaultScreen from "../screens/dashboard/VaultScreen";

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // TÜM EKRANLARDAKİ ÜST ÇUBUĞU KALDIRDIK
        tabBarActiveTintColor: "#6366f1",
        tabBarStyle: { borderTopWidth: 0, elevation: 10 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color }) => <Home color={color} /> }}
      />
      <Tab.Screen
        name="Görevler"
        component={TaskScreen}
        options={{ tabBarIcon: ({ color }) => <CheckSquare color={color} /> }}
      />
      <Tab.Screen
        name="Evcil Hayvan"
        component={PetScreen}
        options={{ tabBarIcon: ({ color }) => <PawPrint color={color} /> }}
      />
      <Tab.Screen
        name="Mutfak"
        component={KitchenScreen}
        options={{ tabBarIcon: ({ color }) => <ShoppingCart color={color} /> }}
      />
      <Tab.Screen
        name="Kasa"
        component={VaultScreen}
        options={{ tabBarIcon: ({ color }) => <Lock color={color} /> }}
      />
    </Tab.Navigator>
  );
}
