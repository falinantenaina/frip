import { create } from 'zustand';
import api from '../utils/api';

const useBalleStore = create((set, get) => ({
  balles: [],
  currentBalle: null,
  loading: false,
  error: null,

  fetchBalles: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/balles${params ? `?${params}` : ''}`);
      set({ balles: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de chargement';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  fetchBalle: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/balles/${id}`);
      set({ currentBalle: response.data.data, loading: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de chargement';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  createBalle: async (balleData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/balles', balleData);
      const newBalle = response.data.data;
      set((state) => ({
        balles: [newBalle, ...state.balles],
        loading: false,
      }));
      return { success: true, data: newBalle };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de création';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  updateBalle: async (id, balleData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/balles/${id}`, balleData);
      const updatedBalle = response.data.data;
      set((state) => ({
        balles: state.balles.map((b) => (b._id === id ? updatedBalle : b)),
        currentBalle: state.currentBalle?._id === id ? updatedBalle : state.currentBalle,
        loading: false,
      }));
      return { success: true, data: updatedBalle };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de mise à jour';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  deleteBalle: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/balles/${id}`);
      set((state) => ({
        balles: state.balles.filter((b) => b._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de suppression';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  recalculateStats: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/balles/${id}/recalculate`);
      const updatedBalle = response.data.data;
      set((state) => ({
        balles: state.balles.map((b) => (b._id === id ? updatedBalle : b)),
        currentBalle: state.currentBalle?._id === id ? updatedBalle : state.currentBalle,
        loading: false,
      }));
      return { success: true, data: updatedBalle };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de recalcul';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  clearError: () => set({ error: null }),
}));

export default useBalleStore;
