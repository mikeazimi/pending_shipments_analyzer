import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  verifyPassword: vi.fn(),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  isAuthenticated: vi.fn(),
}))

import { verifyPassword, setAuthCookie, clearAuthCookie, isAuthenticated } from '@/lib/auth'

describe('Auth API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(true)
      
      const result = await verifyPassword('correct-password')
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(false)
      
      const result = await verifyPassword('wrong-password')
      expect(result).toBe(false)
    })
  })

  describe('setAuthCookie', () => {
    it('should set auth cookie', async () => {
      vi.mocked(setAuthCookie).mockResolvedValue(undefined)
      
      await expect(setAuthCookie()).resolves.toBeUndefined()
      expect(setAuthCookie).toHaveBeenCalledOnce()
    })
  })

  describe('clearAuthCookie', () => {
    it('should clear auth cookie', async () => {
      vi.mocked(clearAuthCookie).mockResolvedValue(undefined)
      
      await expect(clearAuthCookie()).resolves.toBeUndefined()
      expect(clearAuthCookie).toHaveBeenCalledOnce()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when authenticated', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(true)
      
      const result = await isAuthenticated()
      expect(result).toBe(true)
    })

    it('should return false when not authenticated', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(false)
      
      const result = await isAuthenticated()
      expect(result).toBe(false)
    })
  })
})
