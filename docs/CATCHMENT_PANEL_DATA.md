# Catchment Panel — Tables & Data Reference

This document maps all catchment-related tables and columns used for drawing and display, so the same data can be shown in the **11+ Catchment** drawer panel.

---

## 1. Open vs Designated

| Source | Column | Values |
|-------|--------|--------|
| **schools** | `catchment_category` | `'Designated Catchment'`, `'open'`, or empty |

- **Designated** = school has defined catchment areas (polygons/radius) — we draw them.
- **Open** = no designated catchment; we return no definitions and draw nothing.

---

## 2. Main Tables

### `catchment_definitions` (33 rows)

Source of truth for each catchment area. One row per priority area per school.

| Column | Purpose |
|--------|---------|
| `school_id` | Links to schools.id |
| `school_name` | Display name |
| `catchment_priority` | **1, 2, 3** — Priority 1 = highest, 3 = lowest |
| `catchment_key` | Unique key per area (e.g. `inner`, `outer`, `pa1`, `pa2`, `radius`) |
| `catchment_year` | Year (e.g. 2026) |
| `catchment_alloc_seats` | Allocation seats (optional) |
| `catchment_active` | `true` / `false` — only active are drawn |
| **`geography_type`** | **Radius or polygon type** (see below) |
| `radius` | For radius: distance (e.g. 5.25, 6.7) |
| `radius_unit` | For radius: `km`, `m`, `mi` |
| `members` | JSON array of member codes (e.g. `["KT1","KT2"]`) |
| `members_hash` | Hash of members for geometry cache lookup |
| **`members_display`** | **JSON array of `{code, name}`** — display names for each member |

### `catchment_geometries` (182 rows)

Cached GeoJSON for polygon catchments. Radius catchments are drawn as circles, not from this table.

| Column | Purpose |
|--------|---------|
| `school_id`, `catchment_key` | Links to definition |
| `geometry_kind` | `merged` (whole area) or `individual` (per member) |
| `member_code` | Code for individual geometry (e.g. `KT1`, `E05013929`) |
| `geojson` | GeoJSON for drawing on map |
| `built_from_members_hash` | Hash used for cache lookup |

### `canonical_geometries` (33,930 rows)

Master geometries for geography types. Used to build catchment_geometries; also has display names.

| Column | Purpose |
|--------|---------|
| `geography_type` | `ward`, `postcode_district`, `borough`, `parish`, etc. |
| `member_code` | ONS/code (e.g. `E05013929`, `KT1`) |
| **`name`** | **Display name** (e.g. "Berrylands", "Kingston Town") |
| `geojson` | Source geometry |

---

## 3. Geography Types (Polygon vs Radius)

| geography_type | Shape | Radius? | Members | Display names from |
|----------------|-------|--------|---------|--------------------|
| **radius** | Circle | Yes | — | — |
| **ward** | Polygon | No | Electoral ward codes (E05…) | `members_display` or `canonical_geometries.name` |
| **postcode_district** | Polygon | No | Postcodes (KT1, KT2, …) | `members_display` (code = name for districts) |
| **postcode_sector** | Polygon | No | Sectors (EN6 2, AL7 1, …) | `members_display` |
| **borough** | Polygon | No | ONS borough codes (E07…) | `members_display` or `canonical_geometries.name` |
| **parish** | Polygon | No | ONS parish codes (E04…) | `members_display` or `canonical_geometries.name` |
| **map_bucks_polygon** | Polygon | No | Bucks-specific codes (4501_boys, …) | Custom; no generic display names |

---

## 4. Priority & Inner/Outer

| catchment_key examples | catchment_priority | Meaning |
|------------------------|--------------------|---------|
| `inner` | 1 | Inner area (e.g. Tiffin — wards) |
| `outer` | 2 | Outer area (e.g. Tiffin — postcode districts) |
| `pa1`, `pa2`, `pa3` | 1, 2, 3 | Priority areas (e.g. Gravesend) |
| `radius` | 1 | Radius catchment (Nonsuch, Wallington) |
| `priority_1_2025`, `priority_2_parish` | 1, 2 | Year- or type-specific (e.g. Dame Alice Owen's) |

---

## 5. Radius Details

For `geography_type = 'radius'`:

| Column | Example |
|--------|---------|
| `radius` | 5.25, 6.7, 0.496 |
| `radius_unit` | km |
| `members` | [] (empty) |

Drawn as a circle from `schools.lat`, `schools.lon`.

---

## 6. Polygon Member Display Names

**Preferred:** `catchment_definitions.members_display` — JSON array of `{code, name}`:

```json
[
  {"code": "E05013929", "name": "Berrylands"},
  {"code": "KT1", "name": "KT1"},
  {"code": "E04004717", "name": "Bayford"}
]
```

**Fallback:** `canonical_geometries.name` for a given `geography_type` + `member_code`.

---

## 7. What the Map Layer Uses

| Data | Source |
|------|--------|
| Open vs Designated | `schools.catchment_category` |
| Which definitions to draw | `catchment_definitions` (active, ordered by priority) |
| Polygon GeoJSON | `catchment_geometries.geojson` |
| Radius circle | `catchment_definitions.radius` + `radius_unit` + `schools.lat/lon` |
| Labels on map | `members_display` or `canonical_geometries` for `member_code` → name |

---

## 8. Suggested Catchment Panel Content

For the **11+ Catchment** drawer section, you can show:

| Field | Source |
|-------|--------|
| Open / Designated | `school.catchment_category` |
| Priority 1, 2, 3 areas | `definitions` grouped by `catchment_priority` |
| For each area: | |
| — Type | `geography_type` (Radius, Ward, Postcode district, Parish, Borough, etc.) |
| — Key/label | `catchment_key` (e.g. inner, outer, pa1) |
| — Radius | `radius` + `radius_unit` (if radius) |
| — Year | `catchment_year` |
| — Members list | `members_display` (code + name) or `members` with lookup |
| — Allocation seats | `catchment_alloc_seats` |

---

## 9. API: Catchment Data for a School

**Endpoint:** `GET /api/catchments-v2/:schoolId`

**Returns:**
- `school` — id, name, has_catchment, catchment_category, lat, lon
- `definitions` — raw rows from `catchment_definitions` (includes all columns):
  - `catchment_priority`, `catchment_key`, `catchment_year`
  - `geography_type`, `radius`, `radius_unit`
  - `members`, **`members_display`** (JSON array of `{code, name}`)
  - `catchment_alloc_seats`
- `geometriesByKey`, `geometries` — for map drawing

**Note:** `members_display` is in the API response. Use it for the panel to show member names.
