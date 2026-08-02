"""Cross-encoder reranker using sentence-transformers.

This module provides a production-ready cross-encoder reranker that scores
(query, chunk_text) pairs and reranks retrieval candidates. The model is
loaded once and cached (similar to embeddings).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Optional

import numpy as np

from .retrieval import RetrievalResult
from ..config import EMBEDDINGS_CACHE_DIR

logger = logging.getLogger(__name__)

# Default cross-encoder model
DEFAULT_CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


@dataclass
class RerankInput:
    candidates: list[RetrievalResult]
    top_k: int = 5


@dataclass
class RerankOutput:
    kept: list[RetrievalResult]
    dropped: list[RetrievalResult]
    # rerank scores aligned to candidates order
    scores: dict[str, float] = field(default_factory=dict)


class CrossEncoderReranker:
    """Cross-encoder reranker with lazy loading and caching.
    
    Uses sentence-transformers.CrossEncoder to score (query, chunk_text) pairs.
    The model is loaded once per process and cached.
    """
    
    def __init__(
        self,
        model_name: str = DEFAULT_CROSS_ENCODER_MODEL,
        cache_dir: Optional[Path] = None,
        batch_size: int = 32,
        device: Optional[str] = None,
    ) -> None:
        self.model_name = model_name
        self.cache_dir = cache_dir or EMBEDDINGS_CACHE_DIR
        self.batch_size = batch_size
        self.device = device
        self._model = None
        self._model_loaded = False
    
    @property
    def model(self):
        """Lazy-load the cross-encoder model."""
        if not self._model_loaded:
            self._load_model()
        return self._model
    
    def _load_model(self) -> None:
        """Load the cross-encoder model from sentence-transformers."""
        try:
            from sentence_transformers import CrossEncoder
            
            # Ensure cache directory exists
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            
            # Use cache folder for model downloads
            self._model = CrossEncoder(
                self.model_name,
                cache_dir=str(self.cache_dir),
                device=self.device,
            )
            self._model_loaded = True
            logger.info(f"Loaded cross-encoder model: {self.model_name}")
        except ImportError:
            logger.error("sentence-transformers not installed. Install with: pip install sentence-transformers")
            raise
        except Exception as e:
            logger.error(f"Failed to load cross-encoder model {self.model_name}: {e}")
            raise
    
    def score_pairs(self, query: str, texts: list[str]) -> list[float]:
        """Score (query, text) pairs using the cross-encoder.
        
        Args:
            query: The search query
            texts: List of chunk texts to score against the query
            
        Returns:
            List of scores (higher = more relevant)
        """
        if not texts:
            return []
        
        # Create pairs for cross-encoder: [(query, text1), (query, text2), ...]
        pairs = [(query, text) for text in texts]
        
        # Predict scores (returns numpy array of shape (n_pairs,))
        scores = self.model.predict(
            pairs,
            batch_size=self.batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        
        # Ensure we return a list of floats
        if isinstance(scores, np.ndarray):
            return scores.tolist()
        return list(scores)
    
    def rerank(
        self,
        candidates: list[RetrievalResult],
        top_k: int = 5,
        query: str = "",
    ) -> RerankOutput:
        """Rerank candidates using cross-encoder scores.
        
        Args:
            candidates: List of RetrievalResult from hybrid retrieval
            top_k: Number of top candidates to keep
            query: The original query (used for cross-encoder scoring)
            
        Returns:
            RerankOutput with kept/dropped candidates and rerank scores
        """
        if not candidates:
            return RerankOutput(kept=[], dropped=[], scores={})
        
        # Get chunk texts
        texts = [cand.chunk.text for cand in candidates]
        
        # Score with cross-encoder
        ce_scores = self.score_pairs(query, texts)
        
        # Combine candidates with scores and sort
        scored = list(zip(ce_scores, candidates))
        scored.sort(key=lambda x: x[0], reverse=True)
        
        # Build output
        scores_dict = {cand.chunk.chunk_id: round(score, 6) for score, cand in scored}
        kept = [cand for _, cand in scored[:top_k]]
        dropped = [cand for _, cand in scored[top_k:]]
        
        return RerankOutput(kept=kept, dropped=dropped, scores=scores_dict)


# Global singleton instance (like Embeddings)
_reranker: Optional[CrossEncoderReranker] = None


def get_reranker(
    model_name: str = DEFAULT_CROSS_ENCODER_MODEL,
    cache_dir: Optional[Path] = None,
    batch_size: int = 32,
    device: Optional[str] = None,
) -> CrossEncoderReranker:
    """Get or create the global cross-encoder reranker instance."""
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoderReranker(
            model_name=model_name,
            cache_dir=cache_dir,
            batch_size=batch_size,
            device=device,
        )
    return _reranker


def reset_reranker() -> None:
    """Reset the global reranker (useful for testing or config changes)."""
    global _reranker
    _reranker = None


# Convenience function matching the original rerank interface
def rerank_cross_encoder(
    candidates: list[RetrievalResult],
    top_k: int = 5,
    query: str = "",
) -> RerankOutput:
    """Cross-encoder rerank function matching the original interface.
    
    This can be used as a drop-in replacement for the simple rerank in stages.py
    """
    reranker = get_reranker()
    return reranker.rerank(candidates, top_k=top_k, query=query)
