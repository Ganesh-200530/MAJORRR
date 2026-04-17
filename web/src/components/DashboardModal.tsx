import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Activity, CheckCircle, Circle, Save } from 'lucide-react';
import { THEMES } from '../theme';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  themeKey: keyof typeof THEMES;
  setThemeKey: (key: keyof typeof THEMES) => void;
}

const API_URL = 'http://100.30.177.1:8000';

export function DashboardModal({ isOpen, onClose, token, themeKey, setThemeKey }: DashboardModalProps) {
  const [moodHistory, setMoodHistory] = useState<number[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const activeTheme = THEMES[themeKey];

  useEffect(() => {
    if (isOpen && token) {
      fetchDashboard();
    }
  }, [isOpen, token]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawMood = typeof response.data.mood_history === 'string' ? JSON.parse(response.data.mood_history) : (response.data.mood_history || []);
      setMoodHistory(rawMood.map((entry: any) => typeof entry === 'number' ? entry : (entry.mood || 0)));
      setQuests(typeof response.data.daily_quests === 'string' ? JSON.parse(response.data.daily_quests) : (response.data.daily_quests || []));
      setCaregiverEmail(response.data.caregiver_email || '');
    } catch (e) {
      console.error('Failed to load dashboard', e);
    }
  };

  const toggleQuest = async (questId: string) => {
    try {
      // Optimistic update
      setQuests(prev => prev.map(q => 
        q.id === questId ? { ...q, completed: !q.completed } : q
      ));

      await axios.post(`${API_URL}/dashboard/quest/${questId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to toggle quest', e);
      fetchDashboard(); // Revert back if fail
    }
  };

  const saveCaregiverEmail = async () => {
    if (!caregiverEmail.includes('@')) return;
    setSavingEmail(true);
    try {
      await axios.post(`${API_URL}/settings`, { caregiver_email: caregiverEmail }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Caregiver email saved!');
    } catch (e) {
      console.error('Failed to save settings', e);
    } finally {
      setSavingEmail(false);
    }
  };

  if (!isOpen) return null;

  // Simple CSS bar chart calculations
  const maxMood = Math.max(...moodHistory, 1);
  const minMood = Math.min(...moodHistory, -1);
  const chartRange = maxMood - minMood || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        style={{ backgroundColor: activeTheme.surface, borderColor: activeTheme.surfaceBorder }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 flex flex-col gap-6"
      >
        <div className="flex justify-between items-center">
          <h2 style={{ color: activeTheme.text }} className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-blue-400" />
            Dashboard & Settings
          </h2>
          <button onClick={onClose} style={{ color: activeTheme.textSecondary }} className="hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Themes */}
        <div className="space-y-3">
          <h3 style={{ color: activeTheme.text }} className="text-lg font-semibold">Appearance Theme</h3>
          <div className="flex gap-4">
            {Object.keys(THEMES).map((k) => {
              const currentKey = k as keyof typeof THEMES;
              const t = THEMES[currentKey];
              return (
                <button
                  key={currentKey}
                  onClick={() => setThemeKey(currentKey)}
                  style={{
                    backgroundColor: t.primary,
                    borderColor: themeKey === currentKey ? t.accent : t.surfaceBorder,
                    color: t.onPrimary
                  }}
                  className="px-4 py-2 rounded-lg border-2 font-medium transition-all"
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Emotion Analytics */}
        <div style={{ backgroundColor: activeTheme.glassWrapper.backgroundColor, borderColor: activeTheme.glassWrapper.borderColor }} className="rounded-xl border p-4">
          <h3 style={{ color: activeTheme.text }} className="text-lg font-semibold mb-4">Emotional Trend Analytics</h3>
          {moodHistory.length > 0 ? (
            <div className="h-40 flex items-end gap-2 px-2 pb-2 mt-4 border-b border-white/10 relative">
              {moodHistory.map((score, i) => {
                const normalizedHeight = ((score - minMood) / chartRange) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                    <div 
                      className="w-full rounded-t-sm transition-all duration-500 max-w-[20px]"
                      style={{ 
                        height: `max(10%, ${normalizedHeight}%)`, 
                        backgroundColor: score >= 0 ? '#4ade80' : '#f87171' // Green for pos, red for neg
                      }}
                    />
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 text-xs bg-black/80 px-2 py-1 rounded text-white pointer-events-none transition-opacity">
                      {score.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: activeTheme.textSecondary }}>No mood data available yet. Start chatting to track your emotional trends!</p>
          )}
        </div>

        {/* Gamification / Quests */}
        <div style={{ backgroundColor: activeTheme.glassWrapper.backgroundColor, borderColor: activeTheme.glassWrapper.borderColor }} className="rounded-xl border p-4">
          <h3 style={{ color: activeTheme.text }} className="text-lg font-semibold mb-4">Daily Wellness Quests</h3>
          <div className="flex flex-col gap-3">
            {quests.length > 0 ? quests.map((quest) => (
              <div 
                key={quest.id} 
                onClick={() => toggleQuest(quest.id)}
                style={{ backgroundColor: activeTheme.surface }}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:brightness-110 transition-all border border-white/5"
              >
                {quest.completed ? (
                  <CheckCircle className="text-green-400" />
                ) : (
                  <Circle style={{ color: activeTheme.textSecondary }} />
                )}
                <span style={{ color: quest.completed ? activeTheme.textSecondary : activeTheme.text, textDecoration: quest.completed ? 'line-through' : 'none' }}>
                  {quest.title}
                </span>
              </div>
            )) : <p style={{ color: activeTheme.textSecondary }}>Loading quests...</p>}
          </div>
        </div>

        {/* Emergency Caregiver Link */}
        <div style={{ backgroundColor: activeTheme.glassWrapper.backgroundColor, borderColor: activeTheme.glassWrapper.borderColor }} className="rounded-xl border p-4">
          <h3 style={{ color: activeTheme.text }} className="text-lg font-semibold mb-2">Emergency Caregiver Contact</h3>
          <p style={{ color: activeTheme.textSecondary }} className="text-sm mb-4">
            If our AI detects severe anxiety or a crisis, we will securely notify this trusted contact.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="caregiver@example.com"
              value={caregiverEmail}
              onChange={(e) => setCaregiverEmail(e.target.value)}
              style={{ backgroundColor: activeTheme.surface, color: activeTheme.text, borderColor: activeTheme.surfaceBorder }}
              className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={saveCaregiverEmail}
              disabled={savingEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Save size={18} />
              {savingEmail ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
