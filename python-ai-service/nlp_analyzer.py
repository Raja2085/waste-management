"""
NLP Analyzer for waste descriptions using pure Python.
Extracts keywords, detects material hints, and assesses quality from text.
Compatible with Python 3.13 (no spaCy required).
"""

import logging
import re
from collections import Counter

logger = logging.getLogger(__name__)

# Material keywords to detect in text descriptions
MATERIAL_KEYWORDS: dict[str, list[str]] = {
    "plastic": ["plastic", "polythene", "hdpe", "ldpe", "pet", "pvc", "polypropylene", "nylon", "acrylic", "polymer", "polyester", "styrofoam", "thermocol", "bottle", "container", "wrapper", "packaging"],
    "metal": ["metal", "iron", "steel", "aluminium", "aluminum", "copper", "brass", "tin", "zinc", "scrap metal", "alloy", "stainless", "wire", "rod", "pipe", "can"],
    "e-waste": ["electronic", "e-waste", "ewaste", "circuit", "pcb", "battery", "charger", "cable", "wire", "motherboard", "phone", "laptop", "computer", "monitor", "printer", "led", "lcd", "keyboard", "mouse", "device"],
    "organic": ["organic", "food", "vegetable", "fruit", "compost", "bio", "garden", "leaf", "leaves", "wood", "sawdust", "crop", "agricultural", "manure", "hay", "straw", "biomass", "green waste"],
    "paper": ["paper", "cardboard", "carton", "newspaper", "magazine", "book", "packaging", "corrugated", "tissue", "envelope", "printing", "office paper"],
    "glass": ["glass", "bottle", "mirror", "window", "jar", "glassware", "ceramic", "porcelain", "broken glass"],
    "textile": ["textile", "cloth", "fabric", "cotton", "silk", "wool", "jute", "denim", "leather", "garment", "clothing", "rag", "fiber", "thread"],
}

# Quality indicators in text
QUALITY_KEYWORDS: dict[str, list[str]] = {
    "high": ["clean", "new", "unused", "pure", "sorted", "washed", "fresh", "premium", "excellent", "pristine", "good condition", "intact", "uncontaminated"],
    "medium": ["used", "mixed", "decent", "moderate", "average", "fair", "okay", "normal", "standard", "regular"],
    "low": ["dirty", "contaminated", "broken", "damaged", "rusty", "old", "degraded", "rotten", "spoiled", "poor", "crushed", "torn", "wet", "soiled", "corroded"],
}

# Recyclability hints
RECYCLABILITY_POSITIVE = ["recyclable", "reusable", "clean", "sorted", "separated", "dry", "pure", "unused", "intact", "uncontaminated"]
RECYCLABILITY_NEGATIVE = ["contaminated", "mixed waste", "hazardous", "toxic", "non-recyclable", "dirty", "wet", "soiled", "chemical", "paint"]

# Common English stopwords for filtering
STOPWORDS = {
    "a", "an", "the", "is", "it", "in", "on", "at", "to", "for", "of", "and", "or",
    "but", "not", "with", "from", "by", "as", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "can", "this", "that", "these", "those", "i", "we", "you", "he",
    "she", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its",
    "our", "their", "what", "which", "who", "when", "where", "how", "why", "all",
    "each", "every", "both", "few", "more", "most", "some", "any", "no", "very",
    "just", "about", "also", "so", "than", "then", "too", "only", "up", "out",
    "if", "into", "over", "after", "before", "between", "under", "again", "there",
}


def tokenize(text: str) -> list[str]:
    """Simple tokenizer: lowercases, splits on non-alpha, filters stopwords."""
    words = re.findall(r'[a-zA-Z]{3,}', text.lower())
    return [w for w in words if w not in STOPWORDS]


def extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords from description."""
    tokens = tokenize(text)

    # Count word frequencies
    counts = Counter(tokens)

    # Also check for known material/quality words
    text_lower = text.lower()
    bonus_keywords = set()
    for category_words in MATERIAL_KEYWORDS.values():
        for word in category_words:
            if word in text_lower:
                bonus_keywords.add(word)

    for quality_words in QUALITY_KEYWORDS.values():
        for word in quality_words:
            if word in text_lower:
                bonus_keywords.add(word)

    # Merge: frequent words + bonus keywords
    keywords = set()
    for word, count in counts.most_common(20):
        if len(word) > 2:
            keywords.add(word)
    keywords.update(bonus_keywords)

    return sorted(list(keywords))[:15]  # Cap at 15 keywords


def detect_material_from_text(text: str) -> tuple[str, float]:
    """
    Detect the most likely material type from the text description.
    Returns (material_type, confidence_score 0-1).
    """
    text_lower = text.lower()
    scores: dict[str, int] = {}

    for material, keywords in MATERIAL_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            # Exact word boundary match gets higher score
            pattern = r'\b' + re.escape(keyword) + r'\b'
            matches = len(re.findall(pattern, text_lower))
            if matches > 0:
                score += matches * 3
            elif keyword in text_lower:
                score += 1
        scores[material] = score

    if not scores or max(scores.values()) == 0:
        return "general", 0.0

    best_material = max(scores, key=scores.get)
    total = sum(scores.values())
    confidence = scores[best_material] / total if total > 0 else 0.0

    return best_material, min(confidence, 1.0)


def assess_quality_from_text(text: str) -> str:
    """Assess quality level from text description."""
    text_lower = text.lower()

    scores = {"high": 0, "medium": 0, "low": 0}

    for quality, keywords in QUALITY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                scores[quality] += 1

    if max(scores.values()) == 0:
        return "medium"  # Default

    return max(scores, key=scores.get)


def calculate_recyclability_from_text(text: str) -> int:
    """Calculate a recyclability score from text (0-100)."""
    text_lower = text.lower()
    score = 50  # Neutral baseline

    for word in RECYCLABILITY_POSITIVE:
        if word in text_lower:
            score += 8

    for word in RECYCLABILITY_NEGATIVE:
        if word in text_lower:
            score -= 10

    return max(0, min(100, score))


def analyze_text(description: str) -> dict:
    """
    Full NLP analysis of a waste description.

    Returns:
        dict with keys: material_type, material_confidence, quality, keywords, recyclability_score
    """
    try:
        if not description or not description.strip():
            return {
                "material_type": "general",
                "material_confidence": 0.0,
                "quality": "medium",
                "keywords": [],
                "recyclability_score": 50,
            }

        keywords = extract_keywords(description)
        material_type, material_confidence = detect_material_from_text(description)
        quality = assess_quality_from_text(description)
        recyclability = calculate_recyclability_from_text(description)

        return {
            "material_type": material_type,
            "material_confidence": material_confidence,
            "quality": quality,
            "keywords": keywords,
            "recyclability_score": recyclability,
        }
    except Exception as e:
        logger.error(f"NLP analysis error: {e}")
        return {
            "material_type": "general",
            "material_confidence": 0.0,
            "quality": "medium",
            "keywords": [],
            "recyclability_score": 50,
        }
