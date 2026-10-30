#!/usr/bin/env python3
"""
update_site.py - add new artwork to iansheridan.art in one step.

What it does (safe to run as many times as you like):

  1. Looks in your art folder (one sub-folder per series, e.g. "My hands").
  2. Makes a web-sized copy of every new or changed picture in
     images/processed/<series>/  (fits inside 1024 x 1024; animated GIFs
     are copied as-is so they keep moving).
  3. Makes a small page for every picture that does not have one yet, in
     _gallery/.  New pages start as "for_sale: false", so nothing goes on
     sale until you say so.
  4. Optionally turns the Buy button on or off (--sell / --unsell) and
     optionally builds the site to check it (--build).

It never deletes anything and never overwrites a page you already have.

Examples:
  python3 scripts/update_site.py
  python3 scripts/update_site.py --art-folder ~/Desktop/new_art
  python3 scripts/update_site.py --sell "My hands"
  python3 scripts/update_site.py --unsell my-hands-feet
  python3 scripts/update_site.py --build

See scripts/README.md for the plain-English guide.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - friendly message for a missing install
    sys.exit(
        "Pillow is not installed. Run this once, then try again:\n"
        "    python3 -m pip install -r requirements.txt"
    )

# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------

# Where Ian keeps the full-size art on his Mac (iCloud Drive).
DEFAULT_ART_FOLDER = (
    "/Users/iansheridan/Library/Mobile Documents/com~apple~CloudDocs/Documents/ians_art"
)
# You can also set this instead of typing --art-folder every time.
ART_FOLDER_ENV = "IAN_ART_FOLDER"

REPO_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = REPO_ROOT / "images" / "processed"  # what the website shows
GALLERY_DIR = REPO_ROOT / "_gallery"                # one page per piece

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_SIZE = (1024, 1024)  # resize to fit inside this box
JPEG_QUALITY = 85


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------

def slugify(text):
    """'My hands / Golden_Hands' -> 'my-hands-golden-hands'"""
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "piece"


def title_from_filename(path):
    """'Golden_Hands.jpg' -> 'Golden Hands'"""
    title = Path(path).stem.replace("_", " ")
    title = re.sub(r"\s+", " ", title).strip()
    return title or "Untitled"


def yaml_string(text):
    """Quote a string safely for YAML front matter."""
    escaped = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def is_image(path):
    return path.is_file() and path.suffix.lower() in IMAGE_EXTS and not path.name.startswith(".")


def site_url_for(path):
    """images/processed/My hands/x.jpg -> /images/processed/My hands/x.jpg"""
    return "/" + path.relative_to(REPO_ROOT).as_posix()


# --------------------------------------------------------------------------
# Step 1: resize pictures
# --------------------------------------------------------------------------

def resize_one(src, dest):
    """Write a web-sized copy of src to dest. Writes to a temp file first,
    so a crash never leaves a half-written picture behind."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(suffix=dest.suffix, dir=dest.parent)
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        if src.suffix.lower() == ".gif":
            # Pillow would flatten an animated GIF to one frame; copy it instead.
            shutil.copyfile(src, tmp)
        else:
            with Image.open(src) as img:
                img = ImageOps.exif_transpose(img)  # respect phone/iPad rotation
                img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)  # was Image.ANTIALIAS
                if dest.suffix.lower() in (".jpg", ".jpeg"):
                    if img.mode not in ("RGB", "L"):
                        img = img.convert("RGB")
                    img.save(tmp, "JPEG", optimize=True, quality=JPEG_QUALITY)
                elif dest.suffix.lower() == ".png":
                    img.save(tmp, "PNG", optimize=True)
                else:
                    img.save(tmp, quality=JPEG_QUALITY)
        os.replace(tmp, dest)
    finally:
        if tmp.exists():
            tmp.unlink()


def update_images(art_folder, dry_run=False):
    """Resize every picture in art_folder/<series>/ that is new or changed.
    Returns (made, skipped, problems)."""
    made, skipped, problems = 0, 0, []

    loose = [p.name for p in art_folder.iterdir() if is_image(p)]
    if loose:
        print(f"Note: {len(loose)} picture(s) sit loose in the art folder, not in a series "
              "folder, so they were skipped. Move them into a folder (e.g. 'Z-ROOT').")

    for series in sorted(p for p in art_folder.iterdir() if p.is_dir() and not p.name.startswith(".")):
        for src in sorted(p for p in series.iterdir() if is_image(p)):
            dest = PROCESSED_DIR / series.name / src.name
            if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
                skipped += 1  # already up to date
                continue
            if dry_run:
                print(f"  would resize: {series.name}/{src.name}")
                made += 1
                continue
            try:
                resize_one(src, dest)
                made += 1
                print(f"  resized: {series.name}/{src.name}")
            except Exception as err:  # keep going; report at the end
                problems.append(f"{series.name}/{src.name}: {err}")
    return made, skipped, problems


# --------------------------------------------------------------------------
# Step 2: one page per piece in _gallery/
# --------------------------------------------------------------------------

FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*(\n|\Z)", re.S)


def read_front_matter(path):
    match = FRONT_MATTER_RE.match(path.read_text(encoding="utf-8"))
    return match.group(1) if match else ""


def existing_pieces():
    """Return (pages, used_image_urls, highest_position)."""
    pages, used, highest = [], set(), 0
    for page in sorted(GALLERY_DIR.glob("*.html")) + sorted(GALLERY_DIR.glob("*.md")):
        fm = read_front_matter(page)
        pages.append(page)
        for url in re.findall(r'url:\s*"?([^"\n]+?)"?\s*$', fm, re.M):
            used.add(url.strip())
        pos = re.search(r"^position:\s*(\d+)", fm, re.M)
        if pos:
            highest = max(highest, int(pos.group(1)))
    return pages, used, highest


def make_page_text(title, series, position, image_url):
    return (
        "---\n"
        "layout: piece\n"
        f"title: {yaml_string(title)}\n"
        f"category: {yaml_string(series)}\n"
        f"position: {position}\n"
        "images:\n"
        f"  - url: {yaml_string(image_url)}\n"
        "# for_sale: true shows a Buy button (print sizes and prices come from\n"
        "# _data/products.json). Set to false to hide it.\n"
        "for_sale: false\n"
        "---\n"
    )


def create_missing_pages(dry_run=False):
    """Create a _gallery page for every processed picture that has none."""
    GALLERY_DIR.mkdir(exist_ok=True)
    pages, used, position = existing_pieces()
    taken = {p.stem for p in pages}
    created = []

    if not PROCESSED_DIR.exists():
        return created

    for series in sorted(p for p in PROCESSED_DIR.iterdir() if p.is_dir()):
        for img in sorted(p for p in series.iterdir() if is_image(p)):
            url = site_url_for(img)
            if url in used:
                continue
            slug = slugify(f"{series.name}-{img.stem}")
            if slug in taken:  # e.g. M_Mini.jpg and M_Mini.png
                slug = slugify(f"{slug}-{img.suffix}")
            n = 2
            base = slug
            while slug in taken:
                slug = f"{base}-{n}"
                n += 1
            position += 1
            page = GALLERY_DIR / f"{slug}.html"
            if not dry_run:
                page.write_text(
                    make_page_text(title_from_filename(img), series.name, position, url),
                    encoding="utf-8",
                )
            taken.add(slug)
            used.add(url)
            created.append(page.name)
    return created


# --------------------------------------------------------------------------
# Step 3: turn Buy buttons on/off
# --------------------------------------------------------------------------

def set_for_sale(names, value, dry_run=False):
    """names: page names (e.g. 'my-hands-feet') or series names (e.g. 'My hands').
    Returns list of changed page names and list of names that matched nothing."""
    wanted = {n.strip().lower() for n in names}
    matched_names, changed = set(), []
    for page in sorted(GALLERY_DIR.glob("*.html")):
        text = page.read_text(encoding="utf-8")
        match = FRONT_MATTER_RE.match(text)
        if not match:
            continue
        fm = match.group(1)
        cat = re.search(r'^category:\s*"?(.*?)"?\s*$', fm, re.M)
        keys = {page.stem.lower()}
        if cat:
            keys.add(cat.group(1).strip().lower())
        hits = keys & wanted
        if not hits:
            continue
        matched_names |= hits
        line = f"for_sale: {'true' if value else 'false'}"
        if re.search(r"^for_sale:.*$", fm, re.M):
            new_fm = re.sub(r"^for_sale:.*$", line, fm, count=1, flags=re.M)
        else:
            new_fm = fm + "\n" + line
        if new_fm != fm:
            if not dry_run:
                page.write_text(text[: match.start(1)] + new_fm + text[match.end(1):], encoding="utf-8")
            changed.append(page.stem)
    return changed, sorted(wanted - matched_names)


# --------------------------------------------------------------------------
# Step 4: optional local build
# --------------------------------------------------------------------------

def build_site():
    if shutil.which("bundle") and (REPO_ROOT / "Gemfile").exists():
        cmd = ["bundle", "exec", "jekyll", "build"]
    elif shutil.which("jekyll"):
        cmd = ["jekyll", "build"]
    else:
        print("Skipped the test build: Jekyll is not installed on this computer. "
              "That is fine - GitHub builds the site when you push.")
        return True
    print("Building the site to check it: " + " ".join(cmd))
    result = subprocess.run(cmd, cwd=REPO_ROOT)
    if result.returncode != 0:
        print("The test build failed. Nothing was published. Ask for help with the message above.")
        return False
    print("Site built OK (in the _site folder).")
    return True


# --------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Add new artwork to iansheridan.art (safe to run again and again)."
    )
    parser.add_argument("--art-folder", "--raw-dir", dest="art_folder",
                        help=f"folder with your full-size art (default: ${ART_FOLDER_ENV} "
                             "or your iCloud ians_art folder)")
    parser.add_argument("--sell", nargs="+", metavar="NAME", default=[],
                        help="show the Buy button for these pieces or whole series")
    parser.add_argument("--unsell", nargs="+", metavar="NAME", default=[],
                        help="hide the Buy button for these pieces or whole series")
    parser.add_argument("--build", action="store_true",
                        help="also build the site locally to check it")
    parser.add_argument("--dry-run", action="store_true",
                        help="only show what would change; change nothing")
    args = parser.parse_args(argv)

    art_folder = Path(os.path.expanduser(
        args.art_folder or os.environ.get(ART_FOLDER_ENV) or DEFAULT_ART_FOLDER))

    print(f"Website folder: {REPO_ROOT}")
    problems = []
    if art_folder.is_dir():
        print(f"Art folder:     {art_folder}")
        made, skipped, problems = update_images(art_folder, dry_run=args.dry_run)
        verb = "would be resized" if args.dry_run else "resized"
        print(f"Pictures: {made} {verb}, {skipped} already up to date.")
    else:
        print(f"Art folder not found: {art_folder}")
        print("  (Skipping pictures. Use --art-folder to point at your art, "
              f"or set {ART_FOLDER_ENV}.)")

    created = create_missing_pages(dry_run=args.dry_run)
    print(f"New piece pages: {len(created)}" + (" (not for sale yet)" if created else ""))
    for name in created[:20]:
        print(f"  + _gallery/{name}")
    if len(created) > 20:
        print(f"  ... and {len(created) - 20} more")

    ok = True
    for names, value, word in ((args.sell, True, "now for sale"), (args.unsell, False, "no longer for sale")):
        if not names:
            continue
        changed, unknown = set_for_sale(names, value, dry_run=args.dry_run)
        print(f"{len(changed)} piece(s) {word}: {', '.join(changed) or '-'}")
        if unknown:
            ok = False
            print(f"  Could not find: {', '.join(unknown)} (use a page name from _gallery/ or a series name)")

    if problems:
        ok = False
        print("Some pictures could not be read:")
        for p in problems:
            print(f"  ! {p}")

    if args.build and not args.dry_run:
        ok = build_site() and ok

    if args.dry_run:
        print("Dry run: nothing was changed.")
    else:
        print("Done. To publish: commit and push your changes as usual.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
