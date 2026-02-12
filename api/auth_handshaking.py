"""
Handshaking: GUI sends SHA256(handshaking_token + random_number) and random_number.
API validates by computing SHA256(token + random_number) and comparing with received hash.
"""
import hashlib

from fastapi import Header, HTTPException

from config import HANDSHAKING_TOKEN


def validate_handshaking(
    x_api_hash: str | None = Header(None, alias="X-API-Hash"),
    x_api_random: str | None = Header(None, alias="X-API-Random"),
) -> None:
    """Raise 401 if handshaking token is set and request hash does not match SHA256(token + random)."""
    if not HANDSHAKING_TOKEN:
        return
    if not x_api_random or not x_api_hash:
        raise HTTPException(status_code=401, detail="Missing X-API-Hash or X-API-Random")
    expected = hashlib.sha256((HANDSHAKING_TOKEN + x_api_random).encode("utf-8")).hexdigest()
    if not (x_api_hash.strip().lower() == expected.lower()):
        raise HTTPException(status_code=401, detail="Invalid handshaking hash")


def compute_hash(token: str, random_value: str) -> str:
    """Compute SHA256(token + random_value) hex digest. Used by GUI."""
    return hashlib.sha256((token + random_value).encode("utf-8")).hexdigest()
