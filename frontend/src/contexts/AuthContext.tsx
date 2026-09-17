import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authService from "../services/authService";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateLocalUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("documind_token");
    const storedUser = localStorage.getItem("documind_user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("documind_user");
      }
    }
    setLoading(false);
  }, []);

  function persist(token: string, user: User) {
    localStorage.setItem("documind_token", token);
    localStorage.setItem("documind_user", JSON.stringify(user));
    setUser(user);
  }

  async function login(email: string, password: string) {
    const res = await authService.login(email, password);
    persist(res.access_token, res.user);
  }

  async function loginWithGoogle(credential: string) {
    const res = await authService.loginWithGoogle(credential);
    persist(res.access_token, res.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await authService.register(name, email, password);
    persist(res.access_token, res.user);
  }

  function logout() {
    localStorage.removeItem("documind_token");
    localStorage.removeItem("documind_user");
    setUser(null);
    window.location.href = "/login";
  }

  function updateLocalUser(updated: User) {
    localStorage.setItem("documind_user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
