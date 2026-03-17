"""
Waste Image Classifier using Pillow-based image analysis.
Uses color histograms, brightness, and texture analysis to classify waste.
Compatible with Python 3.13 (no TensorFlow/PyTorch required).
"""

import logging
from PIL import Image, ImageStat, ImageFilter
import io
from collections import Counter

logger = logging.getLogger(__name__)

# Color profile mappings for waste types
# Based on average color characteristics of different waste materials
MATERIAL_COLOR_PROFILES = {
    "plastic": {
        "saturation_range": (30, 200),
        "brightness_range": (100, 240),
        "dominant_hues": ["blue", "white", "clear", "red", "green", "yellow"],
    },
    "metal": {
        "saturation_range": (0, 50),
        "brightness_range": (80, 200),
        "dominant_hues": ["gray", "silver", "dark"],
    },
    "organic": {
        "saturation_range": (20, 180),
        "brightness_range": (40, 180),
        "dominant_hues": ["green", "brown", "yellow", "dark"],
    },
    "paper": {
        "saturation_range": (0, 60),
        "brightness_range": (150, 250),
        "dominant_hues": ["white", "beige", "brown"],
    },
    "glass": {
        "saturation_range": (0, 80),
        "brightness_range": (120, 250),
        "dominant_hues": ["clear", "green", "brown", "white"],
    },
    "e-waste": {
        "saturation_range": (0, 80),
        "brightness_range": (30, 150),
        "dominant_hues": ["dark", "green", "black", "gray"],
    },
    "textile": {
        "saturation_range": (20, 220),
        "brightness_range": (60, 220),
        "dominant_hues": ["blue", "red", "white", "black", "multi"],
    },
}


def get_dominant_color_name(r: int, g: int, b: int) -> str:
    """Map RGB to a named color category."""
    brightness = (r + g + b) / 3

    if brightness < 50:
        return "black"
    if brightness > 220 and max(r, g, b) - min(r, g, b) < 30:
        return "white"
    if max(r, g, b) - min(r, g, b) < 25:
        if brightness > 160:
            return "beige" if r > b else "silver"
        return "gray" if brightness > 80 else "dark"

    # Chromatic colors
    if r > g and r > b:
        return "brown" if g > 80 and brightness < 140 else "red"
    if g > r and g > b:
        return "green"
    if b > r and b > g:
        return "blue"
    if r > 180 and g > 180 and b < 100:
        return "yellow"
    return "multi"


def analyze_image_colors(img: Image.Image) -> dict:
    """Analyze color distribution of an image."""
    # Resize for faster processing
    img_small = img.resize((100, 100)).convert("RGB")
    pixels = list(img_small.getdata())

    # Get color names for all pixels
    color_names = [get_dominant_color_name(r, g, b) for r, g, b in pixels]
    color_counts = Counter(color_names)
    total = len(color_names)

    # Get dominant colors (top 3)
    dominant = [name for name, _ in color_counts.most_common(3)]

    # Calculate average brightness and saturation
    stat = ImageStat.Stat(img_small)
    avg_r, avg_g, avg_b = stat.mean[:3]
    brightness = (avg_r + avg_g + avg_b) / 3
    saturation = max(avg_r, avg_g, avg_b) - min(avg_r, avg_g, avg_b)

    return {
        "dominant_colors": dominant,
        "color_distribution": {k: round(v / total * 100, 1) for k, v in color_counts.most_common(5)},
        "brightness": brightness,
        "saturation": saturation,
    }


def analyze_texture(img: Image.Image) -> dict:
    """Analyze image texture using edge detection."""
    img_gray = img.resize((100, 100)).convert("L")

    # Edge detection for texture complexity
    edges = img_gray.filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edges)
    edge_intensity = edge_stat.mean[0]

    # Variance indicates detail level
    variance = edge_stat.var[0] if edge_stat.var else 0

    return {
        "edge_intensity": edge_intensity,
        "texture_complexity": "high" if edge_intensity > 40 else "medium" if edge_intensity > 20 else "low",
        "detail_variance": variance,
    }


def classify_image(image_bytes: bytes) -> dict:
    """
    Classify a waste image using color and texture analysis.

    Returns:
        dict with keys: material_type, quality, confidence, top_labels
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        colors = analyze_image_colors(img)
        texture = analyze_texture(img)

        # Score each material category
        scores = {}
        for material, profile in MATERIAL_COLOR_PROFILES.items():
            score = 0

            # Check saturation range match
            sat_min, sat_max = profile["saturation_range"]
            if sat_min <= colors["saturation"] <= sat_max:
                score += 25
            elif abs(colors["saturation"] - sat_min) < 20 or abs(colors["saturation"] - sat_max) < 20:
                score += 10

            # Check brightness range match
            bri_min, bri_max = profile["brightness_range"]
            if bri_min <= colors["brightness"] <= bri_max:
                score += 25
            elif abs(colors["brightness"] - bri_min) < 20 or abs(colors["brightness"] - bri_max) < 20:
                score += 10

            # Check dominant color match
            color_matches = sum(1 for c in colors["dominant_colors"] if c in profile["dominant_hues"])
            score += color_matches * 15

            # Texture-based adjustments
            if material == "metal" and texture["texture_complexity"] == "low":
                score += 10  # Metal tends to have smooth surfaces
            if material == "e-waste" and texture["texture_complexity"] == "high":
                score += 10  # Circuit boards have complex textures
            if material == "textile" and texture["texture_complexity"] == "medium":
                score += 5

            scores[material] = score

        # Best match
        best_material = max(scores, key=scores.get)
        best_score = scores[best_material]
        total_score = sum(scores.values())

        # Confidence based on how dominant the top pick is
        confidence = min(85, int((best_score / max(total_score, 1)) * 100) + 15)

        # Quality estimation from brightness and texture
        if colors["brightness"] > 160 and texture["texture_complexity"] == "low":
            quality = "high"
        elif colors["brightness"] < 80 or texture["texture_complexity"] == "high":
            quality = "low"
        else:
            quality = "medium"

        # Generate descriptive labels
        top_labels = [
            f"{colors['dominant_colors'][0]}_toned" if colors["dominant_colors"] else "unknown",
            f"{'smooth' if texture['texture_complexity'] == 'low' else 'textured'}_surface",
            f"{'bright' if colors['brightness'] > 150 else 'dark' if colors['brightness'] < 80 else 'neutral'}_image",
        ]

        logger.info(f"Classification scores: {scores}")
        logger.info(f"Best match: {best_material} (confidence: {confidence}%)")

        return {
            "material_type": best_material,
            "quality": quality,
            "confidence": confidence,
            "top_labels": top_labels,
        }

    except Exception as e:
        logger.error(f"Image classification error: {e}")
        return {
            "material_type": "general",
            "quality": "medium",
            "confidence": 10,
            "top_labels": [],
        }
