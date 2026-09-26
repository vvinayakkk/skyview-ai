"""
Crop Disease Detection and Plant Pathology API Routes
Endpoints:
- POST /disease/detect (and /api/disease/detect)
- GET /disease/info
"""

import base64
import logging
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from skyview.agents.disease_service import (
    COMMON_DISEASES,
    INDIAN_CROPS,
    analyze_crop_image,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Crop Pathology & Disease Diagnostics"])


class Base64ImagePayload(BaseModel):
    image_base64: str
    crop_hint: Optional[str] = None


@router.post("/disease/detect")
@router.post("/api/disease/detect")
async def detect_crop_disease(
    image: Optional[UploadFile] = File(None),
):
    """
    Multimodal visual diagnostic endpoint.
    Accepts multipart image upload of infected crop leaf, stem, or fruit.
    Returns pathological classification, confidence index, bounding boxes, and multi-stage remedies.
    """
    if not image:
        raise HTTPException(status_code=400, detail="Foliar image upload is required")

    if image.content_type and not (
        image.content_type.startswith("image/")
        or image.content_type == "application/octet-stream"
    ):
        raise HTTPException(status_code=400, detail="Invalid media type. Must be an image file.")

    try:
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded image is empty")

        result = await analyze_crop_image(image_bytes)
        return {
            "success": True,
            "filename": image.filename,
            "diagnostic": result,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Disease detection route exception: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Plant pathology diagnostic engine failure: {str(exc)}",
        )


@router.post("/disease/detect-base64")
@router.post("/api/disease/detect-base64")
async def detect_crop_disease_base64(payload: Base64ImagePayload):
    """
    Alternative endpoint accepting base64 encoded image string (ideal for mobile & low-bandwidth IoT).
    """
    try:
        raw_b64 = payload.image_base64
        if "base64," in raw_b64:
            raw_b64 = raw_b64.split("base64,")[1]

        image_bytes = base64.b64decode(raw_b64)
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Decoded image buffer is empty")

        result = await analyze_crop_image(image_bytes)
        return {
            "success": True,
            "diagnostic": result,
        }
    except Exception as exc:
        logger.error("Base64 disease detection route exception: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Plant pathology diagnostic engine failure: {str(exc)}",
        )


@router.get("/disease/info")
@router.get("/api/disease/info")
async def get_pathology_catalog():
    """Return catalog of recognized host crops and target disease pathogens."""
    return {
        "engine": "BRICS AgriN Multimodal Plant Pathology Diagnostic System",
        "vision_models": ["gemini-2.5-flash", "gemini-2.0-flash", "qwen/qwen3.6-27b"],
        "recognized_crops": INDIAN_CROPS,
        "primary_pathologies": COMMON_DISEASES,
        "segmentation_output": "Percentage Bounding Boxes (x, y, width, height)",
    }
