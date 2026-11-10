from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

# Enums for standardized values
class EmotionType(str, Enum):
    """Primary emotions detected by the system"""
    happy = "happy"
    sad = "sad"
    angry = "angry"
    anxious = "anxious"
    stressed = "stressed"
    neutral = "neutral"
    excited = "excited"
    frustrated = "frustrated"
    overwhelmed = "overwhelmed"
    hopeful = "hopeful"
    fearful = "fearful"

class RiskLevel(str, Enum):
    """Mental health risk assessment levels"""
    low = "low"
    moderate = "moderate"
    high = "high"
    critical = "critical"

class DetectionMethod(str, Enum):
    """Methods used for emotion detection"""
    text = "text"
    voice = "voice"
    facial = "facial"
    behavioral = "behavioral"

class AgeGroup(str, Enum):
    """Age groups for personalized responses"""
    child = "child"          # 6-12
    teen = "teen"            # 13-17
    young_adult = "young_adult"  # 18-25
    adult = "adult"          # 26-64

# Request Models
class EmotionDetectionRequest(BaseModel):
    """Request model for emotion detection from text"""
    text: str = Field(..., min_length=1, max_length=5000)
    user_id: str = Field(..., description="User identifier")
    context: Optional[str] = Field(None, description="Additional context like journal entry, chat message")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class RiskAssessmentRequest(BaseModel):
    """Request model for mental health risk assessment"""
    user_id: str = Field(..., description="User identifier")
    mood_history: List[Dict[str, Any]] = Field(default=[], description="Recent mood entries")
    journal_entries: List[str] = Field(default=[], description="Recent journal text")
    chat_messages: List[str] = Field(default=[], description="Recent chat interactions")
    questionnaire_responses: Optional[Dict[str, Any]] = Field(None, description="Latest questionnaire responses")
    age_group: AgeGroup = Field(AgeGroup.teen, description="User age group")

class ChatRequest(BaseModel):
    """Request model for AI chat interaction"""
    user_id: str = Field(..., description="User identifier")
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: str = Field(..., description="Chat session identifier")
    conversation_history: List[Dict[str, str]] = Field(default=[], description="Previous messages in session")
    user_profile: Optional[Dict[str, Any]] = Field(None, description="User context and preferences")

# Response Models
class EmotionScore(BaseModel):
    """Individual emotion score"""
    emotion: EmotionType
    confidence: float = Field(..., ge=0.0, le=1.0)
    intensity: float = Field(..., ge=0.0, le=1.0)

class EmotionDetectionResponse(BaseModel):
    """Response model for emotion detection"""
    primary_emotion: EmotionType
    emotions: List[EmotionScore]
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
    detected_keywords: List[str] = Field(default=[])
    sentiment_polarity: float = Field(..., ge=-1.0, le=1.0, description="Negative to positive sentiment")
    crisis_indicators: List[str] = Field(default=[], description="Potential crisis keywords detected")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class RiskFactor(BaseModel):
    """Individual risk factor"""
    factor: str
    weight: float = Field(..., ge=0.0, le=1.0)
    description: str
    evidence: List[str] = Field(default=[])

class RiskAssessmentResponse(BaseModel):
    """Response model for risk assessment"""
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk_factors: List[RiskFactor]
    protective_factors: List[str] = Field(default=[])
    recommendations: List[str] = Field(default=[])
    crisis_alert: bool = Field(default=False)
    professional_referral_needed: bool = Field(default=False)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatResponse(BaseModel):
    """Response model for AI chat"""
    response: str
    emotion_detected: Optional[EmotionType] = None
    crisis_detected: bool = Field(default=False)
    resources_suggested: List[str] = Field(default=[])
    conversation_tone: str = Field(default="supportive")
    next_session_recommendations: List[str] = Field(default=[])
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Analytics Models
class MoodTrend(BaseModel):
    """Mood trend analysis"""
    date: datetime
    primary_emotion: EmotionType
    intensity: float
    notes: Optional[str] = None

class UserAnalytics(BaseModel):
    """User mental health analytics"""
    user_id: str
    period: str = Field(description="e.g., '7_days', '30_days'")
    mood_trends: List[MoodTrend]
    dominant_emotions: List[EmotionType]
    risk_trend: str = Field(description="improving, stable, declining")
    engagement_score: float = Field(..., ge=0.0, le=1.0)
    intervention_effectiveness: Optional[float] = Field(None, ge=0.0, le=1.0)

# Error Models
class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: bool = True
    message: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)