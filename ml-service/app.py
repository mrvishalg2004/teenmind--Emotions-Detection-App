from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import motor.motor_asyncio
from loguru import logger

from routes.prediction_routes import router as prediction_router
from services.risk_service import mental_health_predictor

# Load environment variables
load_dotenv()

# Database configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "teenmind")

# Global database variables
mongo_client = None
database = None

SERVICE_STATUS = {
    "database": "disconnected",
    "ml_model": "disconnected",
    "prediction_api": "starting",
    "model_version": "unknown",
    "startup_check": "not_run",
}


def run_model_startup_check():
    """Run a lightweight warm-up prediction to verify model pipeline readiness."""
    sample_features = {
        "stress": 2.8,
        "anxiety": 2.6,
        "sleep": 3.1,
        "social": 2.4,
        "academic": 3.3,
        "emotional": 2.7,
    }

    result = mental_health_predictor.predict(sample_features, student_id="startup-check")
    return {
        "prediction": result["prediction"],
        "riskLevel": result["riskLevel"],
        "modelVersion": result["modelVersion"],
    }

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan manager for FastAPI app startup and shutdown"""
    global mongo_client, database

    # Startup
    logger.info("🚀 Starting TeenMind ML Service")

    try:
        # Connect to MongoDB
        mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
        database = mongo_client[DATABASE_NAME]

        # Test connection
        await mongo_client.admin.command("ping")
        logger.success(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        SERVICE_STATUS["database"] = "connected"
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        logger.warning("Continuing without database connection...")
        SERVICE_STATUS["database"] = "disconnected"

    logger.info("🔄 Loading ML prediction pipeline...")
    try:
        check = run_model_startup_check()
        SERVICE_STATUS["ml_model"] = "connected"
        SERVICE_STATUS["prediction_api"] = "ready"
        SERVICE_STATUS["model_version"] = check["modelVersion"]
        SERVICE_STATUS["startup_check"] = "passed"

        logger.success(
            "✅ Machine learning model connected "
            f"| version={check['modelVersion']} "
            f"| samplePrediction={check['prediction']} "
            f"| risk={check['riskLevel']}"
        )
    except Exception as e:
        SERVICE_STATUS["ml_model"] = "disconnected"
        SERVICE_STATUS["prediction_api"] = "degraded"
        SERVICE_STATUS["startup_check"] = "failed"
        logger.error(f"❌ ML startup check failed: {e}")

    logger.info(
        "🔗 Service Status => "
        f"Database: {SERVICE_STATUS['database']} | "
        f"ML Model: {SERVICE_STATUS['ml_model']} | "
        f"Prediction API: {SERVICE_STATUS['prediction_api']}"
    )

    yield

    # Shutdown
    logger.info("🔄 Shutting down TeenMind ML Service")
    if mongo_client:
        mongo_client.close()
        logger.info("✅ MongoDB connection closed")

# Create FastAPI app
app = FastAPI(
    title="TeenMind ML Service",
    description="AI-powered mental health assessment and prediction service for students",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # React dev server
        "http://localhost:8081",     # Expo Metro (web)
        "http://localhost:19006",    # Expo webpack (web)
        "http://localhost:5000",     # Express backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(prediction_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "TeenMind ML Service",
        "version": "1.0.0",
        "database": "connected" if database is not None else "disconnected",
        "ml_model": SERVICE_STATUS["ml_model"],
        "prediction_api": SERVICE_STATUS["prediction_api"],
        "model_version": SERVICE_STATUS["model_version"],
        "startup_check": SERVICE_STATUS["startup_check"],
    }

# Emotion detection endpoints (to be implemented)
@app.get("/emotion/")
async def get_emotion_info():
    """Get information about emotion detection capabilities"""
    return {
        "service": "emotion_detection",
        "supported_emotions": [
            "happy", "sad", "anxious", "angry", "stressed",
            "neutral", "excited", "frustrated", "overwhelmed"
        ],
        "detection_methods": ["text", "voice", "facial"],
        "status": "available"
    }

# Risk assessment endpoints (to be implemented)
@app.get("/risk/")
async def get_risk_info():
    """Get information about risk assessment capabilities"""
    return {
        "service": "risk_assessment",
        "risk_levels": ["low", "moderate", "high", "critical"],
        "factors": [
            "mood_patterns", "journal_content", "chat_interactions",
            "questionnaire_responses", "behavioral_changes"
        ],
        "status": "available"
    }

# Chat AI endpoints (to be implemented)
@app.get("/chat/")
async def get_chat_info():
    """Get information about AI chat capabilities"""
    return {
        "service": "ai_chat",
        "capabilities": [
            "therapeutic_conversation",
            "crisis_detection",
            "resource_recommendation",
            "emotional_support"
        ],
        "safety_features": [
            "crisis_keyword_detection",
            "professional_escalation",
            "content_moderation"
        ],
        "status": "available"
    }

# Database dependency
async def get_database():
    """Dependency to get database connection"""
    if not database:
        raise HTTPException(
            status_code=503,
            detail="Database connection not available"
        )
    return database

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))

    logger.info(f"Starting server on port {port}")
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )