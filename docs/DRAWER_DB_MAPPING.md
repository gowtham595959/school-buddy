# School Detail Drawer → Database Mapping

This document maps each drawer panel/section to database tables and columns. The UI should be **strictly driven by DB data** so that adding values in the database automatically fills the drawer without code changes.

---

## Panel visibility (which sections to show)

Visibility is controlled by boolean flags on `schools`:

| Drawer Section           | Visibility Flag (schools) |
|--------------------------|---------------------------|
| 11+ Catchment            | `has_catchment` AND `has_admissions` |
| 11+ Exam Details         | `has_exams` AND `has_admissions`     |
| 11+ Allocation data      | `has_allocations` AND `has_admissions` |
| GCSE results             | `has_results_gcse`        |
| A level results          | `has_results_alevel`      |
| Oxbridge offers & Destinations | `has_oxbridge`     |
| Inspections              | `has_inspection`           |
| GCSE Subjects            | `has_subjects`             |

---

## 1. Drawer Header

| UI Field    | Source Table | Column          | Notes                    |
|-------------|--------------|-----------------|--------------------------|
| Title       | schools      | display_name    | fallback: name           |
| Subtitle    | schools      | local_authority | e.g. "Kingston upon Thames" |

---

## 2. Main (Overview)

| UI Field   | Source Table | Column           |
|------------|--------------|------------------|
| Type       | schools      | school_type      |
| Gender     | schools      | gender_type      |
| Selective  | schools      | selectivity_type |
| Top School | schools      | top_school       |

---

## 3. School Details

| UI Field    | Source Table | Column                 |
|-------------|--------------|------------------------|
| Phase       | schools      | phase                  |
| Age Range   | schools      | age_range              |
| Boarding    | schools      | boarding_type          |
| Religious   | schools      | religious_affiliation  |
| Fees        | schools      | fees                   |
| Address     | schools      | address                |
| Website     | schools      | website                |
| Phone       | schools      | phone                  |

*(Optional: email, description, fees_notes — fees_notes for XLS bulk import)*

---

## 4. 11+ Catchment

| UI Data                         | Source Table           | Columns / Notes                                                                 |
|---------------------------------|------------------------|----------------------------------------------------------------------------------|
| Catchment definitions (priority areas) | catchment_definitions | school_id, catchment_key, catchment_priority, geography_type, members, members_display |
| Cached geometries (GeoJSON)     | catchment_geometries   | school_id, catchment_key, geometry_kind, member_code, geojson                   |
| Allocation seats                | catchment_definitions  | catchment_alloc_seats                                                            |
| Year                            | catchment_definitions  | catchment_year                                                                  |

**Relationship:** `catchment_definitions.school_id` → `schools.id`  
**Relationship:** `catchment_geometries.school_id` → `schools.id`

---

## 5. 11+ Exam Details

| UI Data              | Source Table          | Columns                                                                 |
|----------------------|-----------------------|-------------------------------------------------------------------------|
| Exam config by year  | admission_exams       | school_id, year, subjects, stages, exam_dates, application_info, applicants, score_distribution |
| Individual test papers | admission_exam_papers | admission_exam_id, test_number, subject, question_count, duration_minutes, negative_marking, question_type, test_date |

**Relationship:** `admission_exams.school_id` → `schools.id`  
**Relationship:** `admission_exam_papers.admission_exam_id` → `admission_exams.id`

---

## 6. 11+ Allocation data

| UI Data               | Source Table               | Columns                                                                 |
|-----------------------|----------------------------|-------------------------------------------------------------------------|
| Policy summary        | admissions_policies        | school_id, year, entry_year, year_group, total_intake, summary, policy_url, key_dates |
| Oversubscription      | admissions_policies        | oversubscription_criteria (jsonb)                                        |
| Allocation history    | admissions_allocation_history | school_id, entry_year, on_time_apps, first_pref_apps, offers_total, last_distance_offered_km, notes |
| Criteria details      | admissions_criteria        | admissions_policy_id, criterion_order, criterion_type, seats_allocated, min_score, catchment_set_type |

**Relationship:** `admissions_policies.school_id` → `schools.id`  
**Relationship:** `admissions_allocation_history.school_id` → `schools.id`  
**Relationship:** `admissions_criteria.admissions_policy_id` → `admissions_policies.id`

---

## 7. GCSE results

| UI Data        | Source Table   | Columns                                                          |
|----------------|----------------|------------------------------------------------------------------|
| Results by year| gcse_results   | school_id, year, rank, results (jsonb), metric_key, metric_value, source_url, notes |

**Relationship:** `gcse_results.school_id` → `schools.id`

Typical metrics: Progress 8, Attainment 8, Eng+Math.

---

## 8. A level results

| UI Data        | Source Table   | Columns                                                          |
|----------------|----------------|------------------------------------------------------------------|
| Results by year| alevel_results | school_id, year, rank, results (jsonb), metric_key, metric_value, source_url, notes |

**Relationship:** `alevel_results.school_id` → `schools.id`

---

## 9. Oxbridge offers & Destinations

| UI Data          | Source Table        | Columns                                                                 |
|------------------|---------------------|-------------------------------------------------------------------------|
| Offers by year   | oxbridge_destinations | school_id, year, oxford_offers, cambridge_offers, destination_list (jsonb) |
| Metrics          | oxbridge_destinations | metric_key, metric_value, source_url                                 |

**Relationship:** `oxbridge_destinations.school_id` → `schools.id`

---

## 10. Inspections

| UI Data          | Source Table | Columns                                                                 |
|------------------|--------------|-------------------------------------------------------------------------|
| Inspection record| inspections  | school_id, inspection_date, inspector, rating, summary, report_url, inspection_body, overall_grade, notes |

**Relationship:** `inspections.school_id` → `schools.id`

---

## 11. GCSE Subjects

| UI Data      | Source Table   | Columns                                      |
|--------------|----------------|----------------------------------------------|
| Subject list | school_subjects| school_id, subject_group, subject_name, is_offered, notes |

**Relationship:** `school_subjects.school_id` → `schools.id`

---

## Summary: Tables per panel

| Panel               | Primary Table(s)                    | Rows (current) |
|---------------------|-------------------------------------|----------------|
| Header              | schools                             | 19             |
| Main                | schools                             | 19             |
| School Details      | schools                             | 19             |
| 11+ Catchment       | catchment_definitions, catchment_geometries | 33, 182        |
| 11+ Exam Details    | admission_exams, admission_exam_papers      | 0, 0           |
| 11+ Allocation data | admissions_policies, admissions_allocation_history, admissions_criteria | 0, 0, 0 |
| GCSE results        | gcse_results                        | 0              |
| A level results     | alevel_results                      | 0              |
| Oxbridge            | oxbridge_destinations               | 0              |
| Inspections         | inspections                         | 0              |
| GCSE Subjects       | school_subjects                     | 0              |

---

## Implementation approach (DB-driven, no code changes for new data)

1. **Fetch all drawer data by school_id** – One API or several endpoints returning exactly the columns above.
2. **Visibility driven by `schools.has_*`** – Only render a panel if its flag is true.
3. **Render whatever exists** – If a table has rows for a school, show them; if empty, show “No data” or hide the section.
4. **Avoid hardcoded field lists in UI** – Use `metric_key` / `metric_value` and `results` jsonb generically; new keys will render without code changes.
5. **Extend schools SELECT** – The current `/api/schools` only returns a subset of `schools`. Expand it to include all columns used by the drawer (or provide a separate `/api/schools/:id/detail` that returns the full school + related data).

---

## Current API gap

**schools.service.js** currently selects only:

```sql
id, name, lat, lon, radius_km, show_radius, show_polygon,
has_catchment, catchment_category, icon_url, marker_style_key
```

**Drawer needs these additional columns from schools:**

- display_name, local_authority
- school_type, gender_type, selectivity_type, top_school
- phase, age_range, boarding_type, religious_affiliation
- address, website, phone, email, description
- has_admissions, has_exams, has_allocations
- has_results_gcse, has_results_alevel, has_oxbridge
- has_inspection, has_subjects

**Action:** Either extend `fetchAllSchools` or add `fetchSchoolDetail(schoolId)` that returns all columns above plus related data from the other tables.
