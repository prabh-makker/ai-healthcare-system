"""File-based JSON storage utility for persistent data structures."""

import json
import logging
from typing import Any, Dict
from pathlib import Path

logger = logging.getLogger(__name__)


class JSONFileStorage:
    """Persist and restore data structures to/from JSON files."""

    def __init__(self, filepath: str):
        """
        Initialize storage with file path.

        Args:
            filepath: Path to JSON file for persistence
        """
        self.filepath = filepath

    def load(self) -> Dict[str, Any]:
        """
        Load data from disk.

        Returns:
            Dict containing loaded data, or empty dict if file doesn't exist or is corrupted

        Logs errors but doesn't raise exceptions to allow graceful degradation.
        """
        try:
            if Path(self.filepath).exists():
                with open(self.filepath, 'r') as f:
                    data = json.load(f)
                    logger.info(f"Loaded data from {self.filepath}")
                    return data
        except json.JSONDecodeError as e:
            logger.error(f"File corrupted: {self.filepath} - {e}")
        except IOError as e:
            logger.error(f"Cannot read file: {self.filepath} - {e}")

        return {}

    def save(self, data: Dict[str, Any]) -> bool:
        """
        Save data to disk.

        Args:
            data: Dict to persist

        Returns:
            True if successful, False otherwise
        """
        try:
            with open(self.filepath, 'w') as f:
                json.dump(data, f)
            return True
        except Exception as e:
            logger.error(f"Cannot save file: {self.filepath} - {e}")
            return False
