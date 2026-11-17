"""
Tests for the Playfair cipher core and the Flask API.

Run from the project root with:  python -m unittest discover -s tests -v
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import playfair  # noqa: E402
from app import app  # noqa: E402
from playfair import PlayfairError, PlayfairMatrix, decrypt, encrypt  # noqa: E402

KEY = "PLAYFAIR EXAMPLE"


class MatrixTests(unittest.TestCase):
    def test_standard_example_matrix(self):
        self.assertEqual(PlayfairMatrix(KEY).grid, [
            list("PLAYF"),
            list("IREXM"),
            list("BCDGH"),
            list("KNOQS"),
            list("TUVWZ"),
        ])

    def test_every_letter_exactly_once_and_no_j(self):
        for key in ["PLAYFAIR EXAMPLE", "jjjj", "Zebra 2024!", "monarchy", "A"]:
            sequence = "".join(PlayfairMatrix(key).sequence)
            self.assertEqual(len(sequence), 25)
            self.assertEqual(set(sequence), set(playfair.ALPHABET))
            self.assertNotIn("J", sequence)

    def test_key_normalization(self):
        self.assertEqual(playfair.normalize_key("Hello, World! jig"), "HELOWRDIG")

    def test_invalid_keys(self):
        for key in ["", "   ", "1234 !?"]:
            with self.assertRaises(PlayfairError):
                PlayfairMatrix(key)


class PreparationTests(unittest.TestCase):
    def pairs(self, text):
        return [d.text for d in playfair.prepare_plaintext(text)[1]]

    def test_repeated_letters_get_separator(self):
        self.assertEqual(self.pairs("BALLOON"), ["BA", "LX", "LO", "ON"])

    def test_odd_length_is_padded(self):
        self.assertEqual(self.pairs("CAT"), ["CA", "TX"])

    def test_single_character(self):
        self.assertEqual(self.pairs("a"), ["AX"])

    def test_x_fillers_use_q(self):
        self.assertEqual(self.pairs("X"), ["XQ"])
        self.assertEqual(self.pairs("XXA"), ["XQ", "XA"])

    def test_j_replaced_and_punctuation_removed(self):
        self.assertEqual(self.pairs("Jo, jo!"), ["IO", "IO"])

    def test_no_pair_has_identical_letters(self):
        for text in ["AAAAAAA", "XXXXX", "BOOKKEEPER", "MISSISSIPPI"]:
            for pair in self.pairs(text):
                self.assertNotEqual(pair[0], pair[1])


class CipherTests(unittest.TestCase):
    def test_standard_example(self):
        result = encrypt("HIDE THE GOLD IN THE TREE STUMP", KEY)
        self.assertEqual(result["result"], "BMODZBXDNABEKUDMUIXMMOUVIF")

    def test_standard_example_decryption(self):
        result = decrypt("BMODZBXDNABEKUDMUIXMMOUVIF", KEY)
        self.assertEqual(result["raw_result"], "HIDETHEGOLDINTHETREXESTUMP")

    def test_rules_are_identified(self):
        # Matrix rows: PLAYF / IREXM / BCDGH / KNOQS / TUVWZ
        steps = encrypt("PL", KEY)["steps"] + encrypt("PI", KEY)["steps"] + encrypt("HI", KEY)["steps"]
        self.assertEqual([s["rule"] for s in steps], ["row", "column", "rectangle"])
        self.assertEqual([s["output"] for s in steps], ["LA", "IB", "BM"])

    def test_wrap_around(self):
        self.assertEqual(encrypt("FP", KEY)["result"], "PL")   # row wraps right
        self.assertEqual(encrypt("TP", KEY)["result"], "PI")   # column wraps down
        self.assertEqual(decrypt("PL", KEY)["raw_result"], "FP")
        self.assertEqual(decrypt("PI", KEY)["raw_result"], "TP")

    def test_round_trip_with_different_keys(self):
        texts = ["Attack at dawn!", "The quick brown fox jumps over the lazy dog",
                 "balloon", "x", "Meet me at 10:30, by the old oak tree."]
        for key in ["MONARCHY", "keyword", "Cryptography 101", "ZZZ"]:
            for text in texts:
                enc = encrypt(text, key)
                dec = decrypt(enc["result"], key)
                self.assertEqual(dec["raw_result"], enc["prepared"], (key, text))

    def test_changing_key_changes_ciphertext(self):
        self.assertNotEqual(encrypt("HELLO WORLD", "MONARCHY")["result"],
                            encrypt("HELLO WORLD", "KEYWORD")["result"])

    def test_filler_removal(self):
        enc = encrypt("BALLOON CAT", "MONARCHY")  # BA LX LO ON CA TX
        dec = decrypt(enc["result"], "MONARCHY", remove_fillers=True)
        self.assertEqual(dec["raw_result"], "BALXLOONCATX")
        self.assertEqual(dec["suspected_fillers"], [3, 11])
        self.assertEqual(dec["result"], "BALLOONCAT")

    def test_genuine_x_is_kept_by_default(self):
        dec = decrypt(encrypt("TAXI", KEY)["result"], KEY)
        self.assertEqual(dec["result"], "TAXI")

    def test_invalid_inputs(self):
        with self.assertRaises(PlayfairError):
            encrypt("   ", KEY)
        with self.assertRaises(PlayfairError):
            encrypt("123 !!!", KEY)
        with self.assertRaises(PlayfairError):
            decrypt("ABC", KEY)          # odd length
        with self.assertRaises(PlayfairError):
            decrypt("AABC", KEY)         # identical letters in a pair
        with self.assertRaises(PlayfairError):
            decrypt("", KEY)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_index(self):
        self.assertEqual(self.client.get("/").status_code, 200)

    def test_matrix_endpoint(self):
        data = self.client.post("/api/matrix", json={"key": KEY}).get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["grid"][0], list("PLAYF"))

    def test_encrypt_and_decrypt_endpoints(self):
        enc = self.client.post("/api/encrypt", json={"key": KEY, "text": "Hide the gold in the tree stump"}).get_json()
        self.assertEqual(enc["result"], "BMODZBXDNABEKUDMUIXMMOUVIF")
        dec = self.client.post("/api/decrypt", json={"key": KEY, "text": "BM OD ZB XD NA BE KU DM UI XM MO UV IF"}).get_json()
        self.assertEqual(dec["result"], "HIDETHEGOLDINTHETREXESTUMP")

    def test_missing_key_and_empty_text(self):
        response = self.client.post("/api/encrypt", json={"key": "", "text": "hello"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("key", response.get_json()["error"].lower())
        response = self.client.post("/api/decrypt", json={"key": KEY, "text": ""})
        self.assertEqual(response.status_code, 400)

    def test_bad_payload(self):
        self.assertEqual(self.client.post("/api/encrypt", data="nope").status_code, 400)
        self.assertEqual(self.client.post("/api/encrypt", json={"key": 5, "text": "a"}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
