import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, Mic, MicOff, Volume2, VolumeX, Plus, MessageSquare, Menu, X, Trash2, History, LogOut } from 'lucide-react';
import clsx from 'clsx';

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp?: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface Props {
  onBack: () => void;
  token: string;
  userName: string;
}

export default function ChatScreen({ onBack, token, userName }: Props) {
  // --- Sessions State ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(`mindEase_sessions_${userName}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    // Default initial session
    return [{
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [{ id: '1', text: `Hi ${userName}! I'm MindEase. How are you feeling today?`, sender: 'bot', timestamp: Date.now() }],
      createdAt: Date.now()
    }];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return localStorage.getItem(`mindEase_currentSessionId_${userName}`) || sessions[0]?.id || '';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Computed: Current Session
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession.messages;

  // --- UI/Chat State ---
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const sendMessageRef = useRef<any>(null);
  const processingRef = useRef(false);

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem(`mindEase_sessions_${userName}`, JSON.stringify(sessions));
  }, [sessions, userName]);

  useEffect(() => {
    localStorage.setItem(`mindEase_currentSessionId_${userName}`, currentSessionId);
  }, [currentSessionId, userName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentSessionId, isLoading]); // Scroll on message add or chat switch

  // Keep ref updated
  useEffect(() => {
      sendMessageRef.current = sendMessage;
  });

  // --- Session Management ---
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [{ id: '1', text: `Hi ${userName}! I'm MindEase. How are you feeling today?`, sender: 'bot', timestamp: Date.now() }],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false); // Close sidebar on mobile after creating
    
    // Stop any audio from previous chat
    stopAudio();
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    if (newSessions.length === 0) {
      // If deleted last one, create a new one
      createNewChat();
    } else {
      setSessions(newSessions);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(newSessions[0].id);
      }
    }
  };

  const selectSession = (sessionId: string) => {
      setCurrentSessionId(sessionId);
      setIsSidebarOpen(false);
      stopAudio();
  };
  
  const stopAudio = () => {
    window.speechSynthesis.cancel();
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // --- Helper to update current session messages ---
  const updateCurrentSessionMessages = (newMessages: Message[]) => {
      setSessions(prev => prev.map(session => {
          if (session.id === currentSessionId) {
             // Basic Title Generation Integration (if title is "New Conversation")
             let title = session.title;
             if (session.messages.length <= 1 && newMessages.length > 1) {
                 const firstUserMsg = newMessages.find(m => m.sender === 'user');
                 if (firstUserMsg) {
                     title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
                 }
             }
             return { ...session, title, messages: newMessages };
          }
          return session;
      }));
  };

  // --- Speech Recognition ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
          setIsListening(false);
          processingRef.current = false;
      };
      recognition.onresult = (event: any) => {
          if (processingRef.current) return;
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
              const transcript = result[0].transcript;
              if (transcript && transcript.trim().length > 0) {
                  processingRef.current = true;
                  setInputText(transcript);
                  if (sendMessageRef.current) {
                      sendMessageRef.current(transcript);
                  }
              }
          }
      };
      recognitionRef.current = recognition;
      return () => {
          if (recognition) try { recognition.abort(); } catch(e) {}
      };
    }
  }, []);


  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
          setIsListening(false);
          processingRef.current = false; // Reset processing guard
      };
      
      recognition.onresult = (event: any) => {
          // Prevent multiple handlers for the same phrase
          if (processingRef.current) return;
          
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
              const transcript = result[0].transcript;
              if (transcript && transcript.trim().length > 0) {
                  processingRef.current = true; // Lock
                  setInputText(transcript);
                  if (sendMessageRef.current) {
                      sendMessageRef.current(transcript);
                  }
              }
          }
      };

      recognitionRef.current = recognition;

      return () => {
          if (recognition) {
              try { recognition.abort(); } catch(e) {}
          }
      };
    }
  }, []);

  // Removed the separate effect that was re-binding onresult every render

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition isn't supported in this browser. Please use Chrome or Edge.");
        return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const playAudio = (base64Audio: string) => {
    if (!voiceEnabled) return;
    
    // Stop browser TTS
    window.speechSynthesis.cancel();
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
    }

    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    currentAudioRef.current = audio;
    
    // audio.onstart = () => setIsSpeaking(true); // Note: Audio has onplay, not onstart
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
    };
    audio.onerror = () => setIsSpeaking(false);
    
    audio.play().catch(e => console.error("Audio playback error:", e));
  };
   
  /* 
  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    
    // Stop any current speech (Audio or TTS)
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };
  */

  const toggleVoice = () => {
      if (isSpeaking) {
          window.speechSynthesis.cancel();
          if (currentAudioRef.current) {
              currentAudioRef.current.pause();
              currentAudioRef.current = null;
          }
          setIsSpeaking(false);
      }
      setVoiceEnabled(!voiceEnabled);
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : inputText;
    if (!textToSend.trim()) return;

    // Stop speaking if user interrupts
    stopAudio();

    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: Date.now()
    };
    
    // Update local state temporarily/optimistically
    const updatedMessages = [...messages, userMsg];
    updateCurrentSessionMessages(updatedMessages);

    setInputText('');
    setIsLoading(true);

    try {
      const response = await axios.post(
          'http://localhost:8000/chat', 
          {
            session_id: currentSessionId, // Use consistent session ID
            message: userMsg.text
          },
          {
            headers: {
                Authorization: `Bearer ${token}`
            }
          }
      );

      const botText = response.data.message;
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot',
        timestamp: Date.now()
      };
      
      updateCurrentSessionMessages([...updatedMessages, botMsg]);
      
      // Auto-speak response
      if (response.data.audio_base64) {
          playAudio(response.data.audio_base64);
      } else {
          // Fallback if no audio returned
          console.warn("No audio returned from backend, skipping TTS.");
      }

    } catch (error: any) {
      console.error(error);
      if (error.response && error.response.status === 401) {
          onBack(); // Logout
          return;
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now.",
        sender: 'bot',
        timestamp: Date.now()
      };
      updateCurrentSessionMessages([...updatedMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050a08] overflow-hidden relative selection:bg-primary/30 font-sans">
      {/* Liquid Background */}
      <div className="liquid-bg pointer-events-none" />
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Chat History */}
      <aside className={clsx(
          "fixed md:relative inset-y-0 left-0 w-80 z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
          "bg-black/20 backdrop-blur-3xl border-r border-white/5 shadow-2xl", // Enhanced Glassmorphism Sidebar
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h2 className="text-white font-bold text-xl flex items-center gap-2.5 tracking-tight">
                    <History className="w-5 h-5 text-primary drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">History</span>
                </h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-white/70" />
                </button>
            </div>

            <div className="p-4">
                <button 
                    onClick={createNewChat}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-emerald-500 text-black hover:brightness-110 p-4 rounded-2xl transition-all font-bold shadow-[0_0_20px_rgba(74,222,128,0.2)] group hover:shadow-[0_0_25px_rgba(74,222,128,0.4)]"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    New Conversation
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5 custom-scrollbar">
                {sessions.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => selectSession(session.id)}
                        className={clsx(
                            "group flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border duration-300 relative overflow-hidden",
                            currentSessionId === session.id 
                                ? "bg-white/10 border-primary/30 text-white shadow-[0_0_15px_rgba(0,0,0,0.2)] backdrop-blur-md" 
                                : "hover:bg-white/5 border-transparent text-white/50 hover:text-white"
                        )}
                    >
                         {/* Active Indicator */}
                        {currentSessionId === session.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_#4ade80]" />
                        )}

                        <MessageSquare className={clsx(
                            "w-5 h-5 shrink-0 transition-colors",
                            currentSessionId === session.id ? "text-primary" : "text-current"
                        )} />
                        <div className="flex-1 truncate text-sm font-medium z-10">
                            {session.title}
                        </div>
                        <button 
                            onClick={(e) => deleteSession(e, session.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-400 rounded-full transition-all z-10"
                            title="Delete Chat"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-emerald-600 flex items-center justify-center shadow-lg text-black font-bold border-2 border-white/10">
                        {userName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold text-white/90 truncate max-w-[120px]">{userName}</span>
                        <span className="text-[10px] text-white/40 font-mono tracking-wide">MEMBER</span>
                    </div>
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-red-500/10 text-white/30 hover:text-red-400 rounded-full transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative max-w-[100vw] z-10">
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-black/10 backdrop-blur-2xl z-20 shadow-sm relative">
        <div className="flex items-center">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors mr-2 text-white/70"
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-inner backdrop-blur-md group-hover:border-primary/30 transition-colors">
                         <Bot className="w-7 h-7 text-primary drop-shadow-[0_0_10px_rgba(74,222,128,0.6)]" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#050a08] flex items-center justify-center z-10">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#4ade80]" />
                    </div>
                </div>
                <div>
                    <h1 className="font-bold text-xl text-white tracking-tight flex items-center gap-2">
                        MindEase
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono border border-primary/20">BETA</span>
                    </h1>
                    <div className="flex items-center gap-1.5 opacity-60">
                         <span className="text-xs font-medium">Always here for you</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Voice Toggle */}
        <button 
            onClick={toggleVoice} 
            className={clsx(
                "p-3 rounded-full transition-all duration-300 border border-transparent backdrop-blur-md",
                voiceEnabled 
                    ? "bg-primary/20 text-primary border-primary/20 shadow-[0_0_15px_rgba(74,222,128,0.2)] hover:bg-primary/30" 
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            )}
            title={voiceEnabled ? "Mute Voice Response" : "Enable Voice Response"}
        >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex w-full animate-fade-in-up",
              msg.sender === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={clsx(
                "max-w-[85%] sm:max-w-[70%] p-6 rounded-[2rem] shadow-xl backdrop-blur-xl transition-all hover:scale-[1.01] duration-300 relative overflow-hidden",
                msg.sender === 'user'
                  ? "bg-gradient-to-br from-primary to-emerald-600 text-black rounded-tr-sm shadow-[0_10px_40px_-10px_rgba(74,222,128,0.3)]"
                  : "bg-white/5 border border-white/10 text-white rounded-tl-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]"
              )}
            >
               {/* Shine effect for user messages */}
               {msg.sender === 'user' && (
                   <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-30 pointer-events-none" />
               )}

              <p className={clsx(
                  "whitespace-pre-wrap leading-relaxed text-[15px] md:text-base relative z-10",
                  msg.sender === 'user' ? "font-semibold tracking-wide" : "font-light tracking-wide text-white/90"
              )}>{msg.text}</p>
              
              {msg.sender === 'bot' && (
                   <div className="mt-3 flex items-center gap-2 opacity-30">
                       <Bot className="w-3 h-3" />
                       <span className="text-[10px] font-mono uppercase tracking-widest">MindEase AI</span>
                   </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in-up">
             <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] rounded-tl-sm flex gap-4 items-center backdrop-blur-md shadow-lg">
                <span className="text-xs text-white/50 font-medium tracking-widest uppercase">Thinking</span>
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-30 pointer-events-none">
        <div className={clsx(
            "pointer-events-auto max-w-4xl mx-auto backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center p-2 pl-6 transition-all duration-500 relative shadow-2xl",
            "focus-within:border-primary/40 focus-within:bg-black/60 focus-within:shadow-[0_0_50px_rgba(74,222,128,0.15)] hover:border-white/20 hover:bg-black/40"
        )}>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 h-12 md:h-14 text-base md:text-lg font-light tracking-wide"
            disabled={isLoading || isListening}
          />

          <div className="flex items-center gap-2 pr-1">
            {/* Mic Button */}
            <div className="relative group">
                {isListening && (
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring pointer-events-none opacity-50" />
                )}
                <button
                    onClick={toggleListening}
                    className={clsx(
                        "p-3 md:p-4 rounded-full transition-all duration-300 relative z-10 border border-transparent",
                        isListening 
                            ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-110" 
                            : "hover:bg-white/10 text-white/60 hover:text-white hover:border-white/10"
                    )}
                >
                    {isListening ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
            </div>

            {/* Send Button */}
            <button
                onClick={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
                className={clsx(
                    "p-3 md:p-4 rounded-full transition-all duration-500 ease-out flex items-center justify-center border border-transparent",
                    inputText.trim() && !isLoading
                        ? "bg-gradient-to-r from-primary to-emerald-500 text-black shadow-[0_0_20px_rgba(74,222,128,0.4)] hover:shadow-[0_0_40px_rgba(74,222,128,0.6)] hover:scale-105 rotate-0 opacity-100"
                        : "bg-transparent text-white/10 cursor-not-allowed rotate-90 scale-75 opacity-50"
                )}
            >
                <Send className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
        
        <div className="text-center mt-4 pointer-events-auto">
            <p className="text-[10px] text-white/20 font-bold tracking-[0.2em] hover:text-primary/50 transition-colors cursor-default select-none">MINDEASE AI V2.2</p>
        </div>
      </div>
     </div>
    </div>
  );
}
