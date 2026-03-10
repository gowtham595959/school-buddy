#!/usr/bin/env node

/**
 * Canonical geometry loader (GeoJSON FeatureCollection)
 *
 * Supports:
 * - file or directory input (--path)
 * - directory glob (--glob)
 * - code property (--codeProp)
 * - OPTIONAL name property (--nameProp) -> stored into canonical_geometries.name
 * - upsert on (geography_type, member_code)
 * - batch inserts
 * - SRID-aware transform: input source SRID -> target SRID (canonical default 4326)
 * - optional ST_MakeValid (--makeValid)
 * - optional skip invalid geometries (--skipInvalid)
 * - dry run mode
 *
 * Usage example (wards):
 * node load_canonical.js --path ../../data/geo/ward/ONS_WARD_2025/ --type ward --codeProp WD25CD --nameProp WD25NM --datasetVersion ONS_WARD_2025 --source "ONS Open Geography Portal" --sourceSrid 27700
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const { Client } = pg;

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function collectFilesRecursive(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && full.toLowerCase().endsWith('.geojson')) out.push(full);
    }
  }
  return out;
}

function ensureFeatureCollection(parsed, file) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid JSON object in file: ${file}`);
  }
  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error(`Expected FeatureCollection in file: ${file}`);
  }
  return parsed;
}

function normalizeCode(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normalizeName(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function bboxFromGeometry(geom) {
  try {
    if (!geom || typeof geom !== 'object') return null;
    const coords = geom.coordinates;
    if (!coords) return null;

    let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;

    const visit = (c) => {
      if (typeof c[0] === 'number' && typeof c[1] === 'number') {
        const x = c[0], y = c[1];
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        return;
      }
      for (const child of c) visit(child);
    };

    visit(coords);

    if (!Number.isFinite(xmin) || !Number.isFinite(ymin)) return null;
    return { xmin, xmax, ymin, ymax };
  } catch {
    return null;
  }
}

function geometryBoundsLooksLikeLonLat(geom) {
  const b = bboxFromGeometry(geom);
  if (!b) return true; // can't decide
  return (
    b.xmin >= -180 && b.xmax <= 180 &&
    b.ymin >= -90 && b.ymax <= 90
  );
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('envFile', {
      type: 'string',
      describe: 'Path to env file (relative to current working directory), e.g. ../.env.local',
      default: '../.env',
    })
    .option('type', {
      type: 'string',
      describe: 'geography_type (postcode_district|postcode_sector|ward|parish|borough|custom_map|future types)',
      demandOption: true,
    })
    .option('path', {
      type: 'string',
      describe: 'File or directory path',
      demandOption: true,
    })
    .option('glob', {
      type: 'string',
      describe: 'Glob for directory input',
      default: '**/*.geojson',
    })
    .option('datasetVersion', {
      type: 'string',
      describe: 'dataset_version string (e.g. OPEN_PD_2025, ONS_WARD_2025)',
      demandOption: true,
    })
    .option('source', {
      type: 'string',
      describe: 'source label (ONS|OPEN_POSTCODE|MANUAL|etc)',
      demandOption: true,
    })
    .option('codeProp', {
      type: 'string',
      describe: 'Feature property containing member_code (e.g. district, sector, WD25CD, PARNCP25CD, LAD25CD)',
      demandOption: true,
    })
    .option('nameProp', {
      type: 'string',
      describe: 'OPTIONAL: Feature property containing a human-readable name (e.g. WD25NM, PARNCP25NM, LAD25NM)',
      demandOption: false,
    })
    .option('sourceSrid', {
      type: 'number',
      describe: 'Source SRID of the input GeoJSON coordinates (e.g. 27700 for ONS BGC). REQUIRED unless you are 100% sure it is already 4326.',
      demandOption: false,
    })
    .option('targetSrid', {
      type: 'number',
      default: 4326,
      describe: 'Target SRID to store in canonical_geometries (default 4326).',
    })
    .option('srid', {
      type: 'number',
      describe: 'DEPRECATED alias for --sourceSrid (kept for backward compatibility).',
      demandOption: false,
    })
    .option('batchSize', {
      type: 'number',
      default: 2000,
      describe: 'Batch size for inserts',
    })
    .option('skipInvalid', {
      type: 'boolean',
      default: false,
      describe: 'Skip invalid geometries (filters with ST_IsValid in SQL)',
    })
    .option('makeValid', {
      type: 'boolean',
      default: false,
      describe: 'Use ST_MakeValid on insert (slower). Prefer fixing upstream if possible.',
    })
    .option('dryRun', {
      type: 'boolean',
      default: false,
      describe: 'Dry run (parse + count, no DB writes)',
    })
    .help()
    .argv;

  // Load env
  dotenv.config({ path: path.resolve(process.cwd(), argv.envFile) });

  const geographyType = argv.type;
  const inputPath = path.resolve(process.cwd(), argv.path);
  const globPattern = argv.glob; // informational; we do recursive scan for geojson
  const datasetVersion = argv.datasetVersion;
  const source = argv.source;
  const codeProp = argv.codeProp;
  const nameProp = argv.nameProp || null;

  const targetSrid = Number(argv.targetSrid) || 4326;
  const sourceSrid = Number((argv.sourceSrid ?? argv.srid) ?? NaN);

  if (!Number.isFinite(sourceSrid)) {
    throw new Error(
      `sourceSrid is required. Provide --sourceSrid <EPSG> (e.g. 27700 for ONS BGC, 4326 if already lon/lat).`
    );
  }

  const batchSize = Math.max(1, Number(argv.batchSize) || 2000);
  const skipInvalid = !!argv.skipInvalid;
  const makeValid = !!argv.makeValid;
  const dryRun = !!argv.dryRun;

  // Resolve files
  let files = [];
  if (isFile(inputPath)) {
    files = [inputPath];
  } else if (isDirectory(inputPath)) {
    const all = collectFilesRecursive(inputPath);
    files = all;
  } else {
    throw new Error(`ENOENT: Path not found: ${inputPath}`);
  }

  if (!files.length) {
    throw new Error(`No geojson files found under: ${inputPath} (glob=${globPattern})`);
  }

  console.log(`Loader starting`);
  console.log(`  type=${geographyType}`);
  console.log(`  path=${inputPath}`);
  console.log(`  files=${files.length}`);
  console.log(`  codeProp=${codeProp}`);
  console.log(`  nameProp=${nameProp || '(none)'}`);
  console.log(`  datasetVersion=${datasetVersion}`);
  console.log(`  source=${source}`);
  console.log(`  sourceSrid=${sourceSrid}`);
  console.log(`  targetSrid=${targetSrid}`);
  console.log(`  batchSize=${batchSize}`);
  console.log(`  skipInvalid=${skipInvalid}`);
  console.log(`  makeValid=${makeValid}`);
  console.log(`  dryRun=${dryRun}`);

  let totalFeatures = 0;
  let totalRowsPrepared = 0;
  let totalSkippedNoCode = 0;
  let totalSkippedNoGeom = 0;

  let client = null;
  if (!dryRun) {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) {
      throw new Error(`DATABASE_URL not found in environment. Check your envFile: ${argv.envFile}`);
    }
    client = new Client({ connectionString: connStr });
    await client.connect();
  }

  // Build SQL once
  // IMPORTANT: canonical_geometries.geom is MultiPolygon; some GeoJSON may contain Polygon.
  // We set SRID to sourceSrid, transform to targetSrid (canonical default 4326), and ST_Multi it.
  const geomExprBase = `ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(x.geom_geojson::text), $2::int), $3::int))`;
  const geomExprMaybeValid = makeValid ? `ST_MakeValid(${geomExprBase})` : geomExprBase;
  const whereValid = skipInvalid ? `WHERE ST_IsValid(${geomExprMaybeValid})` : ``;

  const upsertSql = `
    WITH x AS (
      SELECT *
      FROM jsonb_to_recordset($1::jsonb)
      AS x(
        geography_type text,
        member_code text,
        name text,
        geom_geojson jsonb,
        dataset_version text,
        source text
      )
    )
    INSERT INTO canonical_geometries (
      geography_type,
      member_code,
      name,
      geom,
      dataset_version,
      source,
      updated_at
    )
    SELECT
      x.geography_type,
      x.member_code,
      x.name,
      ${geomExprMaybeValid},
      x.dataset_version,
      x.source,
      now()
    FROM x
    ${whereValid}
    ON CONFLICT (geography_type, member_code)
    DO UPDATE SET
      name = EXCLUDED.name,
      geom = EXCLUDED.geom,
      dataset_version = EXCLUDED.dataset_version,
      source = EXCLUDED.source,
      updated_at = now()
  `;

  async function flushBatch(batchRows) {
    if (!batchRows.length) return;
    if (dryRun) return;

    // $1 rows jsonb, $2 sourceSrid, $3 targetSrid
    await client.query(upsertSql, [JSON.stringify(batchRows), sourceSrid, targetSrid]);
  }

  try {
    let batch = [];

    for (const file of files) {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = ensureFeatureCollection(JSON.parse(raw), file);

      totalFeatures += parsed.features.length;

      for (const feature of parsed.features) {
        if (!feature || feature.type !== 'Feature') continue;
        const props = feature.properties || {};
        const geometry = feature.geometry;

        const memberCode = normalizeCode(props[codeProp]);
        if (!memberCode) {
          totalSkippedNoCode += 1;
          continue;
        }

        if (!geometry || typeof geometry !== 'object') {
          totalSkippedNoGeom += 1;
          continue;
        }

        const name = nameProp ? normalizeName(props[nameProp]) : null;

        // Fail fast if the input coordinates do not look like the declared source SRID.
        // If you pass sourceSrid=4326 but coordinates are clearly projected meters, we abort to prevent corrupting canonical_geometries.
        if (sourceSrid === 4326 && !geometryBoundsLooksLikeLonLat(geometry)) {
          const b = bboxFromGeometry(geometry);
          throw new Error(
            `Input GeoJSON does not look like EPSG:4326 lon/lat, but sourceSrid=4326 was provided. ` +
            `Example bounds: xmin=${b?.xmin}, xmax=${b?.xmax}, ymin=${b?.ymin}, ymax=${b?.ymax}. ` +
            `Re-run with the correct --sourceSrid (ONS BGC is typically 27700). File=${file}, member_code=${memberCode}`
          );
        }

        batch.push({
          geography_type: geographyType,
          member_code: memberCode,
          name,
          geom_geojson: geometry,
          dataset_version: datasetVersion,
          source,
        });

        totalRowsPrepared += 1;

        if (batch.length >= batchSize) {
          await flushBatch(batch);
          console.log(`Inserted/Upserted batch: ${batch.length}`);
          batch = [];
        }
      }
    }

    if (batch.length) {
      await flushBatch(batch);
      console.log(`Inserted/Upserted final batch: ${batch.length}`);
    }

    if (!dryRun) {
      const bad = await client.query(
        `SELECT COUNT(*)::int AS n
         FROM canonical_geometries
         WHERE geography_type = $1
           AND (
             ST_SRID(geom) <> $2
             OR ST_XMax(geom) > 180 OR ST_XMin(geom) < -180
             OR ST_YMax(geom) > 90  OR ST_YMin(geom) < -90
           )`,
        [geographyType, targetSrid]
      );
      const nBad = bad.rows?.[0]?.n ?? 0;
      if (nBad > 0) {
        throw new Error(
          `Canonical load finished but validation failed: ${nBad} rows for geography_type='${geographyType}' are not valid EPSG:${targetSrid} lon/lat. ` +
          `This indicates a sourceSrid/transform problem.`
        );
      }
    }

    console.log(`Done.`);
    console.log(`  totalFeaturesSeen=${totalFeatures}`);
    console.log(`  totalRowsPrepared=${totalRowsPrepared}`);
    console.log(`  skippedNoCode=${totalSkippedNoCode}`);
    console.log(`  skippedNoGeom=${totalSkippedNoGeom}`);

  } finally {
    if (client) await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
