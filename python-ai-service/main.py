"""
FastAPI AI Service for Waste Classification.

Endpoints:
  GET  /health         - Health check
  POST /analyze-waste  - Analyze waste image + description

Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from classifier import classify_image
from nlp_analyzer import analyze_text

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Waste AI Classification Service",
    version="1.0.0",
    description="AI-powered waste classification using CNN (MobileNetV2) and NLP (spaCy)"
)

# CORS - allow all origins for deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    image_url: str
    description: str = ""
    quantity: float = 0


class AnalyzeResponse(BaseModel):
    material_type: str
    quality: str
    recyclability_score: int
    keywords: list[str]
    confidence: int


# ─── Endpoints ────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "waste-ai-classifier"}


@app.post("/analyze-waste", response_model=AnalyzeResponse)
async def analyze_waste(request: AnalyzeRequest):
    """
    Analyze a waste item using both image classification (CNN) and
    text analysis (NLP), then combine the results.
    """
    logger.info(f"Analyzing waste: image_url={request.image_url[:80]}..., description={request.description[:50]}...")

    # ── Step 1: Download image ──────────────────────────────────────
    image_bytes = None
    image_result = None

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(request.image_url)
            if response.status_code == 200:
                image_bytes = response.content
                logger.info(f"Image downloaded: {len(image_bytes)} bytes")
            else:
                logger.warning(f"Image download failed: HTTP {response.status_code}")
    except Exception as e:
        logger.warning(f"Image download error: {e}")

    # ── Step 2: CNN Image Classification ────────────────────────────
    if image_bytes:
        try:
            image_result = classify_image(image_bytes)
            logger.info(f"CNN result: {image_result}")
        except Exception as e:
            logger.error(f"CNN classification failed: {e}")

    # ── Step 3: NLP Text Analysis ───────────────────────────────────
    text_result = analyze_text(request.description) if request.description else {
        "material_type": "general",
        "material_confidence": 0.0,
        "quality": "medium",
        "keywords": [],
        "recyclability_score": 50
    }
    logger.info(f"NLP result: {text_result}")

    # ── Step 4: Combine Results ─────────────────────────────────────
    combined = combine_results(image_result, text_result, request.quantity)
    logger.info(f"Combined result: {combined}")

    return AnalyzeResponse(**combined)


def combine_results(
    image_result: dict | None,
    text_result: dict,
    quantity: float
) -> dict:
    """
    Combine CNN (image) and NLP (text) results into a single prediction.

    Strategy:
    - If both have a material prediction, prefer the one with higher confidence.
    - If only one source has a result, use it.
    - Recyclability is a weighted average of both + quantity bonus.
    - Keywords come from NLP + CNN top labels.
    """

    # Material type: use text if confident, otherwise image
    if image_result and image_result["material_type"] != "general":
        if text_result["material_type"] != "general" and text_result["material_confidence"] > 0.5:
            # Text is very confident: prefer text
            material_type = text_result["material_type"]
        else:
            # Otherwise prefer image
            material_type = image_result["material_type"]
    else:
        material_type = text_result["material_type"]

    # Quality: prefer text assessment (more descriptive)
    quality = text_result.get("quality", "medium")
    if image_result and image_result.get("quality") != "medium":
        # Image gave a non-default quality, blend in
        quality = image_result["quality"]

    # Confidence: weighted blend
    img_conf = image_result["confidence"] if image_result else 0
    text_conf = int(text_result["material_confidence"] * 100)
    confidence = int(img_conf * 0.6 + text_conf * 0.4) if image_result else max(text_conf, 30)
    confidence = max(10, min(100, confidence))

    # Recyclability score
    img_recycle = img_conf if image_result else 50  # Use image confidence as proxy
    text_recycle = text_result.get("recyclability_score", 50)
    recyclability_score = int(img_recycle * 0.4 + text_recycle * 0.6)

    # Quantity bonus: larger quantities are more attractive for recycling
    if quantity > 100:
        recyclability_score = min(100, recyclability_score + 10)
    elif quantity > 50:
        recyclability_score = min(100, recyclability_score + 5)

    recyclability_score = max(0, min(100, recyclability_score))

    # Keywords: merge NLP keywords + CNN top labels
    keywords = list(text_result.get("keywords", []))
    if image_result and image_result.get("top_labels"):
        for label in image_result["top_labels"]:
            clean_label = label.replace("_", " ")
            if clean_label not in keywords:
                keywords.append(clean_label)

    keywords = keywords[:15]  # Cap

    return {
        "material_type": material_type,
        "quality": quality,
        "recyclability_score": recyclability_score,
        "keywords": keywords,
        "confidence": confidence
    }


# ─── Startup Event ───────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Pre-load models on startup for faster first request."""
    logger.info("🚀 Waste AI Service starting up...")
    logger.info("Models will be loaded on first request (lazy loading).")
    logger.info("Service ready at http://localhost:8000")
