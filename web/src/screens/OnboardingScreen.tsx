import { ArrowRight, MessageSquare, Bot } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export default function OnboardingScreen({ onStart }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden font-sans">
      {/* Liquid Background */}
      <div className="liquid-bg pointer-events-none" />

      <div className="z-10 flex flex-col items-center max-w-md w-full text-center space-y-12 animate-fade-in-up">
        {/* Logo / Title */}
        <div className="space-y-6 flex flex-col items-center">
            <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(74,222,128,0.2)] backdrop-blur-xl">
                        <Bot className="w-12 h-12 text-primary drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#050a08] flex items-center justify-center z-10">
                    <span className="w-4 h-4 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#4ade80]" />
                </div>
            </div>

            <div className="space-y-2">
                <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                    MindEase
                </h1>
                <p className="text-xl text-white/60 font-light tracking-wide">
                    Your Personal AI Mental Health Ally
                </p>
            </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="group relative flex items-center justify-between w-full p-1 rounded-2xl bg-gradient-to-r from-primary/50 to-emerald-600/50 hover:bg-white/20 transition-all duration-500 shadow-[0_0_20px_rgba(74,222,128,0.15)] hover:shadow-[0_0_40px_rgba(74,222,128,0.3)] hover:-translate-y-1"
        >
            <div className="flex items-center justify-between w-full bg-[#050a08] bg-opacity-90 hover:bg-opacity-80 p-5 rounded-[14px] backdrop-blur-md transition-all border border-white/10 group-hover:border-primary/50">
                <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <MessageSquare className="w-6 h-6 text-black fill-black/10" />
                    </div>
                    <div className="text-left">
                        <span className="block text-xl font-bold text-white group-hover:text-primary transition-colors">Let's Begin</span>
                        <span className="block text-sm text-white/40 group-hover:text-white/70 transition-colors">Start a new conversation</span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </div>
            </div>
        </button>

        {/* Info */}
        <div className="w-full text-center">
            <p className="text-[10px] text-white/20 font-bold tracking-[0.2em] uppercase">Private • Secure • Always Available</p>
        </div>
      </div>
    </div>
  );
}
