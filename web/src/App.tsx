import { useState } from 'react';
import OnboardingScreen from './screens/OnboardingScreen';
import ChatScreen from './screens/ChatScreen';

function App() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen text-white font-sans antialiased selection:bg-primary selection:text-black">
      {showChat ? (
        <ChatScreen onBack={() => setShowChat(false)} />
      ) : (
        <OnboardingScreen onStart={() => setShowChat(true)} />
      )}
    </div>
  );
}

export default App;
