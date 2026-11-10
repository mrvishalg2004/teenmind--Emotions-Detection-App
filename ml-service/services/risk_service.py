"""
ML Prediction Service
Receives feature vectors from questionnaire responses and predicts mental health state.
Prediction categories: Normal, Mild Stress, High Stress, Depression Risk

Feature vector format:
{
    "stress": 3.0,      # 1-5 scale average
    "anxiety": 2.5,
    "sleep": 4.0,
    "social": 3.5,
    "academic": 4.5,
    "emotional": 2.0
}
"""

import numpy as np
from typing import List, Dict, Any, Tuple
from loguru import logger
import json


# Mental health state labels
MENTAL_STATES = ["Normal", "Mild Stress", "High Stress", "Depression Risk"]

# Risk level mapping
RISK_LEVELS = {
    "Normal": "low",
    "Mild Stress": "moderate",
    "High Stress": "high",
    "Depression Risk": "critical"
}

# Category weights for risk calculation (higher = more impact on mental health)
CATEGORY_WEIGHTS = {
    "stress":    1.15,
    "anxiety":   1.30,  # Highest weight - strong predictor
    "sleep":     0.80,  # Important but lower weight
    "social":    0.95,
    "academic":  1.10,
    "emotional": 1.40   # Strongest predictor for depression risk
}

# Thresholds for each mental state (based on weighted score 1-5)
THRESHOLDS = {
    "Normal":         (0.0,  2.2),   # Weighted score 0 to 2.2
    "Mild Stress":    (2.2,  3.2),   # Weighted score 2.2 to 3.2
    "High Stress":    (3.2,  4.0),   # Weighted score 3.2 to 4.0
    "Depression Risk":(4.0,  5.0)    # Weighted score 4.0+
}

# Recommendations per state and category
RECOMMENDATIONS = {
    "Normal": [
        "Keep up your healthy habits and self-care routine.",
        "Stay connected with friends and family.",
        "Continue prioritizing quality sleep.",
        "Engage in activities you enjoy regularly."
    ],
    "Mild Stress": [
        "Try 10 minutes of deep breathing or meditation daily.",
        "Talk to a trusted friend or family member about your feelings.",
        "Break large tasks into smaller, manageable steps.",
        "Maintain a consistent sleep schedule (8+ hours).",
        "Regular physical activity (30 min/day) can help reduce stress."
    ],
    "High Stress": [
        "Speak with a school counselor or mental health professional.",
        "Prioritize sleep — aim for 8-9 hours every night.",
        "Reduce academic overload by seeking help from teachers or tutors.",
        "Practice mindfulness or journaling to process your emotions.",
        "Connect with trusted adults who can provide support.",
        "Limit social media usage to reduce comparison and anxiety."
    ],
    "Depression Risk": [
        "Please reach out to a mental health professional or counselor promptly.",
        "Talk to a trusted adult (parent, teacher, counselor) about how you feel.",
        "If you're in crisis, contact a crisis helpline (988 Suicide & Crisis Lifeline).",
        "You are not alone — many teens experience these feelings, and help is available.",
        "Focus on basic self-care: sleep, nutrition, and gentle movement.",
        "Avoid isolating yourself — try to maintain at least one social connection daily."
    ]
}

# Category-specific recommendations
CATEGORY_RECOMMENDATIONS = {
    "stress": {
        "high": "Consider time management strategies and stress-reduction techniques.",
        "critical": "Your stress levels are very high. Please speak to a counselor today."
    },
    "anxiety": {
        "high": "Try grounding techniques (5-4-3-2-1 method) to manage anxiety attacks.",
        "critical": "High anxiety is significantly impacting you. Professional support is recommended."
    },
    "sleep": {
        "high": "Poor sleep is affecting your mental health. Establish a calming bedtime routine.",
        "critical": "Severe sleep disruption detected. Consult a doctor if sleep problems persist."
    },
    "social": {
        "high": "Social isolation can worsen mental health. Even short conversations with peers can help.",
        "critical": "You seem very isolated. Please reach out to at least one person you trust today."
    },
    "academic": {
        "high": "Take regular study breaks and ask for academic support when needed.",
        "critical": "Academic pressure is overwhelming you. Talk to your teacher or counselor for help."
    },
    "emotional": {
        "high": "Your emotional wellbeing needs attention. Journaling or therapy can help.",
        "critical": "Emotional distress at this level requires professional mental health support."
    }
}


class MentalHealthPredictor:
    """
    Rule-based mental health predictor using weighted category scores.
    Designed to be replaced with a trained ML model (e.g., Random Forest, SVM)
    when sufficient training data is available.
    """

    def __init__(self):
        self.model_version = "1.0.0-rules"
        logger.info(f"MentalHealthPredictor initialized (version: {self.model_version})")

    def validate_features(self, features: Dict[str, float]) -> Tuple[bool, str]:
        """Validate that feature vector has required keys and valid values."""
        required_keys = {"stress", "anxiety", "sleep", "social", "academic", "emotional"}
        missing = required_keys - set(features.keys())

        if missing:
            return False, f"Missing required features: {', '.join(missing)}"

        for key, value in features.items():
            if not isinstance(value, (int, float)):
                return False, f"Feature '{key}' must be a number, got {type(value).__name__}"
            if not (1.0 <= float(value) <= 5.0):
                return False, f"Feature '{key}' must be between 1.0 and 5.0, got {value}"

        return True, "OK"

    def calculate_weighted_score(self, features: Dict[str, float]) -> float:
        """
        Calculate a single weighted risk score from the feature vector.
        Higher score = higher risk.
        """
        total_weight = sum(CATEGORY_WEIGHTS[cat] for cat in CATEGORY_WEIGHTS if cat in features)

        if total_weight == 0:
            return 0.0

        weighted_sum = sum(
            float(features[cat]) * CATEGORY_WEIGHTS[cat]
            for cat in CATEGORY_WEIGHTS
            if cat in features
        )

        return weighted_sum / total_weight

    def detect_critical_flags(self, features: Dict[str, float]) -> List[str]:
        """
        Detect critical risk flags that warrant immediate attention
        regardless of weighted score.
        """
        flags = []

        emotional = float(features.get("emotional", 0))
        anxiety   = float(features.get("anxiety", 0))
        sleep     = float(features.get("sleep", 0))
        social    = float(features.get("social", 0))

        # Any single extreme score triggers a flag
        if emotional >= 4.8:
            flags.append("extreme_emotional_distress")
        if anxiety >= 4.8:
            flags.append("extreme_anxiety")
        if sleep <= 1.2:
            flags.append("severe_sleep_deprivation")
        if social <= 1.2:
            flags.append("critical_social_isolation")

        # Compound risk: multiple high scores
        high_scores = sum(
            1 for v in features.values() if float(v) >= 4.0
        )
        if high_scores >= 4:
            flags.append("multiple_high_risk_domains")

        return flags

    def get_category_risk_recommendations(self, features: Dict[str, float]) -> List[str]:
        """Generate category-specific recommendations for elevated scores."""
        recs = []
        for category, score in features.items():
            score = float(score)
            cat_recs = CATEGORY_RECOMMENDATIONS.get(category, {})
            if score >= 4.5 and "critical" in cat_recs:
                recs.append(cat_recs["critical"])
            elif score >= 3.5 and "high" in cat_recs:
                recs.append(cat_recs["high"])
        return recs

    def predict(self, features: Dict[str, float], student_id: str = None) -> Dict[str, Any]:
        """
        Main prediction method.

        Args:
            features: Dict with keys stress, anxiety, sleep, social, academic, emotional (all 1-5)
            student_id: Optional student identifier for logging

        Returns:
            Prediction result with state, risk level, confidence, and recommendations
        """
        # Validate inputs
        is_valid, message = self.validate_features(features)
        if not is_valid:
            raise ValueError(f"Invalid feature vector: {message}")

        # Calculate weighted score
        weighted_score = self.calculate_weighted_score(features)

        # Detect critical flags
        critical_flags = self.detect_critical_flags(features)

        # Determine prediction state
        prediction = "Normal"
        if critical_flags:
            # Critical flags always escalate to at least High Stress
            if "extreme_emotional_distress" in critical_flags or "multiple_high_risk_domains" in critical_flags:
                prediction = "Depression Risk"
                weighted_score = max(weighted_score, 4.0)  # Ensure score matches
            else:
                prediction = "High Stress"
                weighted_score = max(weighted_score, 3.2)
        else:
            # Standard threshold-based classification
            for state, (low, high) in THRESHOLDS.items():
                if low <= weighted_score < high:
                    prediction = state
                    break

        # Determine risk level
        risk_level = RISK_LEVELS[prediction]

        # Calculate confidence score (0-1)
        confidence = self._calculate_confidence(weighted_score, prediction, critical_flags)

        # Build recommendations
        base_recommendations    = RECOMMENDATIONS[prediction].copy()
        category_specific_recs  = self.get_category_risk_recommendations(features)

        # Merge without duplicates
        all_recommendations = list(dict.fromkeys(base_recommendations + category_specific_recs))

        # Prepare response
        result = {
            "prediction":       prediction,
            "riskLevel":        risk_level,
            "confidence":       round(confidence, 3),
            "weightedScore":    round(weighted_score, 3),
            "featureVector":    {k: round(float(v), 2) for k, v in features.items()},
            "recommendations":  all_recommendations[:6],  # Return top 6 recommendations
            "flagged":          len(critical_flags) > 0,
            "flagReasons":      critical_flags,
            "modelVersion":     self.model_version
        }

        logger.info(
            f"Prediction for {student_id or 'unknown'}: "
            f"{prediction} (score={weighted_score:.2f}, confidence={confidence:.2f})"
        )

        return result

    def _calculate_confidence(
        self,
        weighted_score: float,
        prediction: str,
        critical_flags: List[str]
    ) -> float:
        """
        Calculate prediction confidence based on how clearly the score
        falls within its threshold range.
        """
        thresholds = THRESHOLDS[prediction]
        low, high  = thresholds

        range_size = high - low
        if range_size <= 0:
            return 0.80

        # Distance from boundaries (0.0 = at boundary, 1.0 = at center)
        center = (low + high) / 2.0
        distance_from_center = abs(weighted_score - center)
        half_range = range_size / 2.0

        centrality = max(0.0, 1.0 - (distance_from_center / half_range))

        # Base confidence: 60% minimum + up to 35% from centrality
        base_confidence = 0.60 + (centrality * 0.35)

        # Boost confidence if critical flags strongly support the prediction
        if critical_flags and prediction in ("High Stress", "Depression Risk"):
            base_confidence = min(base_confidence + 0.05, 0.98)

        return round(base_confidence, 3)


# Global predictor instance
mental_health_predictor = MentalHealthPredictor()