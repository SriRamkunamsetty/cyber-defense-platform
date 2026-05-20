import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  auth,
  signInWithGoogle as fbSignInGoogle,
  signInWithEmail as fbSignInEmail,
  registerWithEmail as fbRegisterEmail,
  signOut as fbSignOut,
  onAuthChange,
  type FirebaseUser,
} from "../lib/firebase";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(fbUser: FirebaseUser): AuthUser {
  const provider =
    fbUser.providerData[0]?.providerId === "google.com" ? "google" : "email";
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    provider,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        setUser(mapUser(fbUser));
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await fbSignInGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        setLoading(true);
        await fbSignInEmail(email, password);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Email sign-in failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        setLoading(true);
        await fbRegisterEmail(email, password);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Registration failed"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await fbSignOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-out failed");
    }
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  }, [firebaseUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        signOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export type { AuthUser, AuthContextValue };
