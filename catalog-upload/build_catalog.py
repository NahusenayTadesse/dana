"""Build catalog-upload/files/ and catalog-upload/catalog_reset.sql.

Run from the repo root:  python3 catalog-upload/build_catalog.py

Three products — RAL colour sheets, roofing sheets, stone-coated tiles — each
led by the real product photos in catalog-upload/photos/, topped up with
showcase renders (static/showcase/gallery) in matching colours, at most
MAX_IMAGES per product.

Every image used is written to files/ under a flat, collision-proof name (the
production file store is one flat directory served at /files/<name>), twice:
`catalog-<name>.webp` (up to 1280px, the main product image) and
`catalog-<name>-sm.webp` (640px), which the product page uses for its
thumbnail strip. The SQL replaces the whole catalogue and points at exactly
those names.

files/ is wiped and rebuilt on every run — keep source photos in photos/.
"""
import os
import shutil

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(ROOT, "photos")
GALLERY = os.path.join(ROOT, "..", "static", "showcase", "gallery")
FILES = os.path.join(ROOT, "files")
SQL = os.path.join(ROOT, "catalog_reset.sql")
MAX_IMAGES = 10

# key -> (name, code, hex). Inserted only if a colour of that name isn't
# already in `colors`.
COLORS = {
    "flame_red": ("Flame Red", "RAL 3000", "#A72920"),
    "traffic_green": ("Traffic Green", "RAL 6024", "#308446"),
    "traffic_blue": ("Traffic Blue", "RAL 5017", "#0E518D"),
    "cream": ("Cream", "RAL 9001", "#E9E0D2"),
    "signal_red": ("Signal Red", "RAL 3001", "#A52019"),
    "moss_green": ("Moss Green", "RAL 6005", "#2F4538"),
    "grass": ("Grass Print", "Printed", "#3F9A3C"),
    "terracotta": ("Terracotta", "RAL 8004", "#9C4E2E"),
    "black": ("Jet Black", "RAL 9005", "#0A0A0A"),
}


# --- image sources -----------------------------------------------------------
# photo(): a real product photo from photos/, saved as catalog-<name>.
# render(): a showcase render, saved as catalog-<slug>-<num> (as before).

def photo(src, name):
    return ("photo", src, f"catalog-{name}")


def render(slug, num):
    return ("render", f"{slug}/{num}", f"catalog-{slug}-{num}")


# Each product: variants are (sku, colour, image) — the image is what shows
# when that colour is picked. `gallery` lists every image in display order
# with the colour it shows (None = not colour-specific, shown under every
# colour); variant images must appear in it.
PRODUCTS = [
    {
        "var": "ral",
        "category": ("RAL colours", "Colour-coated sheets in named RAL shades"),
        "name": "RAL Colour-Coated Sheets",
        "slug": "ral-colour-coated-sheets",
        "description": "Pre-painted galvanized sheets coated to a named RAL shade, matched batch to batch.",
        "overview": "Colour-coated PPGI sheets in exact RAL shades — pick the code, we coat to it, and every repeat order matches.",
        "thickness": "0.23–0.80 mm",
        "width": "914 / 1000 / 1219 mm",
        "max_length": "12.00",
        "coating": "PPGI",
        "size_range": "Standard Lengths",
        "finish": "Pre-painted · Glossy",
        "performance": "Weather-resistant coating with high UV degradation protection.",
        "advantages": "Exact RAL shade on every sheet, so extensions and repeat orders match the original roof.",
        "applications": "Roofing · cladding · facades",
        "spec": {"width": "@w_913", "thickness": "@t_0425", "length": "@l_3", "price": "1250.00", "qty": 150, "reorder": 20},
        "variants": [
            ("RAL-3000", "flame_red", photo("photo_5906935850556133473_y.jpg", "ral-3000")),
            ("RAL-6024", "traffic_green", photo("photo_5906935850556133474_y.jpg", "ral-6024")),
            ("RAL-5017", "traffic_blue", photo("photo_5906935850556133475_y.jpg", "ral-5017")),
            ("RAL-9001", "cream", photo("photo_5906935850556133476_y.jpg", "ral-9001")),
        ],
        "gallery": [
            (photo("photo_5906935850556133473_y.jpg", "ral-3000"), "flame_red"),
            (photo("photo_5906935850556133474_y.jpg", "ral-6024"), "traffic_green"),
            (photo("photo_5906935850556133475_y.jpg", "ral-5017"), "traffic_blue"),
            (photo("photo_5906935850556133476_y.jpg", "ral-9001"), "cream"),
            (render("roof-red", "02"), "flame_red"),
            (render("roof-green", "02"), "traffic_green"),
            (render("roof-blue", "02"), "traffic_blue"),
            (render("fence-white", "01"), "cream"),
            (render("fence-red", "01"), "flame_red"),
            (render("fence-blue", "02"), "traffic_blue"),
        ],
    },
    {
        "var": "sheet",
        "category": ("Roofing sheets", "Trapezoidal, corrugated and printed roofing sheets"),
        "name": "Roofing Sheets",
        "slug": "roofing-sheets",
        "description": "Trapezoidal and corrugated colour-coated roofing sheets, including printed finishes.",
        "overview": "Profiled PPGI sheets for roofs, walls and fencing — in solid colours or printed patterns.",
        "thickness": "0.23–0.80 mm",
        "width": "914 / 1000 / 1219 mm",
        "max_length": "12.00",
        "coating": "PPGI",
        "size_range": "Trapezoidal · Corrugated · Step profiles",
        "finish": "Pre-painted · Printed",
        "performance": "Profiled ribs for stiffness over wide purlin spacing; weather-resistant coating.",
        "advantages": "Light, quick to install and available in long single runs.",
        "applications": "Roofing · wall cladding · fencing",
        "spec": {"width": "@w_913", "thickness": "@t_0425", "length": "@l_3", "price": "1250.00", "qty": 150, "reorder": 20},
        "variants": [
            ("SHEET-RED", "signal_red", photo("photo_5832265103926038607_y.jpg", "sheet-red")),
            ("SHEET-BLU", "traffic_blue", photo("photo_5832265103926038608_y.jpg", "sheet-blue")),
            ("SHEET-GRN", "moss_green", photo("photo_5832265103926038602_y.jpg", "sheet-green")),
            ("SHEET-GRASS", "grass", photo("photo_5832265103926038605_y.jpg", "sheet-grass")),
        ],
        "gallery": [
            (photo("photo_5832265103926038607_y.jpg", "sheet-red"), "signal_red"),
            (photo("photo_5832265103926038608_y.jpg", "sheet-blue"), "traffic_blue"),
            (photo("photo_5832265103926038602_y.jpg", "sheet-green"), "moss_green"),
            (photo("photo_5832265103926038605_y.jpg", "sheet-grass"), "grass"),
            (photo("photo_5832265103926038606_y.jpg", "sheet-red-step"), "signal_red"),
            (photo("photo_5832265103926038603_y.jpg", "sheet-factory"), None),
            (render("fence-blue", "02"), "traffic_blue"),
            (render("fence-red", "06"), "signal_red"),
            (render("roof-green", "03"), "moss_green"),
            (render("roof-blue", "03"), "traffic_blue"),
        ],
    },
    {
        "var": "tile",
        "category": ("Roofing tiles", "Roofing tiles"),
        "name": "Stone-Coated Roof Tiles",
        "slug": "stone-coated-roof-tiles",
        "description": "Steel roof tiles with a stone-chip finish, with matching ridge caps.",
        "overview": "Stone-coated steel tiles give the look of clay at a fraction of the weight; matching ridge caps finish the roof line.",
        "thickness": "0.30–0.50 mm",
        "width": "1080 mm cover",
        "max_length": "6.00",
        "coating": "Stone-coated GI",
        "size_range": "Tile panels · Ridge caps",
        "finish": "Stone-chip texture",
        "performance": "Stone granules bonded over coated steel resist fading and hail, and quieten rain.",
        "advantages": "Clay-tile look without the weight; ridge caps come in the same colours.",
        "applications": "Residential · villas · commercial roofs",
        "spec": {"width": "@w_1219", "thickness": "@t_0425", "length": "@l_2", "price": "22.00", "qty": 900, "reorder": 80},
        "variants": [
            ("TILE-TER", "terracotta", photo("photo_5832265103926038609_y.jpg", "tile-terracotta")),
            ("TILE-BLK", "black", photo("photo_5832265103926038610_y.jpg", "tile-black")),
        ],
        "gallery": [
            (photo("photo_5832265103926038609_y.jpg", "tile-terracotta"), "terracotta"),
            (photo("photo_5832265103926038610_y.jpg", "tile-black"), "black"),
            (photo("photo_5832265103926038604_y.jpg", "ridge-cap-brown"), "terracotta"),
            (photo("photo_5832265103926038601_y.jpg", "ridge-cap-black"), "black"),
            (render("roof-terracotta", "02"), "terracotta"),
            (render("roof-black", "01"), "black"),
            (render("roof-terracotta", "05"), "terracotta"),
            (render("roof-black", "06"), "black"),
            (render("roof-terracotta", "01"), "terracotta"),
            (render("roof-black", "03"), "black"),
        ],
    },
]


# --- files -------------------------------------------------------------------

def write_image(source, out_name):
    kind, src, _ = source
    if kind == "render":
        for width, suffix in ((1280, ""), (640, "-sm")):
            shutil.copyfile(
                os.path.join(GALLERY, f"{src}-{width}.webp"),
                os.path.join(FILES, f"{out_name}{suffix}.webp"),
            )
        return
    im = ImageOps.exif_transpose(Image.open(os.path.join(PHOTOS, src))).convert("RGB")
    for width, suffix in ((1280, ""), (640, "-sm")):
        v = im if im.width <= width else im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        v.save(os.path.join(FILES, f"{out_name}{suffix}.webp"), "WEBP", quality=80, method=6)


def build_files():
    if os.path.isdir(FILES):
        shutil.rmtree(FILES)
    os.makedirs(FILES)
    done = set()
    for p in PRODUCTS:
        assert len(p["gallery"]) <= MAX_IMAGES, f"{p['name']}: more than {MAX_IMAGES} images"
        gallery_names = {g[0][2] for g in p["gallery"]}
        for _, _, img in p["variants"]:
            assert img[2] in gallery_names, f"{p['name']}: variant image {img[2]} not in gallery"
        for source, _ in p["gallery"]:
            if source[2] not in done:
                write_image(source, source[2])
                done.add(source[2])
    return len(done)


# --- SQL ---------------------------------------------------------------------

def q(value):
    return "NULL" if value is None else "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def file_of(source):
    return f"{source[2]}.webp"


def product_block(p):
    var, spec = p["var"], p["spec"]
    lines = [
        f"-- {p['name']} " + "-" * max(0, 70 - len(p["name"])),
        "INSERT INTO products (name, slug, brand, category_id, featured_image, description, overview,",
        "\tquantity, reorder_level, sold_by, thickness, width, max_length, max_length_unit,",
        "\tis_length_customizable, min_length, length_step, coating_type, color_options, size_range,",
        "\tfinish, performance_features, advantages, applications, is_featured_on_home)",
        "VALUES (" + ", ".join([
            q(p["name"]), q(p["slug"]), q("DANA"), f"@cat_{var}", q(file_of(p["variants"][0][2])),
            q(p["description"]), q(p["overview"]), "0", "10", q("quantity"),
            q(p["thickness"]), q(p["width"]), p["max_length"], q("m"), "TRUE", "1.00", "0.50",
            q(p["coating"]), q(", ".join(COLORS[c][2] for _, c, _ in p["variants"])), q(p["size_range"]),
            q(p["finish"]), q(p["performance"]), q(p["advantages"]), q(p["applications"]), "FALSE",
        ]) + ");",
        f"SET @{var} = LAST_INSERT_ID();",
        f"INSERT INTO categories_products (category_id, product_id) VALUES (@cat_{var}, @{var});",
        "",
        "INSERT INTO product_variants (product_id, color_id, width_id, thickness_id, length_id, sku, price, quantity, reorder_level, image_url) VALUES",
        ",\n".join(
            f"\t(@{var}, @color_{color}, {spec['width']}, {spec['thickness']}, {spec['length']}, "
            f"{q(sku)}, {spec['price']}, {spec['qty']}, {spec['reorder']}, {q(file_of(img))})"
            for sku, color, img in p["variants"]
        ) + ";",
        "",
        "INSERT INTO product_images (product_id, image_url, color_id) VALUES",
        ",\n".join(
            f"\t(@{var}, {q(file_of(src))}, {f'@color_{c}' if c else 'NULL'})" for src, c in p["gallery"]
        ) + ";",
        "",
    ]
    return lines


def build_sql():
    ids = ", ".join(f"@{p['var']}" for p in PRODUCTS)
    names = ", ".join(p["name"] for p in PRODUCTS)
    out = [
        "-- =====================================================================",
        "-- Catalogue reset: remove every product, variant, order and payment,",
        f"-- then load {len(PRODUCTS)} products ({names})",
        "-- with one variant per colour and up to "
        f"{MAX_IMAGES} gallery photos each.",
        "--",
        "-- Generated by catalog-upload/build_catalog.py — edit that, not this.",
        "--",
        "-- BEFORE RUNNING IN PRODUCTION",
        "--   1. Back up the database (mysqldump/mariadb-dump). This is destructive.",
        "--   2. Apply drizzle/0014_product_images_color.sql (adds",
        "--      product_images.color_id, which this script fills in).",
        "--   3. Upload every file in catalog-upload/files/ into the production",
        "--      FILES_DIR (flat, same names). The SQL only stores the names.",
        "--",
        "-- KEPT: customers, user accounts, staff, warehouses, raw materials,",
        "--   purchase orders (finished-goods lines pointing at old variants are",
        "--   removed), promo codes, blog, site settings/images, FAQ, testimonials,",
        "--   and the colour/width/thickness/length/category lookup tables (missing",
        "--   entries the new products need are added). Categories left with no",
        "--   products are hidden (is_active = FALSE), not deleted.",
        "--",
        "-- Runs in one transaction: if any statement fails, nothing is changed.",
        "-- =====================================================================",
        "",
        "START TRANSACTION;",
        "",
        "-- 1. Orders and everything hanging off them ---------------------------",
        "DELETE FROM quote_replies;",
        "DELETE FROM quote_requests;",
        "DELETE FROM payment_links;",
        "DELETE FROM price_offers;",
        "DELETE FROM order_adjustments;",
        "DELETE FROM order_items;",
        "DELETE FROM orders;",
        "DELETE FROM product_adjustments;",
        "DELETE FROM transactions;",
        "",
        "-- 2. Stock and production records tied to the old variants -----------",
        "DELETE FROM production_batches;",
        "DELETE FROM purchase_order_items WHERE variant_id IS NOT NULL;",
        "DELETE FROM stock_levels;",
        "",
        "-- 3. The catalogue itself --------------------------------------------",
        "DELETE FROM variant_prices;",
        "DELETE FROM product_variants;",
        "DELETE FROM product_images;",
        "DELETE FROM product_tags;",
        "DELETE FROM categories_products;",
        "DELETE FROM discounts;",
        "DELETE FROM damaged_products;",
        "DELETE FROM products;",
        "",
        "-- 4. Lookups the new products need (added only if missing) ------------",
        "INSERT INTO product_categories (name, description)",
        "SELECT * FROM (",
        " UNION ALL\n".join(
            f"\tSELECT {q(n)} AS name, {q(d)} AS description" if i == 0 else f"\tSELECT {q(n)}, {q(d)}"
            for i, (n, d) in enumerate(p["category"] for p in PRODUCTS)
        ),
        ") AS c",
        "WHERE NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.name = c.name);",
    ]
    out += [f"SET @cat_{p['var']} = (SELECT id FROM product_categories WHERE name = {q(p['category'][0])});" for p in PRODUCTS]
    out += [
        "",
        "INSERT INTO colors (name, code, hex_value)",
        "SELECT * FROM (",
        " UNION ALL\n".join(
            f"\tSELECT {q(n)} AS name, {q(c)} AS code, {q(h)} AS hex_value" if i == 0 else f"\tSELECT {q(n)}, {q(c)}, {q(h)}"
            for i, (n, c, h) in enumerate(COLORS.values())
        ),
        ") AS c",
        "WHERE NOT EXISTS (SELECT 1 FROM colors x WHERE x.name = c.name);",
    ]
    out += [f"SET @color_{key} = (SELECT id FROM colors WHERE name = {q(name)});" for key, (name, _, _) in COLORS.items()]
    out += [
        "",
        "INSERT INTO widths (value, unit, label)",
        "SELECT * FROM (SELECT 913.00 AS value, 'mm' AS unit, '3 Feet (914mm)' AS label UNION ALL",
        "\tSELECT 1219.00, 'mm', '4 Feet Standard Coil (1219mm)') AS w",
        "WHERE NOT EXISTS (SELECT 1 FROM widths x WHERE x.value = w.value AND x.unit = w.unit);",
        "INSERT INTO thicknesses (value, unit, label)",
        "SELECT 0.425, 'mm', '0.425mm High-Tensile Cladding' FROM DUAL",
        "WHERE NOT EXISTS (SELECT 1 FROM thicknesses WHERE value = 0.425 AND unit = 'mm');",
        "INSERT INTO lengths (value, unit, label)",
        "SELECT * FROM (SELECT 2.00 AS value, 'm' AS unit, 'Standard 2.0m Sheet' AS label UNION ALL",
        "\tSELECT 3.00, 'm', 'Standard 3.0m Sheet') AS l",
        "WHERE NOT EXISTS (SELECT 1 FROM lengths x WHERE x.value = l.value AND x.unit = l.unit);",
        "SET @w_913 = (SELECT id FROM widths WHERE value = 913.00 AND unit = 'mm');",
        "SET @w_1219 = (SELECT id FROM widths WHERE value = 1219.00 AND unit = 'mm');",
        "SET @t_0425 = (SELECT id FROM thicknesses WHERE value = 0.425 AND unit = 'mm');",
        "SET @l_2 = (SELECT id FROM lengths WHERE value = 2.00 AND unit = 'm');",
        "SET @l_3 = (SELECT id FROM lengths WHERE value = 3.00 AND unit = 'm');",
        "",
        "-- 5. Products, colour variants and galleries -------------------------",
    ]
    for p in PRODUCTS:
        out += product_block(p)
    out += [
        "-- Stock lives in stock_levels (see src/lib/server/stock.ts); the",
        "-- quantity columns are totals synced from it. Put each variant's opening",
        "-- stock in the default warehouse, creating one the way migration 0012",
        "-- does if none is marked default yet.",
        "INSERT INTO warehouses (name, is_default, is_active)",
        "SELECT 'Main Warehouse', TRUE, TRUE FROM DUAL",
        "WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE is_default = TRUE);",
        "SET @warehouse = (SELECT MIN(id) FROM warehouses WHERE is_default = TRUE);",
        "INSERT INTO stock_levels (variant_id, warehouse_id, quantity)",
        f"SELECT id, @warehouse, quantity FROM product_variants WHERE product_id IN ({ids});",
        "UPDATE products p SET quantity = (SELECT COALESCE(SUM(v.quantity), 0) FROM product_variants v WHERE v.product_id = p.id)",
        f"WHERE p.id IN ({ids});",
        "",
        "-- Hide categories that no product uses any more, so the shop filter only",
        "-- lists ones with something in them. Reversible: set is_active back.",
        "UPDATE product_categories SET is_active = (id IN (SELECT category_id FROM products));",
        "",
        "-- One per-piece rate per variant, matching its retail price (same",
        "-- convention as the earlier seeds).",
        "INSERT INTO variant_prices (variant_id, basis, price, price_includes_vat)",
        f"SELECT id, 'quantity', price, FALSE FROM product_variants WHERE product_id IN ({ids});",
        "",
        "COMMIT;",
        "",
    ]
    with open(SQL, "w") as f:
        f.write("\n".join(out))


if __name__ == "__main__":
    n = build_files()
    build_sql()
    print(f"{n} images ({n * 2} files) -> {os.path.relpath(FILES)}; SQL -> {os.path.relpath(SQL)}")
