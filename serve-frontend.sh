#!/bin/bash
# Simple script to serve the frontend files for development

echo "Starting frontend server..."
echo "Frontend will be available at: http://localhost:8080"
echo "Experimental visualization: http://localhost:8080/experimental/annular-viz.html"
echo ""
echo "Make sure the backend is running on port 3001:"
echo "  cd backend && npm start"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd frontend && python3 -m http.server 8080

# Made with Bob
