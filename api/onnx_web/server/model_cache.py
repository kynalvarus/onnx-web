from logging import getLogger
from typing import Any, List, Tuple

logger = getLogger(__name__)


class ModelCache:
    cache: List[Tuple[str, Any, Any]]
    limit: int

    def __init__(self, limit: int) -> None:
        self.cache = []
        self.limit = limit

    def drop(self, tag: str, key: Any) -> None:
        self.cache[:] = [
            model for model in self.cache if model[0] != tag and model[1] != key
        ]

    def get(self, tag: str, key: Any) -> Any:
        for t, k, v in self.cache:
            if tag == t and key == k:
                return v

        return None

    def set(self, tag: str, key: Any, value: Any) -> None:
        for i in range(len(self.cache)):
            t, k, v = self.cache[i]
            if tag == t:
                if key != k:
                    logger.debug("Updating model cache: %s", tag)
                    self.cache[i] = (tag, key, value)
                    return

        logger.debug("Adding new model to cache: %s", tag)
        self.cache.append((tag, key, value))
        self.prune()

    def prune(self):
        total = len(self.cache)
        if total > self.limit:
            logger.info(
                "Removing models from cache, %s of %s", (total - self.limit), total
            )
            self.cache[:] = self.cache[: self.limit]
        else:
            logger.debug("Model cache below limit, %s of %s", total, self.limit)