#!/usr/bin/env bash
set -e

echo "========================================"
echo " 🔄 SCHOOL BUDDY — FULL RESTART SCRIPT"
echo "========================================"

FRONTEND_DIR="/workspaces/school-buddy/client"
BACKEND_DIR="/workspaces/school-buddy/server"
FRONTEND_PORT=3000
BACKEND_PORT=5000

kill_process_on_port() {
    PORT=$1
    PID=$(lsof -t -i:$PORT || true)

    if [ -n "$PID" ]; then
        echo "⚠️  Port $PORT is in use by PID $PID — killing..."
        kill -9 "$PID" || true
        sleep 1
        echo "✅ Port $PORT is now free."
    else
        echo "✅ Port $PORT is free."
    fi
}

echo ""
echo "🛑 Stopping any running frontend..."
kill_process_on_port $FRONTEND_PORT

echo ""
echo "🛑 Stopping any running backend..."
kill_process_on_port $BACKEND_PORT

echo ""
echo "⏳ Waiting 2 seconds..."
sleep 2

echo ""
echo "🚀 Starting backend..."
cd "$BACKEND_DIR"
nohup npm run dev > backend.log 2>&1 &
sleep 3

# Verify backend started
if ! lsof -i:$BACKEND_PORT >/dev/null; then
    echo "❌ Backend failed to start!"
    echo "▶️ Check logs: $BACKEND_DIR/backend.log"
    exit 1
fi
echo "✅ Backend is running on port $BACKEND_PORT"

echo ""
echo "🚀 Starting frontend..."
cd "$FRONTEND_DIR"
nohup npm start > frontend.log 2>&1 &
sleep 3

# Verify frontend started
if ! lsof -i:$FRONTEND_PORT >/dev/null; then
    echo "❌ Frontend failed to start!"
    echo "▶️ Check logs: $FRONTEND_DIR/frontend.log"
    exit 1
fi
echo "✅ Frontend is running on port $FRONTEND_PORT"

echo ""
echo "🎉 Restart complete!"
echo "----------------------------------------"
echo " Backend log:   $BACKEND_DIR/backend.log"
echo " Frontend log:  $FRONTEND_DIR/frontend.log"
echo "----------------------------------------"
