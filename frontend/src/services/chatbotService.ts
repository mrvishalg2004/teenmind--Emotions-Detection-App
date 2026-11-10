import api from './api';

export interface ChatbotResponse {
  reply: string;
  detectedTopics: string[];
  detectedEmotions: string[];
  suggestions: string[];
  breathingExercise: string;
  journalingPrompt: string;
  isCrisis: boolean;
  source?: 'openrouter' | 'rule_based';
  timestamp: string;
}

export interface ChatHistoryEntry {
  sender: 'user' | 'bot';
  text: string;
}

const ChatbotService = {
  async sendMessage(message: string, history: ChatHistoryEntry[] = []): Promise<ChatbotResponse> {
    const { data } = await api.post('/chatbot/message', { message, history });
    return data.data;
  },
};

export default ChatbotService;
