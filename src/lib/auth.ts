import { cookies } from 'next/headers'

const AUTH_COOKIE_NAME = 'shiphero_auth'
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function verifyPassword(password: string): Promise<boolean> {
  const appPassword = process.env.APP_PASSWORD
  if (!appPassword) {
    console.warn('APP_PASSWORD not set - authentication disabled')
    return true
  }
  return password === appPassword
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  // If no password is set, allow access
  if (!process.env.APP_PASSWORD) {
    return true
  }
  
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME)
  return authCookie?.value === 'authenticated'
}
