import axios from 'axios';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

const TOPIC_KEYWORDS = {
  stress: ['stress', 'stressed', 'overwhelmed', 'pressure', 'burnout', 'exhausted', 'tense'],
  anxiety: ['anxiety', 'anxious', 'panic', 'worry', 'worried', 'nervous', 'fear', 'scared'],
  loneliness: ['lonely', 'alone', 'isolated', 'disconnected', 'no friends', 'left out'],
  study_pressure: ['exam', 'tests', 'grades', 'homework', 'assignment', 'study', 'school', 'academic'],
};

const EMOTION_KEYWORDS = {
  sad: ['sad', 'down', 'hopeless', 'empty', 'cry'],
  anxious: ['anxious', 'panic', 'nervous', 'worry', 'worried', 'fear'],
  angry: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated'],
  stressed: ['stressed', 'pressure', 'overwhelmed', 'burnout', 'exhausted'],
  lonely: ['lonely', 'alone', 'isolated', 'ignored'],
};

const BASE_SUPPORT = [
  'Thank you for sharing this with me. Your feelings are valid.',
  'You are not alone in this—many students feel this way at times.',
];

const STRATEGIES = {
  stress: [
    'Try the 5-5-5 reset: breathe in for 5 seconds, hold for 5, exhale for 5. Repeat 5 rounds.',
    'Break tasks into smaller steps and focus on one step at a time.',
    'Take a short movement break (5–10 minutes) to reduce physical tension.',
  ],
  anxiety: [
    'Use grounding: name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.',
    'Slow breathing: inhale for 4 seconds, exhale for 6 seconds for 2 minutes.',
    'Challenge one anxious thought by asking: “What evidence supports this?”',
  ],
  loneliness: [
    'Send one message to a trusted friend, family member, or mentor today.',
    'Join one small group activity this week (class club, hobby, study circle).',
    'Write one supportive sentence to yourself as if to a close friend.',
  ],
  study_pressure: [
    'Use a 25-minute study block + 5-minute break (Pomodoro).',
    'Prioritize top 3 tasks for today instead of trying to do everything at once.',
    'Ask a teacher or classmate for help on one difficult topic.',
  ],
};

const UNIVERSAL_SUGGESTIONS = [
  'Try a short breathing exercise right now (2 minutes).',
  'Write a quick journal entry about what you’re feeling and what triggered it.',
  'Drink some water and take a short pause before your next task.',
];

const CRISIS_KEYWORDS = [
  'self harm',
  'self-harm',
  'harm myself',
  'hurt myself',
  'hurting myself',
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'die today',
  'take my life',
];

const normalizeText = (text) => String(text || '').toLowerCase();

const cleanText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const detectByKeywords = (text, dictionary) => {
  const matches = [];
  Object.entries(dictionary).forEach(([key, words]) => {
    if (words.some((word) => text.includes(word))) {
      matches.push(key);
    }
  });
  return matches;
};

export const analyzeMessage = (message) => {
  const text = normalizeText(message);

  const detectedTopics = detectByKeywords(text, TOPIC_KEYWORDS);
  const detectedEmotions = detectByKeywords(text, EMOTION_KEYWORDS);
  const isCrisis = CRISIS_KEYWORDS.some((keyword) => text.includes(keyword));

  return {
    detectedTopics,
    detectedEmotions,
    isCrisis,
  };
};

const generateRuleBasedReply = (message) => {
  const analysis = analyzeMessage(message);

  const topicSuggestions = analysis.detectedTopics.flatMap((topic) => STRATEGIES[topic] || []);
  const selectedStrategies = topicSuggestions.slice(0, 3);

  const intro = BASE_SUPPORT.join(' ');

  const focusLine = analysis.detectedTopics.length
    ? `I noticed concerns around ${analysis.detectedTopics.map((topic) => topic.replace('_', ' ')).join(', ')}.`
    : 'I can support you with stress, anxiety, loneliness, and study pressure.';

  const responseLines = [
    intro,
    focusLine,
    ...(selectedStrategies.length ? ['Here are a few coping strategies you can try right now:'] : []),
    ...selectedStrategies.map((strategy, index) => `${index + 1}. ${strategy}`),
    'Breathing exercise: inhale 4s, hold 4s, exhale 6s for 2 minutes.',
    'Journaling prompt: “What am I feeling, what triggered it, and what is one small next step?”',
  ];

  if (!selectedStrategies.length) {
    responseLines.splice(2, 0, ...UNIVERSAL_SUGGESTIONS.map((s, i) => `${i + 1}. ${s}`));
  }

  if (analysis.isCrisis) {
    responseLines.push('If you feel unsafe, please contact local emergency services or a trusted adult immediately.');
  }

  return {
    reply: responseLines.join('\n'),
    detectedTopics: analysis.detectedTopics,
    detectedEmotions: analysis.detectedEmotions,
    suggestions: selectedStrategies.length ? selectedStrategies : UNIVERSAL_SUGGESTIONS,
    breathingExercise: 'Inhale 4s → Hold 4s → Exhale 6s (repeat for 2 minutes)',
    journalingPrompt: 'What am I feeling? What triggered it? What is one small step I can take now?',
    isCrisis: analysis.isCrisis,
    source: 'rule_based',
  };
};

const parseJsonFromModel = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') {
    return null;
  }

  const withoutCodeFence = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(withoutCodeFence);
  } catch {
    const firstBrace = withoutCodeFence.indexOf('{');
    const lastBrace = withoutCodeFence.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(withoutCodeFence.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
};

const normalizeHistory = (history = []) => {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-10)
    .map((entry) => {
      const text = cleanText(entry?.text || '');
      const sender = entry?.sender === 'bot' ? 'assistant' : 'user';

      if (!text) return null;
      return { role: sender, content: text };
    })
    .filter(Boolean);
};

const buildOpenRouterMessages = ({ message, history, analysis }) => {
  const historyMessages = normalizeHistory(history);

  const instruction = [
    'You are MindBot, a supportive AI assistant for students.',
    'Use warm, simple language. Do not diagnose, label, or prescribe medication.',
    'Give practical coping support for stress, anxiety, loneliness, and study pressure.',
    'If message contains self-harm or suicide risk, keep calm tone and include immediate safety advice to contact trusted adult/emergency support.',
    'Return only strict JSON with this shape:',
    '{"reply":"string","suggestions":["string"],"breathingExercise":"string","journalingPrompt":"string"}',
    'reply should be short (max 140 words) and actionable.',
    `Detected topics from keyword scan: ${analysis.detectedTopics.join(', ') || 'none'}.`,
    `Detected emotions from keyword scan: ${analysis.detectedEmotions.join(', ') || 'none'}.`,
    `Crisis keyword detected: ${analysis.isCrisis ? 'yes' : 'no'}.`,
  ].join(' ');

  return [
    { role: 'system', content: instruction },
    ...historyMessages,
    { role: 'user', content: cleanText(message) },
  ];
};

const callOpenRouter = async ({ message, history, analysis }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY missing');
  }

  const response = await axios.post(
    OPENROUTER_CHAT_URL,
    {
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      temperature: 0.4,
      messages: buildOpenRouterMessages({ message, history, analysis }),
    },
    {
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3001',
        'X-Title': process.env.OPENROUTER_APP_TITLE || 'TeenMind MindBot Chat',
      },
    },
  );

  const content = response?.data?.choices?.[0]?.message?.content;
  const parsed = parseJsonFromModel(content);
  if (!parsed) {
    throw new Error('Unable to parse OpenRouter JSON response');
  }

  return {
    reply: cleanText(parsed.reply),
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map((item) => cleanText(item)).filter(Boolean).slice(0, 4) : [],
    breathingExercise: cleanText(parsed.breathingExercise),
    journalingPrompt: cleanText(parsed.journalingPrompt),
  };
};

export const generateSupportiveReply = async (message, history = []) => {
  const analysis = analyzeMessage(message);
  const ruleBased = generateRuleBasedReply(message);

  try {
    const openRouter = await callOpenRouter({ message, history, analysis });
    const safetyLine = 'If you feel unsafe right now, please contact a trusted adult or local emergency support immediately.';
    const withSafety = analysis.isCrisis && !openRouter.reply.toLowerCase().includes('emergency')
      ? `${openRouter.reply}\n${safetyLine}`
      : openRouter.reply;

    return {
      reply: withSafety || ruleBased.reply,
      detectedTopics: analysis.detectedTopics,
      detectedEmotions: analysis.detectedEmotions,
      suggestions: openRouter.suggestions.length ? openRouter.suggestions : ruleBased.suggestions,
      breathingExercise: openRouter.breathingExercise || ruleBased.breathingExercise,
      journalingPrompt: openRouter.journalingPrompt || ruleBased.journalingPrompt,
      isCrisis: analysis.isCrisis,
      source: 'openrouter',
    };
  } catch (error) {
    console.error('OpenRouter chatbot fallback:', error?.response?.data || error.message);
    return ruleBased;
  }
};
