"""Configure logging to LOG_PATH (default /var/log/sdwan_cms_agent). Call init_logging() from main."""
import logging
import os

from config import LOG_PATH


def init_logging(level=logging.INFO):
    """Set up root logger with a file handler under LOG_PATH (agent.log)."""
    root = logging.getLogger()
    root.setLevel(level)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    try:
        os.makedirs(LOG_PATH, mode=0o755, exist_ok=True)
        log_file = os.path.join(LOG_PATH, "agent.log")
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setLevel(level)
        fh.setFormatter(fmt)
        root.addHandler(fh)
    except OSError:
        pass  # console only if dir not writable
