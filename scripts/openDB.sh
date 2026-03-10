# Opens a PostgreSQL shell (psql) inside the running PostGIS Docker container: schoolbuddy-postgis
# Logs in using the PostgreSQL superuser: postgres
# Connects directly to the project database: schoolmap


docker exec -it schoolbuddy-postgis psql -U postgres -d schoolmap

