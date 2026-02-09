"""Agent config: log path and future settings. Override via environment."""
import os

# Log file directory (agent writes e.g. agent.log under this path)
LOG_PATH = os.environ.get("LOG_PATH", "/var/log/sdwan_cms_agent")
