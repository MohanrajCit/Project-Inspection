import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, ROLE_DASHBOARD_ROUTES } from '@/types/database.types';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, registrationCode: string) => Promise<{ error: Error | null; validationResult?: string }>;
  signOut: () => Promise<void>;
  getDashboardRoute: () => string;
  checkSystemInitialized: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (roleData) {
        setRole(roleData.role as AppRole);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, registrationCode: string) => {
    // First validate the registration code on the backend
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_registration_code', { _registration_code: registrationCode });
    
    if (validationError) {
      return { error: validationError as Error, validationResult: undefined };
    }
    
    // Check validation result
    if (validationResult === 'invalid_bootstrap_exists') {
      return { 
        error: new Error('System is already initialized. Please contact the Quality Head for access.'), 
        validationResult 
      };
    }
    
    if (validationResult === 'system_not_initialized') {
      return { 
        error: new Error('System not initialized. Please contact your administrator for the bootstrap code.'), 
        validationResult 
      };
    }
    
    if (validationResult === 'invalid_code') {
      return { 
        error: new Error('Invalid registration code. Please contact your administrator.'), 
        validationResult 
      };
    }
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          registration_code: registrationCode,
        },
      },
    });
    
    if (error) {
      return { error: error as Error, validationResult };
    }
    
    // If signup successful, assign role based on registration code
    if (authData.user) {
      const { error: roleError } = await supabase
        .rpc('assign_role_after_registration', { 
          _user_id: authData.user.id, 
          _registration_code: registrationCode 
        });
      
      if (roleError) {
        console.error('Error assigning role:', roleError);
      }
    }
    
    return { error: null, validationResult };
  };

  const checkSystemInitialized = async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('quality_head_exists');
    if (error) {
      console.error('Error checking system initialization:', error);
      return false;
    }
    return data as boolean;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const getDashboardRoute = () => {
    if (!role) return '/auth';
    return ROLE_DASHBOARD_ROUTES[role];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        signOut,
        getDashboardRoute,
        checkSystemInitialized,
      }}
    >
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
