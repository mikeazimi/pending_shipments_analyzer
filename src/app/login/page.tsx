'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package } from 'lucide-react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7fa] p-4">
      <Card className="w-full max-w-md bg-white border-[#e2e8f0] shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-14 h-14 bg-[#ef5252] rounded-xl flex items-center justify-center">
            <Package className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-[#000000]">Pack to Light Analyzer</CardTitle>
          <CardDescription className="text-[#6b7a8c]">
            Enter the team password to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#263444]">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-white border-[#e2e8f0] text-[#000000] placeholder:text-[#c0ccdb] focus:border-[#3281fd] focus:ring-[#3281fd]/20"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[#ef5252] bg-[#ef5252]/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3281fd] hover:bg-[#2570e8] text-white font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
