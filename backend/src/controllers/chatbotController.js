import { generateSupportiveReply } from '../services/chatbotService.js';

export const sendChatbotMessage = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const result = await generateSupportiveReply(String(message), history);

    return res.json({
      success: true,
      data: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Chatbot message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chatbot message',
    });
  }
};
