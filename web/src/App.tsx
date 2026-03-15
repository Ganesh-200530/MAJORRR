import { useState, useEffect } from 'react';
import OnboardingScreen from './screens/OnboardingScreen';
import ChatScreen from './screens/ChatScreen';
import AuthScreen from './screens/AuthScreen';

function App() {
  const [screen, setScreen] = useState<'onboarding' | 'auth' | 'chat'>('auth');
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('token'));
  const [userName, setUserName] = useState<string | null>(sessionStorage.getItem('username'));

  useEffect(() => {
    // If we have a token on load, go straight to chat
    if (token) {
        setScreen('chat');
    }
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUserName: string) => {
      sessionStorage.setItem('token', newToken);
      sessionStorage.setItem('username', newUserName);
      setToken(newToken);
      setUserName(newUserName);
      setScreen('chat');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    setToken(null);
    setUserName(null);
    setScreen('auth'); // Go to auth instead of onboarding on logout
  };

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreen onStart={() => setScreen('auth')} />;
      case 'auth':
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
      case 'chat':
        return <ChatScreen onBack={handleLogout} token={token || ''} userName={userName || 'User'} />;
      default:
        return <OnboardingScreen onStart={() => setScreen('auth')} />;
    }
  };

  return (
    <div className="min-h-screen text-white font-sans antialiased selection:bg-primary selection:text-black">
      {renderScreen()}
    </div>
  );
}

export default App;

