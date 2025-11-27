'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, User } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  login: (name: string) => Promise<void>;
  register: (name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      loadUser(storedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error loading user:', error);
      localStorage.removeItem('userId');
    } finally {
      setLoading(false);
    }
  };

  const login = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        throw new Error('User not found. Please register first.');
      }

      setUser(data);
      localStorage.setItem('userId', data.id);
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string) => {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('name', name)
        .single();

      if (existingUser) {
        throw new Error('Username already exists. Please login instead.');
      }

      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert([{ name, is_admin: false }])
        .select()
        .single();

      if (error) throw error;

      setUser(data);
      localStorage.setItem('userId', data.id);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userId');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
