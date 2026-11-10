"""
ML Prediction Endpoints
POST /ml/predict  - Predict mental health state from questionnaire feature vector
GET  /ml/history  - Get prediction history for a student
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime
from loguru import logger

from services.risk_service import mental_health_predictor

router = APIRouter(prefix="/ml", tags=["ML Prediction"])


# ───────────────────────────────── Request / Response Models ──────────────────

class PredictRequest(BaseModel):
    """
    Feature vector received from the Node.js backend after a student
    completes the mental health questionnaire.

    Each field is an average score (1-5) for its category:
      1 = best possible state
      5 = worst possible state
    """
    features: Dict[str, float] = Field(
        ...,
        description="Category scores (stress, anxiety, sleep, social, academic, emotional)",
        example={
            "stress":    3.0,
            "anxiety":   2.5,
            "sleep":     4.0,
            "social":    3.5,
            "academic":  4.5,
            "emotional": 2.0
        }
    )
    student_id:  Optional[str] = Field(None, description="Student identifier (for logging)")
    session_id:  Optional[str] = Field(None, description="Questionnaire session identifier")

    @field_validator("features")
    @classmethod
    def validate_features(cls, v: Dict[str, float]) -> Dict[str, float]:
        required = {"stress", "anxiety", "sleep", "social", "academic", "emotional"}
        missing  = required - set(v.keys())
        if missing:
            raise ValueError(f"Missing required features: {', '.join(sorted(missing))}")

        for key, val in v.items():
            if not isinstance(val, (int, float)):
                raise ValueError(f"Feature '{key}' must be numeric, got {type(val).__name__}")
            f = float(val)
            if not (1.0 <= f <= 5.0):
                raise ValueError(f"Feature '{key}' must be in range 1–5, got {val}")

        return {k: float(v) for k, v in v.items()}


class PredictResponse(BaseModel):
    """Complete prediction response"""
    success:        bool
    prediction:     str          = Field(..., description="One of: Normal | Mild Stress | High Stress | Depression Risk")
    riskLevel:      str          = Field(..., description="low | moderate | high | critical")
    confidence:     float        = Field(..., ge=0, le=1)
    weightedScore:  float        = Field(..., description="Internal weighted score (1–5 range)")
    featureVector:  Dict[str, float]
    recommendations: List[str]
    flagged:        bool
    flagReasons:    List[str]
    modelVersion:   str
    processedAt:    datetime


# ─────────────────────────────────── Routes ───────────────────────────────────

@router.post("/predict", response_model=PredictResponse, summary="Predict mental health state")
async def predict_mental_health(request: PredictRequest):
    """
    Accepts a feature vector built from questionnaire responses and returns
    a mental health state prediction including:

    - **prediction**: Human-readable state label
    - **riskLevel**: Severity tier (low / moderate / high / critical)
    - **confidence**: Model confidence 0–1
    - **recommendations**: Personalised, actionable advice
    - **flagged**: True when critical risk indicators are detected

    Feature vector example:
    ```json
    {
        "stress":    3,
        "anxiety":   4,
        "sleep":     2,
        "social":    3,
        "academic":  5,
        "emotional": 4
    }
    ```
    """
    try:
        logger.info(
            f"Prediction request | student={request.student_id or 'anon'} "
            f"session={request.session_id or 'n/a'} | features={request.features}"
        )

        result = mental_health_predictor.predict(
            features=request.features,
            student_id=request.student_id
        )

        return PredictResponse(
            success        = True,
            prediction     = result["prediction"],
            riskLevel      = result["riskLevel"],
            confidence     = result["confidence"],
            weightedScore  = result["weightedScore"],
            featureVector  = result["featureVector"],
            recommendations= result["recommendations"],
            flagged        = result["flagged"],
            flagReasons    = result["flagReasons"],
            modelVersion   = result["modelVersion"],
            processedAt    = datetime.utcnow()
        )

    except ValueError as ve:
        logger.warning(f"Invalid prediction request: {ve}")
        raise HTTPException(status_code=422, detail=str(ve))

    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Mental health prediction failed")


@router.get("/states", summary="List all possible mental health states")
async def get_mental_states():
    """Returns the possible prediction states with risk mappings and thresholds."""
    return {
        "states": [
            {
                "name":        "Normal",
                "riskLevel":   "low",
                "description": "No significant mental health concerns detected.",
                "scoreRange":  "1.0–2.2"
            },
            {
                "name":        "Mild Stress",
                "riskLevel":   "moderate",
                "description": "Mild stress present; manageable with self-care strategies.",
                "scoreRange":  "2.2–3.2"
            },
            {
                "name":        "High Stress",
                "riskLevel":   "high",
                "description": "Elevated stress requiring professional support.",
                "scoreRange":  "3.2–4.0"
            },
            {
                "name":        "Depression Risk",
                "riskLevel":   "critical",
                "description": "Significant risk indicators present; immediate support recommended.",
                "scoreRange":  "4.0–5.0"
            }
        ]
    }