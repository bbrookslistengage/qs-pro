import { create } from 'zustand'

export interface User {
  id: string
  sfUserId: string
  email: string | null
  name: string | null
}

export interface Tenant {
  id: string
  eid: string
  tssd: string
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  setAuth: (user: User, tenant: Tenant) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  setAuth: (user, tenant) => set({ user, tenant, isAuthenticated: true }),
  logout: () => set({ user: null, tenant: null, isAuthenticated: false }),
}))
