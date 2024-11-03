'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (email === '123@456.com' && password === '123456') {
      localStorage.setItem('isLoggedIn', 'true');
      router.push('/dashboard');
    } else {
      setError('Invalid email or password. Please use 123@456.com / 123456');
    }
    setIsLoading(false);
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
                placeholder="123@456.com"
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