import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { X, CheckCircle, Circle, Save } from 'lucide-react-native';
import { THEMES } from '../theme';
import { Dimensions } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const API_URL = 'http://192.168.1.12:8000'; // Match your config

interface Quest {
  id: number;
  task: string;
  completed: boolean;
}

export const DashboardModal = ({ visible, onClose, themeKey }: { visible: boolean, onClose: () => void, themeKey: keyof typeof THEMES }) => {
  const currentTheme = THEMES[themeKey];
  const [quests, setQuests] = useState<Quest[]>([]);
  const [moodData, setMoodData] = useState<number[]>([0]);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      fetchDashboard();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      
      const parsedQuests = JSON.parse(res.data.daily_quests);
      setQuests(parsedQuests);
      
      const parsedMoods = JSON.parse(res.data.mood_history);
      if (parsedMoods && parsedMoods.length > 0) {
        setMoodData(parsedMoods.map((m: any) => m.mood || 0));
      } else {
        setMoodData([0]);
      }
      
      setCaregiverEmail(res.data.caregiver_email || '');
    } catch (e) {
      console.log('Failed to fetch dashboard', e);
    }
  };

  const toggleQuest = async (id: number) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, completed: !q.completed } : q));
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/dashboard/quest/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/settings`, { caregiver_email: caregiverEmail }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Settings Saved!");
    } catch (e) {
      console.error(e);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.container, { backgroundColor: currentTheme.backgroundStart }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: currentTheme.text }]}>MindEase Dashboard</Text>
          <TouchableOpacity onPress={onClose}><X color={currentTheme.text} size={28} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Analytics Chart */}
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>🧠 Emotional Trends</Text>
          <View style={[styles.card, { backgroundColor: currentTheme.surface }]}>
            <LineChart
              data={{
                labels: moodData.map((_, i) => `${i+1}`),
                datasets: [{ data: moodData.length > 0 ? moodData : [0] }]
              }}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: currentTheme.surface,
                backgroundGradientFrom: currentTheme.surface,
                backgroundGradientTo: currentTheme.primary,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 }
              }}
              bezier
              style={{ borderRadius: 16 }}
            />
          </View>

          {/* Gamification Quests */}
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>🗂️ Daily Wellness Quests</Text>
          <View style={[styles.card, { backgroundColor: currentTheme.surface }]}>
            {quests.map(quest => (
              <TouchableOpacity key={quest.id} style={styles.questRow} onPress={() => toggleQuest(quest.id)}>
                {quest.completed ? <CheckCircle color="#34D399" size={24} /> : <Circle color={currentTheme.textSecondary} size={24} />}
                <Text style={[styles.questText, { color: quest.completed ? '#34D399' : currentTheme.text }]}>{quest.task}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Caregiver Setting */}
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>👥 Emergency Caregiver Contact</Text>
          <View style={[styles.card, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.helper, { color: currentTheme.textSecondary }]}>
              We will send a proactive alert to this email automatically if severe crisis is detected.
            </Text>
            <TextInput
              style={[styles.input, { color: "white", backgroundColor: currentTheme.primary }]}
              value={caregiverEmail}
              onChangeText={setCaregiverEmail}
              placeholder="e.g. mom@gmail.com"
              placeholderTextColor="gray"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
              <Save color="black" size={18} style={{marginRight: 8}}/>
              <Text style={styles.saveBtnText}>Save Contact</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  scroll: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 10, marginBottom: 12 },
  card: { padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  questRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  questText: { marginLeft: 12, fontSize: 16 },
  helper: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  input: { padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 16 },
  saveBtn: { backgroundColor: '#34D399', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: 'black', fontWeight: 'bold', fontSize: 16 }
});