import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { ChatMessage } from '../../src/types/mentalHealth';
import ChatbotService from '../../src/services/chatbotService';

const TOPIC_CHIPS = ['stress', 'anxiety', 'loneliness', 'study pressure'];

const initialMessage: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  text: 'Hi, I am MindBot. You can talk to me about stress, anxiety, loneliness, or study pressure. I will share supportive coping strategies, breathing exercises, and journaling prompts.',
  timestamp: new Date().toISOString(),
};

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const appendUserMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const appendBotMessage = (text: string, emotionDetected?: ChatMessage['emotionDetected'], crisisDetected?: boolean) => {
    const newMessage: ChatMessage = {
      id: `bot-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      sender: 'bot',
      text,
      timestamp: new Date().toISOString(),
      emotionDetected,
      crisisDetected,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || loading) return;

    appendUserMessage(text);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-8).map((item) => ({
        sender: item.sender,
        text: item.text,
      }));

      const result = await ChatbotService.sendMessage(text, history);
      const emotionDetected = result.detectedEmotions?.[0] as ChatMessage['emotionDetected'] | undefined;
      appendBotMessage(result.reply, emotionDetected, result.isCrisis);
    } catch {
      appendBotMessage('I am having trouble responding right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>MindBot Support Chat</Text>
        <Text style={styles.subtitle}>OpenRouter AI emotional support for students</Text>
      </View>

      <View style={styles.chipsRow}>
        {TOPIC_CHIPS.map((chip) => (
          <TouchableOpacity key={chip} style={styles.chip} onPress={() => handleSend(`I want help with ${chip}.`)}>
            <Text style={styles.chipText}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reversedMessages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.messagesContainer}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.botText]}>{item.text}</Text>
            {item.crisisDetected ? (
              <Text style={styles.crisisText}>If you are in immediate danger, contact emergency support now.</Text>
            ) : null}
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Share how you feel..."
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  header: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#6B7280' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  chip: { backgroundColor: '#EEF0FF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: '#4338CA', fontWeight: '600', fontSize: 12, textTransform: 'capitalize' },

  messagesContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#6B4EFF' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#FFF' },
  botText: { color: '#1F2937' },
  crisisText: { marginTop: 8, color: '#B91C1C', fontSize: 12, fontWeight: '700' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    minWidth: 72,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#FFF', fontWeight: '700' },
});
