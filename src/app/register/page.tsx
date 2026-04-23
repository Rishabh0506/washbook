'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WashingMachine, AlertCircle, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const sanitizedEmail = email.trim()
    const sanitizedCollegeId = collegeId.trim().toUpperCase()

    // Regex check for U202XXXXX (U20 followed by any digit 2-9 and 5 digits according to PRD)
    // Relaxed slightly to just match U20XXXXXX format or similar based on PRD requirements
    const collegeIdRegex = /^U20[2-9]\d{5}$/
    if (!collegeIdRegex.test(sanitizedCollegeId)) {
      setError('Invalid College ID format. Should be like U20240078.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        data: {
          college_id: sanitizedCollegeId,
          name: fullName.trim(),
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf7f2] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
         <div className="flex justify-center">
          <div className="rounded-full bg-teal-50 p-3">
            <WashingMachine className="h-10 w-10 text-teal-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleRegister}>
            
            {error && (
              <div className="bg-red-50 p-4 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors"
                  placeholder="e.g. u20240078@email.edu"
                />
              </div>
            </div>

            <div>
              <label htmlFor="collegeId" className="block text-sm font-medium text-slate-700">
                College ID
              </label>
              <div className="mt-1">
                <input
                  id="collegeId"
                  name="collegeId"
                  type="text"
                  required
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors uppercase"
                  placeholder="U20240078"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors"
                  placeholder="Rohan Sharma"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password (min 8 chars)
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#65b27b] to-[#2e9e9e] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
