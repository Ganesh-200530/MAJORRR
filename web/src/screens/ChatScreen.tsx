import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, ArrowLeft, Bot, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
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
}

interface Props {
  onBack: () => void;
}

export default function ChatScreen({ onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hi! I'm MindEase. How are you feeling today?", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const sendMessageRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Keep ref updated
  useEffect(() => {
      sendMessageRef.current = sendMessage;
  });

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
              setInputText(transcript);
              if (sendMessageRef.current) {
                  sendMessageRef.current(transcript);
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
    
    audio.onstart = () => setIsSpeaking(true); // Note: Audio has onplay, not onstart
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
    };
    audio.onerror = () => setIsSpeaking(false);
    
    audio.play().catch(e => console.error("Audio playback error:", e));
  };

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
    window.speechSynthesis.cancel();
    if (currentAudioRef.current) {
        currentAudioRef.current.pause();
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/chat', {
        session_id: 'web-client-' + Date.now(),
        message: userMsg.text
      });

      const botText = response.data.message;
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
      
      // Auto-speak response
      if (response.data.audio_base64) {
          playAudio(response.data.audio_base64);
      } else {
          // Fallback if no audio returned
          console.warn("No audio returned from backend, skipping TTS.");
      }

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now.",
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-surface backdrop-blur-xl border-x border-surfaceBorder">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-surfaceBorder bg-backgroundStart/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors mr-2">
            <ArrowLeft className="w-6 h-6 text-textSecondary" />
            </button>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="font-bold text-white">MindEase</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-textSecondary">Online</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Voice Toggle */}
        <button 
            onClick={toggleVoice} 
            className={clsx(
                "p-2 rounded-full transition-colors",
                voiceEnabled ? "bg-primary/20 text-primary" : "bg-white/5 text-textSecondary"
            )}
            title={voiceEnabled ? "Mute Voice Response" : "Enable Voice Response"}
        >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex w-full",
              msg.sender === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={clsx(
                "max-w-[80%] p-4 rounded-2xl",
                msg.sender === 'user'
                  ? "bg-primary text-onPrimary rounded-tr-none"
                  : "bg-surface border border-surfaceBorder text-white rounded-tl-none"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-surface border border-surfaceBorder p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-surfaceBorder bg-backgroundEnd/80 backdrop-blur-md">
        <div className="bg-surface border border-surfaceBorder rounded-full flex items-center p-2 pr-2 pl-4 focus-within:border-primary/50 transition-colors gap-2">
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-textSecondary"
            disabled={isLoading}
          />
          
          {/* Mic Button */}
          <button
            onClick={toggleListening}
            className={clsx(
                "p-2 rounded-full transition-all duration-300",
                isListening 
                    ? "bg-red-500 text-white animate-pulse" 
                    : "hover:bg-white/10 text-white"
            )}
            title="Voice Input"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-primary text-onPrimary rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
