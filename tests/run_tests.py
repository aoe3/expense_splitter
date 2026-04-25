from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

PROJECT_FILES = [
    "receipt_parser.ts",
    "image_to_receipt_txt.py",
]


def run(cmd: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=check,
        timeout=120,
    )


def copy_project_files(target_dir: Path) -> None:
    for filename in PROJECT_FILES:
        shutil.copy(PROJECT_ROOT / filename, target_dir / filename)


def assert_equal(actual: object, expected: object, message: str) -> None:
    if actual != expected:
        raise AssertionError(f"{message}\nExpected: {expected!r}\nActual:   {actual!r}")


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def test_restaurant_text_receipt() -> None:
    """Receipt text -> receipt_parser.ts -> parsed_items.json."""
    with tempfile.TemporaryDirectory(prefix="expense_splitter_text_test_") as tmp:
        workdir = Path(tmp)
        copy_project_files(workdir)
        shutil.copy(FIXTURES_DIR / "receipt_restaurant.txt", workdir / "receipt.txt")

        result = run(["npx", "--yes", "tsx", "receipt_parser.ts"], cwd=workdir)
        parsed_path = workdir / "parsed_items.json"

        assert_true(parsed_path.exists(), "parsed_items.json should be created for itemized restaurant text.")
        assert_true("Parsed subtotal: $210.60" in result.stdout, "Restaurant subtotal should parse as $210.60.")
        assert_true(not (workdir / "receipt_summary.json").exists(), "receipt_summary.json should not be created for itemized receipt.")

        items = json.loads(parsed_path.read_text(encoding="utf-8"))
        assert_equal(len(items), 20, "Restaurant fixture should split quantities into 20 individual items.")

        names = [item["name"] for item in items]
        assert_true("MODELO 1/3" in names, "Quantity split should include MODELO 1/3.")
        assert_true("AGUA BOTELLA 3/3" in names, "Quantity split should include AGUA BOTELLA 3/3.")


def test_image_ocr_receipt() -> None:
    """Receipt image -> image_to_receipt_txt.py -> receipt.txt + OCR debug output."""
    if shutil.which("tesseract") is None:
        print("SKIP image OCR test: tesseract is not installed.")
        return

    try:
        import cv2  # noqa: F401
        import pytesseract  # noqa: F401
    except Exception as error:
        print(f"SKIP image OCR test: OCR Python packages missing ({error}).")
        return

    with tempfile.TemporaryDirectory(prefix="expense_splitter_image_test_") as tmp:
        workdir = Path(tmp)
        copy_project_files(workdir)
        image_path = workdir / "sroie_sample.png"
        shutil.copy(FIXTURES_DIR / "sroie_sample.png", image_path)

        result = run([sys.executable, "image_to_receipt_txt.py", str(image_path)], cwd=workdir)

        receipt_path = workdir / "receipt.txt"
        debug_dir = workdir / "ocr_debug"
        summary_path = debug_dir / "summary.txt"

        assert_true(receipt_path.exists(), "image_to_receipt_txt.py should create receipt.txt.")
        receipt_text = receipt_path.read_text(encoding="utf-8").strip()
        assert_true(len(receipt_text) > 50, "OCR receipt.txt should contain non-trivial text.")
        assert_true(debug_dir.exists(), "OCR debug directory should be created.")
        assert_true(summary_path.exists(), "OCR debug summary should be created.")
        assert_true("OCR quality report" in result.stdout, "OCR command should print quality report.")
        assert_true("Selected OCR mode" in result.stdout, "OCR command should print selected mode.")

        debug_files = sorted(path.name for path in debug_dir.glob("*.txt"))
        for expected_file in ["raw.txt", "gray.txt", "threshold.txt", "adaptive.txt", "summary.txt"]:
            assert_true(expected_file in debug_files, f"Expected OCR debug file: {expected_file}")


def main() -> None:
    tests = [
        ("restaurant text receipt parsing", test_restaurant_text_receipt),
        ("image OCR receipt extraction", test_image_ocr_receipt),
    ]

    passed = 0

    for name, test in tests:
        print(f"\nRunning: {name}")
        try:
            test()
        except subprocess.CalledProcessError as error:
            print(error.stdout)
            raise
        print(f"PASS: {name}")
        passed += 1

    print(f"\nAll done: {passed}/{len(tests)} tests passed.")


if __name__ == "__main__":
    main()
