"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        if (authData.isAuthenticated && authData.user) {
          // Use setTimeout to avoid synchronous setState in effect
          setTimeout(() => {
          setIsAuthenticated(true);
          setUser(authData.user);
          }, 0);
        }
      } catch (error) {
        console.error("Error parsing stored auth data:", error);
        localStorage.removeItem("auth");
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // TODO: Replace with actual API call to your authentication service
    // For now, this is a simple client-side check
    // In production, you would make an API call to your backend

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // For demo purposes, accept any non-empty email and password
    // In production, validate credentials against your backend
    if (email.trim() && password.trim()) {
      const authData = {
        isAuthenticated: true,
        user: { email: email.trim() },
      };

      setIsAuthenticated(true);
      setUser(authData.user);

      // Store in localStorage (in production, use httpOnly cookies or secure tokens)
      localStorage.setItem("auth", JSON.stringify(authData));

      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
