"""
app.py - Flask web server for the Playfair Cipher application.

The server is stateless: the browser keeps the active key and sends it with
each request. All cryptographic work is done by the ``playfair`` module.

Endpoints
---------
GET  /              Single-page user interface.
POST /api/matrix    {"key"}                          -> generated 5x5 matrix
POST /api/encrypt   {"key", "text"}                  -> ciphertext + trace
POST /api/decrypt   {"key", "text", "remove_fillers"} -> plaintext + trace

Run with:  python app.py   (then open http://127.0.0.1:5000)
"""

import mimetypes

from flask import Flask, jsonify, render_template, request

import playfair
from playfair import PlayfairError

# Windows sometimes maps .js to "text/plain", which browsers refuse for
# JavaScript modules. Force the correct type.
mimetypes.add_type("text/javascript", ".js")

# Keep requests reasonably small: the step-by-step trace grows with the text.
MAX_KEY_LENGTH = 200
MAX_TEXT_LENGTH = 5000

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024  # 64 KB request body limit


def _get_field(payload: dict, name: str, max_length: int, label: str) -> str:
    """Read a string field from the JSON payload and validate its length."""
    value = payload.get(name, "")
    if not isinstance(value, str):
        raise PlayfairError(f"The {label} must be text.")
    if len(value) > max_length:
        raise PlayfairError(f"The {label} is too long (maximum {max_length} characters).")
    return value


def _json_payload() -> dict:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise PlayfairError("Invalid request: expected a JSON object.")
    return payload


def _require_key(payload: dict) -> str:
    key = _get_field(payload, "key", MAX_KEY_LENGTH, "key")
    if not key.strip():
        raise PlayfairError("No key configured. Save a secret key before continuing.")
    return key


@app.errorhandler(PlayfairError)
def handle_playfair_error(error: PlayfairError):
    return jsonify({"ok": False, "error": str(error)}), 400


@app.errorhandler(413)
def handle_too_large(_error):
    return jsonify({"ok": False, "error": "The request is too large."}), 413


@app.errorhandler(500)
def handle_server_error(_error):
    return jsonify({"ok": False, "error": "Unexpected server error. Please try again."}), 500


@app.get("/")
def index():
    return render_template("index.html", max_text_length=MAX_TEXT_LENGTH)


@app.post("/api/matrix")
def api_matrix():
    payload = _json_payload()
    matrix = playfair.PlayfairMatrix(_require_key(payload))
    return jsonify({"ok": True, **matrix.to_dict()})


@app.post("/api/encrypt")
def api_encrypt():
    payload = _json_payload()
    key = _require_key(payload)
    text = _get_field(payload, "text", MAX_TEXT_LENGTH, "text")
    return jsonify({"ok": True, **playfair.encrypt(text, key)})


@app.post("/api/decrypt")
def api_decrypt():
    payload = _json_payload()
    key = _require_key(payload)
    text = _get_field(payload, "text", MAX_TEXT_LENGTH, "ciphertext")
    remove_fillers = bool(payload.get("remove_fillers", False))
    return jsonify({"ok": True, **playfair.decrypt(text, key, remove_fillers)})


if __name__ == "__main__":
    app.run(debug=True)
