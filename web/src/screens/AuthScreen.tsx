import { useState } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { User, Lock, Mail, ArrowRight, Loader, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
    onAuthSuccess: (token: string, username: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                // Login Flow (OAuth2 Form Data)
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', password);
                
                const response = await axios.post('http://localhost:8000/token', formData);
                const { access_token, username: user_name } = response.data;
                onAuthSuccess(access_token, user_name);
            } else {
                // Signup Flow (JSON)
                const response = await axios.post('http://localhost:8000/signup', {
                    username,
                    email,
                    password
                });
                const { access_token, username: user_name } = response.data;
                onAuthSuccess(access_token, user_name);
            }
        } catch (err: any) {
            console.error(err);
            if (err.response) {
                 setError(err.response.data.detail || 'Authentication failed');
            } else {
                 setError('Network error. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050a08] relative overflow-hidden">
             {/* Liquid Background */}
            <div className="liquid-bg pointer-events-none opacity-50" />
            
            <div className="w-full max-w-md p-8 m-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Join MindEase'}
                    </h1>
                    <p className="text-white/50 text-sm">
                        {isLogin ? 'Your supportive AI friend is waiting.' : 'Start your journey to better mental wellness.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all"
                                required
                            />
                        </div>

                        {!isLogin && (
                            <div className="relative group">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors" />
                                <input 
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all"
                                    required
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors" />
                            <input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-white/40 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className={clsx(
                            "w-full bg-primary text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6",
                            isLoading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm">
                    <p className="text-white/40">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button 
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-primary hover:text-green-300 font-medium ml-1 transition-colors"
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

