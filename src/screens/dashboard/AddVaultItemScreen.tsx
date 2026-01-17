import React from "react";
import { SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import AddVaultItemModal from "../../components/modals/AddVaultItemModal";

export default function AddVaultItemScreen({ navigation }: any) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <AddVaultItemModal
          visible
          onClose={() => navigation.goBack()}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
