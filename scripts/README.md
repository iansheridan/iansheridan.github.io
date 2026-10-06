# Adding art and selling it — plain-English guide

One script does everything: `scripts/update_site.py`.
(It replaces the old `update_site.py`, `update_gallery.py` and `generate_portfolio.rb`.)

## One-time setup (on the Mac)

Open Terminal, go to the website folder, and run:

```
python3 -m pip install -r requirements.txt
```

(If the old scripts already ran on this Mac, Pillow is probably installed already.)

## Add new art

1. Put the full-size picture in your art folder, inside a series folder
   (for example `ians_art/My hands/New_Piece.jpg`). Your art folder is
   `iCloud Drive/Documents/ians_art`.
2. In Terminal, in the website folder, run:

   ```
   python3 scripts/update_site.py
   ```

3. Commit and push as usual. GitHub rebuilds the site in a few minutes.

What the script did:

- Made a web-sized copy in `images/processed/<series>/` (fits in 1024 x 1024).
- Made a page for the new piece in `_gallery/` — for example
  `_gallery/my-hands-new-piece.html`. **New pieces are not for sale** until you
  turn the Buy button on (next section).

It is safe to run again and again: it only does the work for new or changed
pictures, never deletes anything, and never overwrites a page you already have.

## Turn the Buy button on or off

Use the page name (the file name in `_gallery/` without `.html`) or a whole series name:

```
python3 scripts/update_site.py --sell my-hands-new-piece
python3 scripts/update_site.py --sell "My hands"
python3 scripts/update_site.py --unsell my-hands-feet
```

Or open the piece's file in `_gallery/` and change `for_sale: false` to `for_sale: true`.

Then commit and push.

To hide **every** Buy button at once, open `_data/shop.yml` and set `enabled: false`.

## Prices

Buyers choose a square print size: 10×10 $89, 12×12 $144, 16×16 $233,
20×20 $377, plus a flat $7.56 shipping per order. The sizes, prices and
shipping are in web-gallery's `config/products.json` — that is what Square
actually charges.
`_data/products.json` here is a copy used only to show prices on the site.
If you change prices, change them in web-gallery and copy the file here.

## Options

| Option | What it does |
| --- | --- |
| `--art-folder PATH` | Use a different art folder (or set `IAN_ART_FOLDER`) |
| `--sell NAME ...` / `--unsell NAME ...` | Show / hide Buy buttons |
| `--dry-run` | Show what would change, change nothing |
| `--build` | Also build the site on this computer to check it (needs Jekyll) |

## If something goes wrong

- "Art folder not found": check iCloud has finished downloading, or use `--art-folder`.
- "Some pictures could not be read": that file is damaged or not a picture;
  everything else was still done.
- "Pillow is not installed": run the one-time setup line above.
