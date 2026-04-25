# Tests

Run from the project root:

```bash
python tests/run_tests.py
```

## What this tests

1. **Restaurant text receipt parsing**
   - Copies `tests/fixtures/receipt_restaurant.txt` into an isolated temp directory as `receipt.txt`.
   - Runs `npx tsx receipt_parser.ts`.
   - Verifies `parsed_items.json` is created.
   - Verifies the parsed subtotal is `$210.60`.
   - Verifies quantity rows split into 20 individual items.

2. **Image OCR extraction**
   - Copies `tests/fixtures/sroie_sample.png` into an isolated temp directory.
   - Runs `python image_to_receipt_txt.py <image>`.
   - Verifies `receipt.txt` is created.
   - Verifies `ocr_debug/summary.txt` and OCR variant debug files are created.
   - Verifies the OCR quality report and selected OCR mode are printed.

The image OCR test skips automatically if Tesseract or the Python OCR packages are not installed.
