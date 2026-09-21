from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET

import cairosvg
from PIL import Image

repo_root = Path(__file__).resolve().parents[3]
source_path = repo_root / "apps" / "desktop" / "build" / "icon-source.svg"
assets_dir = repo_root / "apps" / "mobile" / "assets"

svg_bytes = source_path.read_bytes()
cairosvg.svg2png(
    bytestring=svg_bytes,
    write_to=str(assets_dir / "icon.png"),
    output_width=1024,
    output_height=1024,
)

root = ET.fromstring(svg_bytes)
foreground = deepcopy(root)
for child in list(foreground):
    tag = child.tag.rsplit("}", 1)[-1]
    if tag in {"title", "rect"}:
        foreground.remove(child)

foreground_bytes = ET.tostring(foreground, encoding="utf-8", xml_declaration=True)
cairosvg.svg2png(
    bytestring=foreground_bytes,
    write_to=str(assets_dir / "android-icon-foreground.png"),
    output_width=1024,
    output_height=1024,
)

monochrome = deepcopy(foreground)
for element in monochrome.iter():
    stroke = element.get("stroke")
    fill = element.get("fill")
    if stroke and stroke != "none":
        element.set("stroke", "#FFFFFF")
    if fill and fill != "none":
        element.set("fill", "#FFFFFF")

monochrome_bytes = ET.tostring(monochrome, encoding="utf-8", xml_declaration=True)
cairosvg.svg2png(
    bytestring=monochrome_bytes,
    write_to=str(assets_dir / "android-icon-monochrome.png"),
    output_width=1024,
    output_height=1024,
)

Image.new("RGBA", (1024, 1024), (11, 37, 30, 255)).save(
    assets_dir / "android-icon-background.png"
)
Image.open(assets_dir / "icon.png").save(assets_dir / "splash-icon.png")

print("[MyMind] Mobile application icons regenerated from the desktop icon source.")
