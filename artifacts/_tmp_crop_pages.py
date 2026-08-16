from pathlib import Path
import fitz

pdf = Path(r"C:\Repo\09_ASCETCopilot\pi-ascet-extension-prototype\artifacts\_tmp-aeb-avh-report.pdf")
out = pdf.parent / "_tmp-aeb-avh-pages"
doc = fitz.open(pdf)
page = doc[2]
for index, box in enumerate([(40, 510, 780, 790), (200, 500, 620, 770)], 1):
    pix = page.get_pixmap(matrix=fitz.Matrix(5, 5), clip=fitz.Rect(*box), alpha=False)
    target = out / f"page-03-apb-gear-{index}.png"
    pix.save(target)
    print(target)
