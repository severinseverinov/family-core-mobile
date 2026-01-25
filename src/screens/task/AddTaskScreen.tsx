import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddTaskModal from "../../components/modals/AddTaskModal";

export default function AddTaskScreen({ navigation }: any) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <AddTaskModal visible onClose={() => navigation.goBack()} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
