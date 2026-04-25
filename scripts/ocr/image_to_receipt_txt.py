from pathlib import Path
import sys
import cv2
import pytesseract

DATA_INPUT_DIR = Path("data/input")
DATA_GENERATED_DIR = Path("data/generated")
DEBUG_DIR = DATA_GENERATED_DIR / "ocr_debug"
OUTPUT_PATH = DATA_INPUT_DIR / "receipt.txt"


def usage() -> None:
    print("Usage:")
    print("  python scripts/ocr/image_to_receipt_txt.py <image_path>")
    print("\nExample:")
    print("  python scripts/ocr/image_to_receipt_txt.py training/sroie/SROIE2019/train/img/X51006555072.jpg")


def score_ocr_text(text: str) -> int:
    """
    Lightweight visibility score for comparing OCR variants.
    Longer is not always better, so this rewards price-like text and useful lines too.
    """
    stripped = text.strip()
    lines = [line.strip() for line in stripped.splitlines() if line.strip()]
    price_like_count = sum(1 for line in lines if any(char.isdigit() for char in line) and ("." in line or "," in line))
    alpha_count = sum(1 for char in stripped if char.isalpha())
    digit_count = sum(1 for char in stripped if char.isdigit())

    return len(stripped) + (price_like_count * 75) + (alpha_count // 4) + (digit_count * 2)


def write_debug_outputs(results: list[dict[str, object]]) -> None:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    summary_lines = [
        "OCR variant quality report",
        "==========================",
        "",
    ]

    for result in results:
        name = str(result["name"])
        text = str(result["text"])
        debug_file = DEBUG_DIR / f"{name}.txt"
        debug_file.write_text(text, encoding="utf-8")

        summary_lines.append(
            f"{name}: score={result['score']} chars={result['chars']} lines={result['lines']} price_like_lines={result['price_like_lines']}"
        )

    (DEBUG_DIR / "summary.txt").write_text("\n".join(summary_lines) + "\n", encoding="utf-8")


def main() -> None:
    if len(sys.argv) < 2:
        usage()
        sys.exit(0)

    image_path = Path(sys.argv[1])

    if not image_path.exists():
        print(f"Could not find image: {image_path}")
        sys.exit(1)

    DATA_INPUT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_GENERATED_DIR.mkdir(parents=True, exist_ok=True)

    img = cv2.imread(str(image_path))

    if img is None:
        print("Failed to load image.")
        sys.exit(1)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    variants = {
        "raw": img,
        "gray": gray,
        "threshold": cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1],
        "adaptive": cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        ),
    }

    results: list[dict[str, object]] = []

    print("\nOCR quality report:")

    for name, image in variants.items():
        text = pytesseract.image_to_string(image)
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        price_like_lines = sum(
            1 for line in lines if any(char.isdigit() for char in line) and ("." in line or "," in line)
        )
        score = score_ocr_text(text)

        result = {
            "name": name,
            "text": text,
            "score": score,
            "chars": len(text.strip()),
            "lines": len(lines),
            "price_like_lines": price_like_lines,
        }
        results.append(result)

        print(
            f"- {name}: score={score}, chars={result['chars']}, lines={result['lines']}, price-like lines={price_like_lines}"
        )

    results.sort(key=lambda result: int(result["score"]), reverse=True)
    best = results[0]

    write_debug_outputs(results)
    OUTPUT_PATH.write_text(str(best["text"]), encoding="utf-8")

    print(f"\nSelected OCR mode: {best['name']}")
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Saved OCR debug files in {DEBUG_DIR}/")
    print("\nNext run:")
    print("  npm run parse")


if __name__ == "__main__":
    main()
