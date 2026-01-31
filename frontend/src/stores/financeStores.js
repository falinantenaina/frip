import { create } from 'zustand';
import api from '../utils/api';

// Store pour les transactions avec l'investisseur
export const useInvestissementStore = create((set) => ({
  investissements: [],
  versements: [],
  loading: false,
  error: null,

  // Argent reçu de l'investisseur
  fetchInvestissements: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/investissements${params ? `?${params}` : ''}`);
      set({ investissements: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  createInvestissement: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/investissements', data);
      set((state) => ({
        investissements: [response.data.data, ...state.investissements],
        loading: false,
      }));
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, message: error.response?.data?.message };
    }
  },

  updateInvestissement: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/investissements/${id}`, data);
      set((state) => ({
        investissements: state.investissements.map((i) =>
          i._id === id ? response.data.data : i
        ),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  deleteInvestissement: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/investissements/${id}`);
      set((state) => ({
        investissements: state.investissements.filter((i) => i._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  // Argent versé à l'investisseur (remboursement/profit)
  fetchVersements: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/versements${params ? `?${params}` : ''}`);
      set({ versements: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  createVersement: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/versements', data);
      set((state) => ({
        versements: [response.data.data, ...state.versements],
        loading: false,
      }));
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, message: error.response?.data?.message };
    }
  },

  updateVersement: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/versements/${id}`, data);
      set((state) => ({
        versements: state.versements.map((v) =>
          v._id === id ? response.data.data : v
        ),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  deleteVersement: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/versements/${id}`);
      set((state) => ({
        versements: state.versements.filter((v) => v._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  clearError: () => set({ error: null }),
}));

// Store pour les paiements des livreurs
export const useLivreurPaiementStore = create((set) => ({
  paiements: [],
  loading: false,
  error: null,

  fetchPaiements: async (livreurId = null, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const url = livreurId
        ? `/livreurs/${livreurId}/paiements${params ? `?${params}` : ''}`
        : `/paiements-livreurs${params ? `?${params}` : ''}`;
      
      const response = await api.get(url);
      set({ paiements: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  createPaiement: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/paiements-livreurs', data);
      set((state) => ({
        paiements: [response.data.data, ...state.paiements],
        loading: false,
      }));
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, message: error.response?.data?.message };
    }
  },

  updatePaiement: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/paiements-livreurs/${id}`, data);
      set((state) => ({
        paiements: state.paiements.map((p) =>
          p._id === id ? response.data.data : p
        ),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  deletePaiement: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/paiements-livreurs/${id}`);
      set((state) => ({
        paiements: state.paiements.filter((p) => p._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  clearError: () => set({ error: null }),
}));
