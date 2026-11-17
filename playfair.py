"""
playfair.py - Core implementation of the classical Playfair cipher.

This module is completely independent of Flask so it can be imported,
tested and reused on its own. It provides:

* Key normalisation and 5x5 matrix generation (I and J share one cell).
* Plaintext preparation (uppercase, strip non-letters, J -> I, digraph
  splitting, separator insertion between repeated letters, final padding).
* Encryption and decryption with a detailed, per-digraph trace that the
  web interface uses to explain every transformation step by step.
* An optional, user-controlled helper that removes *suspected* filler
  characters from decrypted text.

Conventions used throughout
---------------------------
* Matrix rows and columns are 0-based internally. The trace also exposes
  1-based values for display purposes.
* The default filler letter is ``X``. When ``X`` itself would be doubled
  (for example the pair "XX", or a trailing "X" that needs padding) the
  alternate filler ``Q`` is used instead, so that no digraph ever contains
  two identical letters.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# The 25-letter Playfair alphabet: J is omitted because it is merged with I.
ALPHABET = "ABCDEFGHIKLMNOPQRSTUVWXYZ"
SIZE = 5

DEFAULT_FILLER = "X"
ALTERNATE_FILLER = "Q"

ENCRYPT = "encrypt"
DECRYPT = "decrypt"

RULE_ROW = "row"
RULE_COLUMN = "column"
RULE_RECTANGLE = "rectangle"


class PlayfairError(ValueError):
    """Raised for invalid keys or invalid input text."""


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

def normalize_letters(text: str) -> str:
    """Return *text* uppercased, restricted to A-Z, with every J replaced by I."""
    return "".join(
        "I" if ch == "J" else ch
        for ch in text.upper()
        if "A" <= ch <= "Z"
    )


def normalize_key(key: str) -> str:
    """Normalise a key and drop repeated letters, keeping first occurrences."""
    unique: list[str] = []
    for ch in normalize_letters(key):
        if ch not in unique:
            unique.append(ch)
    return "".join(unique)


def _filler_for(letter: str) -> str:
    """Pick a filler that differs from *letter* (X normally, Q after an X)."""
    return ALTERNATE_FILLER if letter == DEFAULT_FILLER else DEFAULT_FILLER


# ---------------------------------------------------------------------------
# Matrix
# ---------------------------------------------------------------------------

class PlayfairMatrix:
    """The 5x5 Playfair key square built from a secret key."""

    def __init__(self, key: str):
        if not isinstance(key, str) or not key.strip():
            raise PlayfairError("A secret key is required.")

        self.key_letters = normalize_key(key)
        if not self.key_letters:
            raise PlayfairError("The key must contain at least one letter (A-Z).")

        # Key letters first, then the rest of the alphabet in order.
        remaining = "".join(ch for ch in ALPHABET if ch not in self.key_letters)
        self.sequence = self.key_letters + remaining
        assert len(self.sequence) == SIZE * SIZE and set(self.sequence) == set(ALPHABET)

        self.grid = [list(self.sequence[r * SIZE:(r + 1) * SIZE]) for r in range(SIZE)]
        self._positions = {ch: divmod(i, SIZE) for i, ch in enumerate(self.sequence)}

    def position(self, letter: str) -> tuple[int, int]:
        """Return the (row, column) of *letter* in the matrix."""
        return self._positions[letter]

    def letter_at(self, row: int, col: int) -> str:
        """Return the letter at (row, col), wrapping around the edges."""
        return self.grid[row % SIZE][col % SIZE]

    def to_dict(self) -> dict:
        return {
            "normalized_key": self.key_letters,
            "key_length": len(self.key_letters),
            "grid": self.grid,
        }


# ---------------------------------------------------------------------------
# Text preparation
# ---------------------------------------------------------------------------

@dataclass
class Digraph:
    """A pair of letters plus a note of which letters were inserted."""

    first: str
    second: str
    # For each letter: None (original), "separator" or "padding".
    inserted: list = field(default_factory=lambda: [None, None])

    @property
    def text(self) -> str:
        return self.first + self.second

    def to_dict(self) -> dict:
        return {"pair": self.text, "inserted": self.inserted}


def prepare_plaintext(text: str) -> tuple[str, list[Digraph], list[str]]:
    """
    Prepare plaintext for Playfair encryption.

    Returns ``(normalized, digraphs, notes)`` where *normalized* is the
    letters-only text, *digraphs* is the list of prepared pairs and *notes*
    is a list of human-readable remarks about what was changed.
    """
    letters = normalize_letters(text)
    if not letters:
        raise PlayfairError("The text must contain at least one letter (A-Z).")

    digraphs: list[Digraph] = []
    notes: list[str] = []
    i = 0
    while i < len(letters):
        first = letters[i]
        if i + 1 < len(letters):
            second = letters[i + 1]
            if first == second:
                # Repeated letters may not share a digraph: insert a separator
                # and let the repeated letter start the next pair.
                filler = _filler_for(first)
                digraphs.append(Digraph(first, filler, [None, "separator"]))
                notes.append(
                    f"Inserted separator '{filler}' between the repeated letters "
                    f"'{first}{first}' (pair {len(digraphs)})."
                )
                i += 1
            else:
                digraphs.append(Digraph(first, second))
                i += 2
        else:
            # Odd number of letters: pad the final single letter.
            filler = _filler_for(first)
            digraphs.append(Digraph(first, filler, [None, "padding"]))
            notes.append(
                f"Added padding '{filler}' because the final pair contained only '{first}'."
            )
            i += 1

    # Safety net: the algorithm above guarantees this, but assert it anyway.
    assert all(d.first != d.second for d in digraphs)
    return letters, digraphs, notes


def describe_normalization(original: str, normalized: str) -> list[str]:
    """Explain what normalisation removed or replaced."""
    notes = []
    removed = sum(1 for ch in original.upper() if not ("A" <= ch <= "Z"))
    if removed:
        notes.append(
            f"Removed {removed} space(s), digit(s) or punctuation character(s) "
            "not supported by the classical cipher."
        )
    j_count = original.upper().count("J")
    if j_count:
        notes.append(f"Replaced {j_count} 'J' with 'I' (I and J share one matrix cell).")
    if any("a" <= ch <= "z" for ch in original):
        notes.append("Converted lowercase letters to uppercase.")
    return notes


# ---------------------------------------------------------------------------
# Digraph transformation
# ---------------------------------------------------------------------------

def _transform_pair(matrix: PlayfairMatrix, first: str, second: str, mode: str) -> dict:
    """Apply the three Playfair rules to one digraph and return a trace step."""
    shift = 1 if mode == ENCRYPT else -1
    (r1, c1), (r2, c2) = matrix.position(first), matrix.position(second)

    if r1 == r2:
        rule = RULE_ROW
        out1_pos = (r1, (c1 + shift) % SIZE)
        out2_pos = (r2, (c2 + shift) % SIZE)
        direction = "right" if mode == ENCRYPT else "left"
        explanation = (
            f"{first} and {second} are in the same row (row {r1 + 1}). "
            f"Each letter is replaced by the letter immediately to its {direction}, "
            "wrapping around to the other end of the row when needed."
        )
    elif c1 == c2:
        rule = RULE_COLUMN
        out1_pos = ((r1 + shift) % SIZE, c1)
        out2_pos = ((r2 + shift) % SIZE, c2)
        direction = "below" if mode == ENCRYPT else "above"
        explanation = (
            f"{first} and {second} are in the same column (column {c1 + 1}). "
            f"Each letter is replaced by the letter immediately {direction} it, "
            "wrapping around to the other end of the column when needed."
        )
    else:
        rule = RULE_RECTANGLE
        out1_pos = (r1, c2)
        out2_pos = (r2, c1)
        explanation = (
            f"{first} and {second} are in different rows and columns, so they form "
            "opposite corners of a rectangle. Each letter is replaced by the letter "
            "in its own row but in the other letter's column."
        )

    out1 = matrix.letter_at(*out1_pos)
    out2 = matrix.letter_at(*out2_pos)
    return {
        "input": first + second,
        "output": out1 + out2,
        "rule": rule,
        "positions": [[r1, c1], [r2, c2]],
        "output_positions": [list(out1_pos), list(out2_pos)],
        "explanation": explanation,
        "mapping": f"{first}→{out1}, {second}→{out2}",
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def encrypt(text: str, key: str) -> dict:
    """Encrypt *text* with *key* and return the result with a full trace."""
    if not isinstance(text, str) or not text.strip():
        raise PlayfairError("Please enter some text to encrypt.")
    matrix = PlayfairMatrix(key)

    normalized, digraphs, prep_notes = prepare_plaintext(text)
    steps = [_transform_pair(matrix, d.first, d.second, ENCRYPT) for d in digraphs]
    ciphertext = "".join(step["output"] for step in steps)

    return {
        "operation": ENCRYPT,
        "original": text,
        "normalized": normalized,
        "prepared": "".join(d.text for d in digraphs),
        "digraphs": [d.to_dict() for d in digraphs],
        "steps": steps,
        "notes": describe_normalization(text, normalized) + prep_notes,
        "result": ciphertext,
        "result_grouped": " ".join(step["output"] for step in steps),
        "matrix": matrix.to_dict(),
    }


def find_suspected_fillers(plaintext: str) -> list[int]:
    """
    Return indices of characters in decrypted *plaintext* that look like
    fillers added during preparation:

    * a separator: an X (or Q between two X's) in the second position of a
      digraph, sitting between two identical letters (e.g. "EXE" from "EE");
    * padding: a trailing X (or a trailing Q after an X).

    These are only *suspected* - a genuine X in the message can match the
    same pattern - which is why removal is left to the user.
    """
    suspects = []
    for i in range(1, len(plaintext) - 1, 2):  # second letter of each pair
        prev_ch, ch, next_ch = plaintext[i - 1], plaintext[i], plaintext[i + 1]
        if prev_ch == next_ch and ch == _filler_for(prev_ch):
            suspects.append(i)
    if len(plaintext) >= 2:
        last = len(plaintext) - 1
        if plaintext[last] == _filler_for(plaintext[last - 1]):
            suspects.append(last)
    return suspects


def remove_suspected_fillers(plaintext: str) -> str:
    """Remove the characters reported by :func:`find_suspected_fillers`."""
    drop = set(find_suspected_fillers(plaintext))
    return "".join(ch for i, ch in enumerate(plaintext) if i not in drop)


def decrypt(text: str, key: str, remove_fillers: bool = False) -> dict:
    """Decrypt *text* with *key* and return the result with a full trace."""
    if not isinstance(text, str) or not text.strip():
        raise PlayfairError("Please enter some ciphertext to decrypt.")
    matrix = PlayfairMatrix(key)

    normalized = normalize_letters(text)
    if not normalized:
        raise PlayfairError("The ciphertext must contain at least one letter (A-Z).")
    if len(normalized) % 2:
        raise PlayfairError(
            f"Invalid ciphertext: it contains {len(normalized)} letters. "
            "Playfair ciphertext always has an even number of letters."
        )

    pairs = [normalized[i:i + 2] for i in range(0, len(normalized), 2)]
    for index, pair in enumerate(pairs, start=1):
        if pair[0] == pair[1]:
            raise PlayfairError(
                f"Invalid ciphertext: pair {index} ('{pair}') contains two identical "
                "letters, which the Playfair cipher can never produce."
            )

    steps = [_transform_pair(matrix, p[0], p[1], DECRYPT) for p in pairs]
    raw_plaintext = "".join(step["output"] for step in steps)
    suspects = find_suspected_fillers(raw_plaintext)
    cleaned = remove_suspected_fillers(raw_plaintext)

    notes = describe_normalization(text, normalized)
    notes.append(
        "Decrypted text may contain filler letters: separators inserted between "
        "repeated letters and a padding letter at the end. They are not removed "
        "automatically because X (or Q) may be part of the original message."
    )

    return {
        "operation": DECRYPT,
        "original": text,
        "normalized": normalized,
        "prepared": normalized,
        "digraphs": [{"pair": p, "inserted": [None, None]} for p in pairs],
        "steps": steps,
        "notes": notes,
        "raw_result": raw_plaintext,
        "cleaned_result": cleaned,
        "suspected_fillers": suspects,
        "fillers_removed": bool(remove_fillers),
        "result": cleaned if remove_fillers else raw_plaintext,
        "result_grouped": " ".join(step["output"] for step in steps),
        "matrix": matrix.to_dict(),
    }


if __name__ == "__main__":  # Quick manual check: python playfair.py
    demo = encrypt("HIDE THE GOLD IN THE TREE STUMP", "PLAYFAIR EXAMPLE")
    for row in demo["matrix"]["grid"]:
        print(" ".join(row))
    print("Ciphertext:", demo["result"])
    print("Decrypted: ", decrypt(demo["result"], "PLAYFAIR EXAMPLE")["raw_result"])
