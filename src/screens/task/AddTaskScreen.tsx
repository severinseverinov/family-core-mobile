import React from "react";
import { SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
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
