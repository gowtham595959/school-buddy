----------------------------------------------------------
-- Legacy / unused app tables → deprecated_* prefix
-- Do NOT rename spatial_ref_sys: PostGIS catalogue (not ours).
----------------------------------------------------------

ALTER TABLE IF EXISTS school_bus_routes RENAME TO deprecated_school_bus_routes;
ALTER TABLE IF EXISTS transport_data RENAME TO deprecated_transport_data;
ALTER TABLE IF EXISTS transport_profiles RENAME TO deprecated_transport_profiles;
ALTER TABLE IF EXISTS postcode_areas_tmp RENAME TO deprecated_postcode_areas_tmp;
ALTER TABLE IF EXISTS school_inner_postcodes RENAME TO deprecated_school_inner_postcodes;
ALTER TABLE IF EXISTS postcodes RENAME TO deprecated_postcodes;
