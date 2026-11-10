"""
Emotion Detection Service
Based on BERT and NLP techniques for analyzing text-based emotional content
Adapted from P24 Activity Recommendation System emotion detection patterns
"""

import re
import asyncio
from typing import List, Dict, Any
from loguru import logger

# Since we don't want to install heavy ML dependencies immediately,
# we'll create a rule-based emotion detector for now that can be replaced
# with actual BERT models later

class EmotionDetectionService:
    """Service for detecting emotions from text using NLP techniques"""

    def __init__(self):
        """Initialize the emotion detection service"""
        self.emotion_keywords = {
            "happy": [
                "happy", "joy", "excited", "cheerful", "delighted", "pleased",
                "glad", "content", "thrilled", "overjoyed", "elated", "blissful",
                "amazing", "wonderful", "fantastic", "great", "awesome", "love"
            ],
            "sad": [
                "sad", "depressed", "down", "blue", "melancholy", "gloomy",
                "dejected", "heartbroken", "sorrowful", "grief", "crying",
                "tears", "lonely", "empty", "hopeless", "miserable"
            ],
            "angry": [
                "angry", "mad", "furious", "irritated", "annoyed", "frustrated",
                "rage", "livid", "incensed", "outraged", "upset", "pissed",
                "hate", "disgusted", "resentful", "bitter"
            ],
            "anxious": [
                "anxious", "worried", "nervous", "stressed", "panic", "fear",
                "scared", "frightened", "terrified", "apprehensive", "uneasy",
                "concerned", "overwhelmed", "tension", "restless", "agitated"
            ],
            "stressed": [
                "stressed", "pressure", "overwhelmed", "burden", "exhausted",
                "tired", "drained", "overworked", "swamped", "hectic",
                "chaos", "demanding", "intense", "struggle", "strain"
            ],
            "neutral": [
                "okay", "fine", "normal", "usual", "regular", "calm",
                "peaceful", "steady", "balanced", "stable"
            ]
        }

        self.crisis_keywords = [
            "suicide", "kill myself", "end it all", "not worth living",
            "want to die", "hurt myself", "self harm", "cut myself",
            "overdose", "jump off", "hang myself", "gun", "pills",
            "nobody cares", "better off dead", "can't go on",
            "nothing matters", "give up", "no hope"
        ]

        self.positive_indicators = [
            "better", "improving", "hopeful", "confident", "proud",
            "grateful", "thankful", "blessed", "lucky", "successful"
        ]

        logger.info("✅ Emotion Detection Service initialized")

    def preprocess_text(self, text: str) -> str:
        """Preprocess text for emotion analysis"""
        # Convert to lowercase
        text = text.lower()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def detect_crisis_indicators(self, text: str) -> List[str]:
        """Detect potential crisis indicators in text"""
        text_lower = text.lower()
        detected_crisis = []

        for keyword in self.crisis_keywords:
            if keyword in text_lower:
                detected_crisis.append(keyword)

        return detected_crisis

    def calculate_emotion_scores(self, text: str) -> Dict[str, float]:
        """Calculate emotion scores based on keyword matching"""
        text_lower = self.preprocess_text(text)
        emotion_scores = {}

        total_words = len(text_lower.split())
        if total_words == 0:
            return {emotion: 0.0 for emotion in self.emotion_keywords.keys()}

        for emotion, keywords in self.emotion_keywords.items():
            matches = 0
            for keyword in keywords:
                matches += text_lower.count(keyword)

            # Normalize by text length
            score = min(matches / max(total_words * 0.1, 1), 1.0)
            emotion_scores[emotion] = score

        # Boost positive emotions if positive indicators are present
        positive_boost = 0
        for indicator in self.positive_indicators:
            if indicator in text_lower:
                positive_boost += 0.1

        emotion_scores["happy"] = min(emotion_scores.get("happy", 0) + positive_boost, 1.0)

        return emotion_scores

    def determine_primary_emotion(self, emotion_scores: Dict[str, float]) -> tuple:
        """Determine the primary emotion and confidence"""
        if not emotion_scores:
            return "neutral", 0.0

        # Find the emotion with the highest score
        primary_emotion = max(emotion_scores, key=emotion_scores.get)
        confidence = emotion_scores[primary_emotion]

        # If all scores are very low, default to neutral
        if confidence < 0.1:
            return "neutral", 0.5

        return primary_emotion, confidence

    def calculate_sentiment_polarity(self, emotion_scores: Dict[str, float]) -> float:
        """Calculate sentiment polarity (-1 to 1, negative to positive)"""
        positive_emotions = ["happy", "excited", "hopeful"]
        negative_emotions = ["sad", "angry", "anxious", "stressed"]

        positive_score = sum(emotion_scores.get(emotion, 0) for emotion in positive_emotions)
        negative_score = sum(emotion_scores.get(emotion, 0) for emotion in negative_emotions)

        if positive_score + negative_score == 0:
            return 0.0  # Neutral

        polarity = (positive_score - negative_score) / (positive_score + negative_score)
        return max(-1.0, min(1.0, polarity))

    async def analyze_text_emotion(self, text: str, user_id: str = None) -> Dict[str, Any]:
        """
        Analyze emotion in text and return detailed results

        Args:
            text: Text to analyze
            user_id: Optional user identifier for context

        Returns:
            Dictionary with emotion analysis results
        """
        try:
            logger.debug(f"Analyzing emotion for text: {text[:100]}...")

            # Detect crisis indicators first
            crisis_indicators = self.detect_crisis_indicators(text)

            # Calculate emotion scores
            emotion_scores = self.calculate_emotion_scores(text)

            # Determine primary emotion
            primary_emotion, confidence = self.determine_primary_emotion(emotion_scores)

            # Calculate sentiment polarity
            sentiment_polarity = self.calculate_sentiment_polarity(emotion_scores)

            # Extract keywords that contributed to emotion detection
            detected_keywords = []
            text_lower = text.lower()
            for emotion, keywords in self.emotion_keywords.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        detected_keywords.append(keyword)

            result = {
                "primary_emotion": primary_emotion,
                "emotions": [
                    {
                        "emotion": emotion,
                        "confidence": score,
                        "intensity": score  # For now, intensity = confidence
                    }
                    for emotion, score in emotion_scores.items()
                    if score > 0.05  # Only include emotions with meaningful scores
                ],
                "overall_confidence": confidence,
                "detected_keywords": list(set(detected_keywords)),
                "sentiment_polarity": sentiment_polarity,
                "crisis_indicators": crisis_indicators
            }

            logger.debug(f"Emotion analysis complete: {primary_emotion} (confidence: {confidence:.2f})")

            return result

        except Exception as e:
            logger.error(f"Error in emotion analysis: {e}")
            return {
                "primary_emotion": "neutral",
                "emotions": [],
                "overall_confidence": 0.0,
                "detected_keywords": [],
                "sentiment_polarity": 0.0,
                "crisis_indicators": []
            }

    async def batch_analyze_emotions(self, texts: List[str], user_id: str = None) -> List[Dict[str, Any]]:
        """Analyze emotions for multiple texts concurrently"""
        tasks = [self.analyze_text_emotion(text, user_id) for text in texts]
        results = await asyncio.gather(*tasks)
        return results

# Global service instance
emotion_service = EmotionDetectionService()