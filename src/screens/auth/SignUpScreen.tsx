import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../../navigation/types";
import {
  signUpWithEmail,
  signInWithGoogle,
  signInWithApple,
} from "../../services/auth";
import { Platform } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeSelector from "../../components/ThemeSelector";
import { z } from "zod";

type SignUpScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SignUp"
>;

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

export default function SignUpScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { colors, themeMode } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const styles = useMemo(
    () => createStyles(colors, themeMode),
    [colors, themeMode]
  );

  const handleSignUp = async () => {
    console.log("SignUp button pressed", { email, password, fullName });

    // Basic validation
    if (!email || !password || !fullName) {
      console.log("Validation failed: empty fields");
      Alert.alert(t("Common.error"), t("Common.fillAllFields"));
      return;
    }

    const validation = signUpSchema.safeParse({ email, password, fullName });

    if (!validation.success) {
      console.log("Validation failed:", validation.error.issues);
      const firstError = validation.error.issues[0];
      let errorMessage = firstError.message;

      // User-friendly error messages
      if (firstError.path[0] === "email") {
        errorMessage =
          t("Common.errorInvalidEmail") || "Please enter a valid email address";
      } else if (firstError.path[0] === "password") {
        errorMessage =
          t("Common.passwordMinLength") ||
          "Password must be at least 8 characters";
      } else if (firstError.path[0] === "fullName") {
        errorMessage =
          t("Common.fullNameMinLength") ||
          "Full name must be at least 2 characters";
      }

      Alert.alert(t("Common.error"), errorMessage);
      return;
    }

    console.log("Starting sign up...");
    setLoading(true);
    try {
      const result = await signUpWithEmail({
        email,
        password,
        fullName,
      });

      console.log("Sign up result:", result);

      if (result.error) {
        Alert.alert(t("Common.error"), result.error);
      } else {
        Alert.alert(
          t("Common.success"),
          t("Common.signUpSuccess") || "Sign up successful!",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Login"),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      Alert.alert(
        t("Common.error"),
        error?.message || "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);

    if (result.error) {
      Alert.alert(t("Common.error"), result.error);
    }
  };

  const handleAppleSignUp = async () => {
    setLoading(true);
    const result = await signInWithApple();
    setLoading(false);

    if (result.error) {
      Alert.alert(t("Common.error"), result.error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.themeButton}
        onPress={() => setThemeModalVisible(true)}
      >
        <Text style={styles.themeButtonText}>
          {themeMode === "light" ? "☀️" : themeMode === "dark" ? "🌙" : "🎨"}
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t("Common.signUp") || "Sign Up"}</Text>

        <TextInput
          style={styles.input}
          placeholder={t("Common.fullName") || "Full Name"}
          placeholderTextColor={colors.inputPlaceholder}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder={t("Common.email") || "Email"}
          placeholderTextColor={colors.inputPlaceholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder={t("Common.password") || "Password"}
          placeholderTextColor={colors.inputPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        {/* Google Sign Up */}
        <TouchableOpacity
          style={[
            styles.socialButton,
            styles.googleButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleGoogleSignUp}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.socialButtonText}>🔵 {t("Login.googleBtn")}</Text>
        </TouchableOpacity>

        {/* Apple Sign Up (iOS only) */}
        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={[
              styles.socialButton,
              styles.appleButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleAppleSignUp}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>
              ⚫ {t("Login.appleBtn")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("Login.or")}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email/Password Sign Up */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => {
            console.log("Button pressed!");
            handleSignUp();
          }}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>
              {t("Common.signUp") || "Sign Up"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>
            {t("Common.alreadyHaveAccount") || "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </View>

      <ThemeSelector
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </View>
  );
}

const createStyles = (colors: any, themeMode: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    themeButton: {
      position: "absolute",
      top: 50,
      right: 20,
      zIndex: 1000,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      ...(themeMode === "colorful" && {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      }),
    },
    themeButtonText: {
      fontSize: 20,
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 10,
      flexGrow: 0,
    },
    title: {
      fontSize: themeMode === "colorful" ? 36 : 32,
      fontWeight: "bold",
      marginBottom: 30,
      textAlign: "center",
      color: colors.text,
      ...(themeMode === "colorful" && {
        textShadowColor: colors.primaryLight,
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
      }),
    },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: themeMode === "colorful" ? 12 : 8,
      padding: 15,
      marginBottom: 15,
      fontSize: 16,
      backgroundColor: colors.inputBackground,
      color: colors.inputText,
    },
    buttonContainer: {
      padding: 20,
      paddingTop: 15,
      backgroundColor: colors.background,
      borderTopWidth: themeMode === "light" ? 1 : 0,
      borderTopColor: colors.divider,
    },
    socialButton: {
      borderRadius: themeMode === "colorful" ? 12 : 8,
      padding: 14,
      alignItems: "center",
      marginBottom: 12,
      borderWidth: 1,
    },
    googleButton: {
      backgroundColor: "#FFFFFF",
      borderColor: "#DDDDDD",
    },
    appleButton: {
      backgroundColor: "#000000",
      borderColor: "#000000",
    },
    socialButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#333333",
    },
    appleButtonText: {
      color: "#FFFFFF",
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 12,
      fontSize: 14,
      color: colors.textMuted,
    },
    button: {
      backgroundColor: colors.button,
      borderRadius: themeMode === "colorful" ? 16 : 8,
      padding: 16,
      alignItems: "center",
      marginBottom: 10,
      ...(themeMode === "colorful" && {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }),
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: "600",
    },
    linkButton: {
      marginTop: 10,
      alignItems: "center",
    },
    linkText: {
      color: colors.link,
      fontSize: 14,
      fontWeight: "500",
    },
  });
