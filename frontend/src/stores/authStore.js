import { create } from 'zustand';
import api from '../utils/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  login: async (email, motDePasse) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, motDePasse });
      const { data, token } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data));
      set({ user: data, token, isAuthenticated: true, loading: false, error: null });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur de connexion';
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },
  logout: () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },
  clearError: () => set({ error: null }),
}));
export default useAuthStore;
