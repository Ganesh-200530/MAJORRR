import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, LogOut, Bot, Clock, MessageSquare, Plus, Mic, Volume2, Trash2, Activity } from 'lucide-react';
import { THEMES } from '../theme';
import { DashboardModal } from '../components/DashboardModal';

interface Props {
  onBack: () => void;
  token: string;
  userName: string;
}

interface Hospital {
  name: string;
  address: string;
  contact: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isCrisis?: boolean;  isAnxiety?: boolean;  hospitalData?: Hospital[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const API_URL = 'http://localhost:8000'; // Make sure this matches your backend

export default function ChatScreen({ onBack, token, userName }: Props) {
  const defaultMessage: Message = {
    id: '1',
    text: `Hi ${userName}! I'm MindEase. How are you feeling today?`, 
    sender: 'ai' 
  };

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeThemeKey, setActiveThemeKey] = useState<keyof typeof THEMES>('dark');
  const activeTheme = THEMES[activeThemeKey];

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(`chat_history_${userName}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    }
    return [{
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [defaultMessage],
      updatedAt: Date.now()
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Request Location on Mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, []);

  // Save history on change
  useEffect(() => {
    localStorage.setItem(`chat_history_${userName}`, JSON.stringify(sessions));
  }, [sessions, userName]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Basic web push notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleNewConversation = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [defaultMessage],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation(); // Prevent activating the chat when clicking delete
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== idToDelete);
      if (filtered.length === 0) {
        // If we deleted the last one, create a new fresh one
        const newSession = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [defaultMessage],
          updatedAt: Date.now()
        };
        setActiveSessionId(newSession.id);
        return [newSession];
      }
      // If we deleted the active one, switch to the first available
      if (idToDelete === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const currentInput = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      text: currentInput,
      sender: 'user'
    };

    setInput('');
    setIsLoading(true);

    // Update local state immediately
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const isFirstMessage = session.messages.length <= 1;
        return {
          ...session,
          title: isFirstMessage ? currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '') : session.title,
          messages: [...session.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return session;
    }).sort((a, b) => b.updatedAt - a.updatedAt));

    try {
      if (!token) {
        onBack();
        return;
      }

      const response = await axios.post(
        `${API_URL}/chat`, 
        {
          session_id: `web-${userName}-${activeSessionId}`,
          message: userMsg.text,
          latitude: location?.latitude,
          longitude: location?.longitude
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = response.data;
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'ai',
        isCrisis: data.suggest_hospitals,
        isAnxiety: data.anxiety_detected,
        hospitalData: data.hospital_data
      };

      setSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, aiMsg],
            updatedAt: Date.now()
          };
        }
        return session;
      }));

    } catch (error: any) {
      console.error(error);
        if (error.response?.status === 401) {
            onBack();
        }
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please check your connection.",
        sender: 'ai'
      };
      
      setSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, errorMsg],
            updatedAt: Date.now()
          };
        }
        return session;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <DashboardModal 
      isOpen={isDashboardOpen} 
      onClose={() => setIsDashboardOpen(false)} 
      token={token} 
      themeKey={activeThemeKey} 
      setThemeKey={setActiveThemeKey} 
    />
    <div style={{ backgroundColor: activeTheme.backgroundStart, color: activeTheme.text }} className="flex h-screen font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <div style={{ backgroundColor: activeTheme.surface, borderColor: activeTheme.surfaceBorder }} className="w-[300px] border-r flex flex-col justify-between hidden md:flex">
        <div className="flex flex-col h-full">
            {/* History Header */}
            <div className="p-6 pb-2 flex items-center gap-3 text-slate-200">
                <Clock className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold tracking-wide">History</h2>
            </div>

            {/* Dashboard Button */}
            <div className="px-4 py-2 shrink-0">
                <button
                  onClick={() => setIsDashboardOpen(true)}
                  style={{ backgroundColor: activeTheme.surface, borderColor: activeTheme.surfaceBorder, color: activeTheme.onPrimary }}
                  className="w-full hover:brightness-110 border transition-colors font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
                >
                    <Activity className="w-5 h-5 text-blue-400" />
                    Dashboard & Settings
                </button>
            </div>

            {/* Default Chat Session Creation */}
            <div className="px-4 py-4 shrink-0">
                <button 
                  onClick={handleNewConversation}
                  className="w-full bg-[#2ECC71] hover:bg-[#25B962] transition-colors text-black font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(46,204,113,0.39)]"
                >
                    <Plus className="w-5 h-5" />
                    New Conversation
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 px-4 space-y-2 overflow-y-auto mt-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {sessions.map(session => (
                  <div 
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors group ${
                        activeSessionId === session.id 
                          ? 'bg-[#1A1D20] text-gray-200 border-l-[3px] border-[#2ECC71] shadow-md' 
                          : 'hover:bg-[#1A1D20] text-gray-400 border-l-[3px] border-transparent hover:border-white/10'
                      }`}
                  >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium truncate">{session.title}</span>
                      </div>
                      
                      {/* Delete Button (visible on hover) */}
                      <button 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                ))}
            </div>

            {/* User Profile Footer */}
            <div style={{ backgroundColor: activeTheme.surfaceBorder }} className="mt-auto p-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Initials Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[#2ECC71] flex items-center justify-center text-black font-bold text-sm">
                            {userName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-200">{userName}</span>
                            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Member</span>
                        </div>
                    </div>
                    <button 
                        onClick={onBack}
                        className="text-gray-500 hover:text-white transition-colors p-2"
                        title="Log Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div style={{ backgroundColor: activeTheme.backgroundEnd }} className="flex-1 flex flex-col relative">
        
        {/* Header */}
        <header className="px-6 py-6 flex justify-between items-center z-10 shadow-sm relative">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#182B21] flex items-center justify-center border border-[#1E382A]">
                        <Bot className="w-6 h-6 text-[#2ECC71]" />
                    </div>
                    {/* Online Dot */}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#2ECC71] rounded-full border-2 border-[#0D0F12]"></div>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-[1.1rem] font-bold text-white tracking-wide">MindEase</h1>
                        <span className="bg-[#182B21] text-[#2ECC71] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-[#1E382A]">BETA</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium tracking-wide mt-0.5">Always here for you</p>
                </div>
            </div>

            {/* Audio Feedback Button */}
            <button className="w-12 h-12 rounded-full bg-[#182B21] border border-[#1E382A] flex items-center justify-center hover:bg-[#1E382A] transition-colors shadow-lg">
                <Volume2 className="w-5 h-5 text-[#2ECC71]" />
            </button>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent flex flex-col items-center">
            {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex flex-col w-full max-w-4xl ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                    {/* Bubble */}
                    <div 
                        className={`relative p-5 text-[15px] leading-relaxed max-w-[85%] sm:max-w-[75%]
                            ${msg.sender === 'user' 
                                ? 'bg-gradient-to-br from-[#1A1D20] to-[#212529] text-gray-100 rounded-[24px] rounded-br-[8px] border border-white/5 shadow-md' 
                                : 'bg-[#151719] text-gray-200 rounded-[24px] rounded-bl-[8px] border border-white/5 shadow-sm'
                            }
                            ${msg.isCrisis ? 'border-red-500/30' : ''}
                        `}
                    >
                        {msg.text}
                        
                        {/* Hospital Cards Section */}
                        {msg.isCrisis && msg.hospitalData && msg.hospitalData.length > 0 && (
                            <div className="mt-4 space-y-3">
                                <p className="text-red-400 font-semibold text-sm">Emergency Contacts & Facilities:</p>
                                {msg.hospitalData.map((h, i) => (
                                    <div key={i} className="bg-[#1A1D20] border border-red-500/20 p-3 rounded-xl shadow-sm text-sm">
                                        <p className="font-bold text-gray-100">{h.name}</p>
                                        <p className="text-gray-400 text-xs mt-1">{h.address}</p>
                                        <p className="text-[#2ECC71] mt-1 font-semibold">📞 {h.contact}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Distraction / Anxiety Protocol */}
                        {msg.isAnxiety && (
                            <div className="mt-6 flex flex-col items-center justify-center p-6 bg-[#1A1D20] rounded-[24px] border border-blue-500/20 shadow-lg">
                                <p className="text-blue-300 font-semibold text-sm mb-4 text-center">Take a moment to center yourself.</p>
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <div className="absolute w-full h-full bg-blue-500/20 rounded-full animate-ping [animation-duration:4s]"></div>
                                    <div className="absolute w-16 h-16 bg-blue-500/40 rounded-full animate-pulse [animation-duration:4s]"></div>
                                    <div className="relative w-8 h-8 bg-blue-400 rounded-full"></div>
                                </div>
                                <p className="text-gray-400 text-xs mt-6 text-center animate-pulse">Breathe in... Breathe out...</p>
                            </div>
                        )}
                    </div>

                    {/* Meta / Tag under bubble - AI Only */}
                    {msg.sender === 'ai' && (
                        <div className="flex items-center gap-2 mt-3 ml-2 text-gray-500 font-semibold tracking-widest text-[10px] uppercase">
                            <Bot className="w-3.5 h-3.5" />
                            <span>MINDEASE AI</span>
                        </div>
                    )}
                </div>
            ))}
            {isLoading && (
                <div className="flex flex-col items-start w-full max-w-4xl">
                    <div className="bg-[#151719] rounded-[24px] rounded-bl-[8px] p-5 border border-white/5 flex items-center gap-1.5 shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-pulse"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-pulse [animation-delay:0.2s]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-pulse [animation-delay:0.4s]"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ backgroundColor: activeTheme.backgroundEnd }} className="p-4 md:px-8 pb-6 w-full max-w-4xl mx-auto">
            <div className="relative group flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    style={{ backgroundColor: activeTheme.glassWrapper.backgroundColor, borderColor: activeTheme.glassWrapper.borderColor, color: activeTheme.text }}
                    className="w-full border hover:border-white/20 rounded-full py-4 pl-6 pr-24 placeholder-gray-600 focus:outline-none focus:border-[#2ECC71]/30 transition-all text-sm"
                />
                
                {/* Input Actions */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 text-gray-500">
                    <button className="hover:text-white transition-colors">
                        <Mic className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`transition-colors ${input.trim() ? 'text-[#2ECC71] hover:text-[#25B962]' : 'hover:text-white'}`}
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </div>
            </div>
            
            {/* Disclaimer / Version footer */}
            <div className="flex justify-center mt-4">
                <span className="text-[10px] font-bold text-gray-700 tracking-[0.2em] uppercase">
                    MINDEASE AI V2.2
                </span>
            </div>
        </div>

      </div>
    </div>
    </>
  );
}
