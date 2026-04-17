import { useState } from 'react';
import axios from 'axios';
import { Bot, User, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface Props {
  onAuthSuccess: (token: string, username: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || (!isLogin && !email) || !username) return;

    setLoading(true);
    setError(null);
    try {
      const BASE_URL = 'http://100.30.177.1:8000'; // Make sure this matches your backend
      let response;

      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        response = await axios.post(`${BASE_URL}/token`, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } else {
        response = await axios.post(`${BASE_URL}/signup`, {
            username,
            email,
            password
        });
      }

      const { access_token, username: user } = response.data;
      onAuthSuccess(access_token, user);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-background selection:bg-primary selection:text-white p-6 relative overflow-hidden font-sans">
      
      {/* Liquid Background */}
      <div className="liquid-bg pointer-events-none" />

      {/* Glass Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up md:p-10">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8 space-y-2 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(129,140,248,0.2)] mb-4">
                <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-light tracking-tight text-white/90">
                {isLogin ? 'Welcome Back' : 'Join Us'}
            </h2>
            <p className="text-sm text-slate-400">
                {isLogin ? 'Sign in to continue finding your calm' : 'Start your journey to inner peace'}
            </p>
        </div>

        {/* Error Message */}
        {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-lg flex items-center mb-6">
                <span>{error}</span>
            </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wilder ml-1">Username</label>
                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-light"
                        placeholder="Enter your username"
                        required
                    />
                </div>
            </div>

            {!isLogin && (
                <div className="space-y-1 animate-fade-in-down">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wilder ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-light"
                            placeholder="hello@example.com"
                            required
                        />
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wilder ml-1">Password</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-light"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 mt-6 rounded-xl font-medium text-white shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02] active:scale-95 flex justify-center items-center ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-accent hover:to-primary'}`}
            >
                {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                )}
            </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 text-center">
            <button 
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="text-slate-400 text-sm hover:text-white transition-colors"
            >
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span className="text-primary font-medium hover:underline">{isLogin ? 'Sign Up' : 'Log In'}</span>
            </button>
        </div>

      </div>
    </div>
  );
}
