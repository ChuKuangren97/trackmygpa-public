import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSession = async (session) => {
    if (session) {
      // Check if profile exists
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
        
      if (!profile) {
        // Create profile if missing
        const meta = session.user.user_metadata || {};
        const { data: newProfile } = await supabase.from('profiles').insert([{
          id: session.user.id,
          full_name: meta.name || session.user.email.split('@')[0],
          university: meta.university || '',
          department: meta.department || ''
        }]).select().single();
        
        setUser({ 
          id: session.user.id,
          email: session.user.email, 
          name: newProfile?.full_name || meta.name || session.user.email.split('@')[0] 
        });
      } else {
        setUser({ 
          id: session.user.id,
          email: session.user.email, 
          name: profile.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0] 
        });
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) handleSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Avoid duplicate trigger on initial mount if possible, but safe to re-run
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // listener will fetch profile and update state
    return data;
  };

  const signup = async (name, email, password, university, department, inviteCode) => {
    // 1. Verify invite code before proceeding
    const { data: isValid, error: checkError } = await supabase.rpc('check_invite_code', { input_code: inviteCode });
    if (checkError) throw checkError;
    if (!isValid) throw new Error("Invalid or already used invite code.");

    // 2. Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, university, department }
      }
    });
    
    if (error) throw error;
    
    // Explicitly insert into profiles immediately after signup
    if (data?.user) {
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: data.user.id,
        full_name: name,
        university,
        department
      }]);
      if (profileError) console.error("Error creating profile:", profileError);

      // 4. Redeem (burn) the invite code and associate heavily protected code with new UID
      const { error: redeemError } = await supabase.rpc('redeem_invite_code', { input_code: inviteCode });
      if (redeemError) console.error("Error redeeming invite code:", redeemError);
    }
    
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
