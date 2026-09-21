import { createContext, useContext, useMemo } from 'react';
import users from '../data/users.json';
import { useLocalStorage } from '../hooks/useLocalStorage';

const AuthContext = createContext(null);
export const DUMMY_OTP = '1234';

export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage('ff_user', null);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    findUserByPhone: (phone) => users.find((u) => u.phone === phone) || null,
    login: (phone) => {
      const u = users.find((x) => x.phone === phone);
      if (u) setUser(u);
      return u;
    },
    logout: () => setUser(null),
  }), [user, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
