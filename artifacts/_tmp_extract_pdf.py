from pathlib import Path
import fitz

pdf_path = Path(r"C:\Repo\09_ASCETCopilot\pi-ascet-extension-prototype\artifacts\_tmp-aeb-avh-report.pdf")
out_dir = pdf_path.parent / "_tmp-aeb-avh-pages"
out_dir.mkdir(exist_ok=True)
doc = fitz.open(pdf_path)
parts = []
print(f"pages={doc.page_count}")
for index, page in enumerate(doc):
    text = page.get_text("text")
    parts.append(f"===== PAGE {index + 1} =====\n{text}")
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    image_path = out_dir / f"page-{index + 1:02d}.png"
    pix.save(image_path)
    print(f"page={index + 1} text_chars={len(text)} image={image_path.name}")
(pdf_path.parent / "_tmp-aeb-avh-report.txt").write_text("\n".join(parts), encoding="utf-8")
