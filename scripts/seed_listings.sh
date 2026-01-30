#!/bin/bash

# Configuration
API_URL="http://144.126.151.136:8000/api"
# API_URL="http://localhost:8000/api" # Use this if running against local backend
INITIAL_TOKEN="dev-bypass-token"

echo "Switching to SUPPLIER role..."
# Capture the response which contains the new token
RESPONSE=$(curl -s -X PUT -H "Authorization: Bearer $INITIAL_TOKEN" "$API_URL/auth/switch-role/SUPPLIER")

# Extract token using simple grep/sed to avoid jq dependency if missing
# Assumes format {"access_token":"...","token_type":"bearer"}
TOKEN=$(echo $RESPONSE | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
    echo "Failed to switch role. Response: $RESPONSE"
    exit 1
fi

echo "Got Supplier Token: ${TOKEN:0:10}..."
echo "Seeding listings to $API_URL..."

# Function to create listing
create_listing() {
    curl -s -X POST "$API_URL/listings" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$1"
    echo ""
}

# Listing 1: Green Ammonia in Singapore (Blue is not in enum)
echo "Creating Listing 1: Green Ammonia..."
create_listing '{
    "region": "Singapore",
    "fuel_type": "Ammonia",
    "fuel_grade": "Green",
    "quantity_mt": 15000,
    "price_per_mt_usd": 450,
    "availability_window": "Q2 2026",
    "tier_label": "Major Trader",
    "certifications": ["ISCC", "H2Global"]
}'

# Listing 2: Bio-LNG in Rotterdam (ARA)
echo "Creating Listing 2: Bio-LNG..."
create_listing '{
    "region": "ARA",
    "fuel_type": "LNG",
    "fuel_grade": "Bio",
    "quantity_mt": 8000,
    "price_per_mt_usd": 850,
    "availability_window": "Spot",
    "tier_label": "Tier 1 Producer",
    "certifications": ["ISCC"]
}'

# Listing 3: Green Methanol in Houston
echo "Creating Listing 3: Green Methanol..."
create_listing '{
    "region": "Houston",
    "fuel_type": "Methanol",
    "fuel_grade": "Green",
    "quantity_mt": 25000,
    "price_per_mt_usd": 620,
    "availability_window": "Forward 2027",
    "tier_label": "Independent Supplier",
    "certifications": ["ISCC", "RedCert"]
}'

echo "Done!"
