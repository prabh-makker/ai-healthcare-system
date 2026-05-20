#!/bin/bash

echo "Waiting for containers to be fully ready..."
sleep 10

# Check if frontend is responding
echo "Testing frontend connectivity..."
for i in {1..30}; do
    if curl -s http://localhost:3006/dashboard/admin > /dev/null 2>&1; then
        echo "✓ Frontend is responding"
        break
    fi
    echo "  Attempt $i: waiting for frontend..."
    sleep 2
done

# Get the HTML and check for Active Cases card
echo ""
echo "Fetching admin dashboard HTML..."
curl -s http://localhost:3006/dashboard/admin | grep -o "Active Cases" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Active Cases card found in HTML"
else
    echo "✗ Active Cases card NOT found in HTML"
fi

# Check for 5 stat cards
echo ""
echo "Checking for stat cards..."
curl -s http://localhost:3006/dashboard/admin | grep -o "icon:" | wc -l

echo ""
echo "Verification complete!"
