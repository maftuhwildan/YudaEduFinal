import React, { useState, useRef } from 'react';
import { SessionUser } from '@/types';
import { login } from '@/app/actions/auth';
import { Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { LoginSlider } from './LoginSlider';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginProps {
  onLogin: (user: SessionUser) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return; // guard against double-click before React re-renders
    submittingRef.current = true;
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const result = await login(formData);
      if (result?.success && result.user) {
        onLogin(result.user as any);
      } else {
        setError(result?.error || 'Login gagal. Coba lagi nanti.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="grid h-[100dvh] overflow-hidden lg:grid-cols-2">
      {/* Left Column - Login Form */}
      <div className="flex flex-col p-4 md:p-10">
        {/* Desktop logo - top left */}
        <div className="hidden md:flex justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-8 w-8 items-center justify-center">
              <img src="/logo.png" alt="YudaEdu Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-semibold">YudaEdu</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-xs">
            <form onSubmit={handleSubmit} className={cn("flex flex-col gap-5")}>
              <div className="flex flex-col items-center gap-2 text-center">
                {/* Mobile-only logo above Sign In */}
                <a href="#" className="flex md:hidden flex-col items-center gap-1.5 mb-11">
                  <div className="flex h-14 w-14 items-center justify-center">
                    <img src="/logo.png" alt="YudaEdu Logo" className="h-full w-full object-contain" />
                  </div>
                  <span className="font-bold text-base tracking-tight">YudaEdu</span>
                </a>
                <h1 className="text-2xl font-bold">Sign In</h1>
                <p className="text-balance text-sm text-muted-foreground">
                  Your Ultimate Digital Assessment
                </p>
              </div>


              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-center">{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username / ID</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      placeholder="Enter Student ID"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Verifying...' : 'Sign In'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Column - Slider */}
      <LoginSlider />
    </div>
  );
};