from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any

SECRET = os.getenv("SMART_FINANCE_SECRET", "smart-finance-local-secret-change-me")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 210_000


def _standard_b64encode(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def _standard_b64decode(value: str) -> bytes:
    return base64.b64decode(value.encode(), validate=True)


def hash_secret(value: str) -> str:
    """Gera hashes compatíveis entre PC e APK.

    O APK sempre utilizou PBKDF2-HMAC-SHA256. A partir da 0.5.2 o backend
    passa a gerar o mesmo formato, mantendo leitura dos hashes scrypt criados
    pelas versões desktop anteriores.
    """
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        value.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=32,
    )
    return f"pbkdf2${PBKDF2_ITERATIONS}${_standard_b64encode(salt)}${_standard_b64encode(derived)}"


def secret_hash_algorithm(encoded: str | None) -> str | None:
    if not encoded:
        return None
    return encoded.split("$", 1)[0].strip().lower() or None


def needs_rehash(encoded: str | None) -> bool:
    """Indica hash legado que deve ser atualizado após login válido."""
    if secret_hash_algorithm(encoded) != "pbkdf2":
        return True
    try:
        _algorithm, iterations_text, _salt_b64, _digest_b64 = encoded.split("$", 3)
        return int(iterations_text) != PBKDF2_ITERATIONS
    except (ValueError, TypeError):
        return True


def verify_secret(value: str, encoded: str | None) -> bool:
    """Valida hashes PBKDF2 (APK/0.5.2+) e scrypt (desktop legado)."""
    if not encoded:
        return False
    try:
        algorithm = secret_hash_algorithm(encoded)

        if algorithm == "pbkdf2":
            _algorithm, iterations_text, salt_b64, digest_b64 = encoded.split("$", 3)
            iterations = int(iterations_text)
            if iterations <= 0 or iterations > 5_000_000:
                return False
            salt = _standard_b64decode(salt_b64)
            expected = _standard_b64decode(digest_b64)
            actual = hashlib.pbkdf2_hmac(
                "sha256",
                value.encode("utf-8"),
                salt,
                iterations,
                dklen=len(expected),
            )
            return hmac.compare_digest(actual, expected)

        if algorithm == "scrypt":
            _algorithm, salt_b64, digest_b64 = encoded.split("$", 2)
            salt = base64.urlsafe_b64decode(salt_b64.encode())
            expected = base64.urlsafe_b64decode(digest_b64.encode())
            actual = hashlib.scrypt(
                value.encode("utf-8"),
                salt=salt,
                n=2**14,
                r=8,
                p=1,
                dklen=len(expected),
            )
            return hmac.compare_digest(actual, expected)

        return False
    except (ValueError, TypeError, binascii.Error):
        return False


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(user_id: int, role: str) -> str:
    payload = {"sub": user_id, "role": role, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64encode(signature)}"


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64decode(signature)):
            return None
        payload = json.loads(_b64decode(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
