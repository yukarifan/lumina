'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '../components/LoadingSpinner';

type UserRole = 'student' | 'instructor';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // For demo purposes, using hardcoded credentials
      const validCredentials = {
        student: { email: 'student@example.com', password: '123456' },
        instructor: { email: 'instructor@example.com', password: '123456' }
      };

      const credentials = validCredentials[role];
      
      if (email === credentials.email && password === credentials.password) {
        // Store user data in localStorage
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userRole', role);
        localStorage.setItem('isLoggedIn', 'true');
        
        // Navigate to dashboard
        router.push('/dashboard');
      } else {
        setError(`Invalid credentials. Use ${credentials.email} / 123456`);
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        {/* Logo/Header */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900">Lumina</h2>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`p-4 rounded-lg border-2 transition-all ${
                role === 'student'
                  ? 'border-[rgb(37,187,187)] bg-[rgb(37,187,187,0.1)]'
                  : 'border-gray-200 hover:border-[rgb(37,187,187)]'
              }`}
            >
              <div className="text-lg font-medium">Student</div>
              <div className="text-sm text-gray-500">Access your courses</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('instructor')}
              className={`p-4 rounded-lg border-2 transition-all ${
                role === 'instructor'
                  ? 'border-[rgb(37,187,187)] bg-[rgb(37,187,187,0.1)]'
                  : 'border-gray-200 hover:border-[rgb(37,187,187)]'
              }`}
            >
              <div className="text-lg font-medium">Instructor</div>
              <div className="text-sm text-gray-500">Manage your classes</div>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgb(37,187,187)] focus:border-[rgb(37,187,187)]"
                placeholder={role === 'student' ? 'student@example.com' : 'instructor@example.com'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgb(37,187,187)] focus:border-[rgb(37,187,187)]"
                placeholder="123456"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[rgb(37,187,187)] hover:bg-[rgb(33,168,168)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(37,187,187)] disabled:opacity-50"
          >
            {isLoading ? <LoadingSpinner /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
} 