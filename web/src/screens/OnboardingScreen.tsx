import { ArrowRight, MessageSquare } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export default function OnboardingScreen({ onStart }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      {/* Background Gradients/Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="z-10 flex flex-col items-center max-w-md w-full text-center space-y-8">
        {/* Logo / Title */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            MindEase
          </h1>
          <p className="text-xl text-textSecondary">
            Your AI Mental Health Friend
          </p>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="group relative flex items-center justify-between w-full p-4 bg-surface backdrop-blur-md border border-surfaceBorder rounded-2xl hover:bg-white/10 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-semibold text-white">Let's Begin</span>
              <span className="block text-sm text-textSecondary">Start a new conversation</span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-textSecondary group-hover:text-primary transition-colors" />
        </button>

        {/* Recent Chats Placeholder */}
        <div className="w-full">
           <div className="flex items-center gap-2 mb-4">
             <div className="h-px flex-1 bg-surfaceBorder" />
             <span className="text-sm text-textSecondary uppercase tracking-wider">Recent Chats</span>
             <div className="h-px flex-1 bg-surfaceBorder" />
           </div>
           
           <div className="w-full p-4 bg-surface backdrop-blur-md border border-surfaceBorder rounded-xl flex items-center justify-center h-24 text-textSecondary/50 text-sm">
             No recent conversations
           </div>
        </div>
      </div>
    </div>
  );
}
