import { create } from 'zustand';
import api from '../utils/api';

const useVenteStore = create((set, get) => ({
  ventes: [],
  currentVente: null,
  loading: false,
  error: null,

  fetchVentes: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/ventes${params ? `?${params}` : ''}`);
      set({ ventes: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de chargement';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  fetchVente: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/ventes/${id}`);
      set({ currentVente: response.data.data, loading: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de chargement';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  createVente: async (venteData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/ventes', venteData);
      const newVente = response.data.data;
      set((state) => ({
        ventes: [newVente, ...state.ventes],
        loading: false,
      }));
      return { success: true, data: newVente };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de création';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  updateVente: async (id, venteData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/ventes/${id}`, venteData);
      const updatedVente = response.data.data;
      set((state) => ({
        ventes: state.ventes.map((v) => (v._id === id ? updatedVente : v)),
        currentVente: state.currentVente?._id === id ? updatedVente : state.currentVente,
        loading: false,
      }));
      return { success: true, data: updatedVente };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de mise à jour';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  annulerVente: async (id, raisonAnnulation) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/ventes/${id}/annuler`, { raisonAnnulation });
      const updatedVente = response.data.data;
      set((state) => ({
        ventes: state.ventes.map((v) => (v._id === id ? updatedVente : v)),
        loading: false,
      }));
      return { success: true, data: updatedVente };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur d\'annulation';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  deleteVente: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/ventes/${id}`);
      set((state) => ({
        ventes: state.ventes.filter((v) => v._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de suppression';
      set({ loading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  clearError: () => set({ error: null }),
}));

export default useVenteStore;
