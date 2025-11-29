#!/bin/bash

echo "====================================="
echo "🚀 SCHOOL BUDDY - STARTUP CHECK"
echo "====================================="

DB_CONTAINER="schoolbuddy-postgis"
DB_NAME="schoolmap"
BACKEND_DIR="/workspaces/school-buddy/server"
FRONTEND_DIR="/workspaces/school-buddy/client"

echo ""
echo "🔍 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is NOT running!"
  exit 1
fi
echo "✅ Docker is running"

echo ""
echo "🔍 Checking PostGIS container..."
if docker ps --format '{{.Names}}' | grep -w "$DB_CONTAINER" > /dev/null 2>&1; then
  echo "✅ PostGIS is running"
else
  echo "⚠️ PostGIS not running. Starting..."
  docker start $DB_CONTAINER
  sleep 3
fi

echo ""
echo "🔍 Checking Postgres connection..."
docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -c "\q" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Database '$DB_NAME' is accessible"
else
  echo "❌ ERROR: Cannot connect to database '$DB_NAME'"
  echo "Run inside container:"
  echo "   docker exec -it $DB_CONTAINER bash"
  exit 1
fi


#########################################
# BACKEND STARTUP
#########################################
echo ""
echo "🔍 Checking backend server..."

BACKEND_RUNNING=$(pgrep -f "node src/index.js")

if [ -n "$BACKEND_RUNNING" ]; then
  echo "✅ Backend already running (PID: $BACKEND_RUNNING)"
else
  echo "⚠️ Backend not running. Starting..."
  cd "$BACKEND_DIR"
  nohup npm run dev > backend.log 2>&1 &
  sleep 2
  echo "➡️ Backend started"
fi


#########################################
# FRONTEND STARTUP
#########################################
echo ""
echo "🔍 Checking frontend React app..."

FRONTEND_RUNNING=$(pgrep -f "react-scripts start")

if [ -n "$FRONTEND_RUNNING" ]; then
  echo "✅ Frontend already running (PID: $FRONTEND_RUNNING)"
else
  echo "⚠️ Frontend not running. Starting..."
  cd "$FRONTEND_DIR"
  nohup npm start > frontend.log 2>&1 &
  sleep 2
  echo "➡️ Frontend started"
fi


#########################################
# FINAL STATUS + LOG LOCATIONS
#########################################

echo ""
echo "====================================="
echo "🎉 ALL SERVICES RUNNING SUCCESSFULLY!"
echo "====================================="

echo ""
echo "📜 LOG FILE LOCATIONS:"
echo "   🟦 Backend logs :   $BACKEND_DIR/backend.log"
echo "   🟩 Frontend logs :  $FRONTEND_DIR/frontend.log"
echo "   🟪 Docker logs (PostGIS):"
echo "        docker logs $DB_CONTAINER"
echo ""
echo "Run to watch logs live:"
echo "   tail -f server/backend.log"
echo "   tail -f client/frontend.log"
echo "====================================="
