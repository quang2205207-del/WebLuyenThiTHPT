import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, userApi } from './api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'exam-auth-token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const saveSession = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
    setSessionError('');
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSessionError('');
  }, []);

  const loadSession = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setUser(null);
      setSessionError('');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.me(token);
      setUser(data.user);
      setSessionError('');
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearSession();
      } else {
        setSessionError('Không thể xác thực phiên đăng nhập. Hãy kiểm tra kết nối và thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, clearSession]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (credentials) => {
      const { data } = await authApi.login(credentials);
      saveSession(data);
      return data.user;
    },
    [saveSession],
  );

  const register = useCallback(
    async (details) => {
      const { data } = await authApi.register(details);
      saveSession(data);
      return data.user;
    },
    [saveSession],
  );

  const acceptResetSession = useCallback((session) => saveSession(session), [saveSession]);

  const updateProfile = useCallback(
    async (details) => {
      const { data } = await userApi.updateProfile(token, details);
      setUser(data.user);
      return data.user;
    },
    [token],
  );

  const changePassword = useCallback(
    async (details) => {
      const { data } = await userApi.changePassword(token, details);
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
    },
    [token],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      sessionError,
      refreshSession: loadSession,
      login,
      register,
      logout: clearSession,
      updateProfile,
      changePassword,
      acceptResetSession,
    }),
    [user, token, loading, sessionError, loadSession, login, register, clearSession, updateProfile, changePassword, acceptResetSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  return context;
}
