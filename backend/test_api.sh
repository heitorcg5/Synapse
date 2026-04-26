#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test_debug_'$RANDOM'@example.com", "password":"password123", "firstName":"Test", "lastName":"User"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Got token: $TOKEN"

curl -v -X POST http://localhost:8080/api/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"VIDEO", "sourceUrl":"https://youtu.be/cRZFWH6Cj6c?si=JtTGjf0CA4cNeQuB"}'

