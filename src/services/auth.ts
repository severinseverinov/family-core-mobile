import { supabase } from "./supabase";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export async function signInWithEmail(data: SignInData) {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { data: authData, error: null };
}

export async function signUpWithEmail(data: SignUpData) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { data: authData, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

export async function signInWithGoogle() {
  try {
    const redirectTo = AuthSession.makeRedirectUri({
      scheme: "familycore",
      path: "auth/callback",
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data.url) {
      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (result.type === "success" && result.url) {
        // Parse the callback URL to extract tokens
        const url = result.url;

        // Check if URL contains hash fragment (Supabase uses hash fragments)
        if (url.includes("#")) {
          const hashParams = new URLSearchParams(url.split("#")[1]);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              return { error: sessionError.message };
            }

            return { data: sessionData, error: null };
          }
        }

        // Try query params as fallback
        const urlObj = new URL(url);
        const accessToken = urlObj.searchParams.get("access_token");
        const refreshToken = urlObj.searchParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            return { error: sessionError.message };
          }

          return { data: sessionData, error: null };
        }
      } else if (result.type === "cancel") {
        return { error: "Authentication was cancelled" };
      }

      return { error: "Authentication failed" };
    }    return { error: "Failed to initiate Google sign in" };
  } catch (error: any) {
    return {
      error: error?.message || "An error occurred during Google sign in",
    };
  }
}

export async function signInWithApple() {
  try {
    if (Platform.OS !== "ios") {
      return { error: "Apple Sign In is only available on iOS" };
    }    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return { error: "Apple Sign In is not available on this device" };
    }    // Request Apple Authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });    if (!credential.identityToken) {
      return { error: "Apple Sign In failed - no identity token" };
    }

    // Sign in with Supabase using the identity token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });    if (error) {
      return { error: error.message };
    }    // Update user metadata if full name is available
    if (credential.fullName) {
      const fullName = `${credential.fullName.givenName || ""} ${
        credential.fullName.familyName || ""
      }`.trim();
      if (fullName && data.user) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
          },
        });
      }
    }    return { data, error: null };
  } catch (error: any) {
    if (error.code === "ERR_CANCELED") {
      return { error: "Apple Sign In was cancelled" };
    }
    return {
      error: error?.message || "An error occurred during Apple sign in",
    };
  }
}