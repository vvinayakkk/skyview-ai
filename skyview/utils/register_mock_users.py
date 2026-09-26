import json
import urllib.request
import urllib.error
import time

BACKEND_URL = "http://localhost:8000/api/profile/save"

mock_users = [
    {
        "phone": "+919011000001",
        "name": "Rajesh Kumar",
        "land_size_acres": 8.5,
        "location": "Ludhiana, Punjab",
        "crops": "Wheat, Paddy, Maize",
        "latitude": 30.9010,
        "longitude": 75.8573,
        "state": "Punjab",
        "district": "Ludhiana",
        "excess_resources": "Tractor, Seeder, Labor",
        "required_resources": "Harvester, Pesticide Spray",
        "whatsapp_number": "+919011000001"
    },
    {
        "phone": "+919011000002",
        "name": "Harpreet Singh",
        "land_size_acres": 12.0,
        "location": "Jalandhar, Punjab",
        "crops": "Wheat, Potato, Sunflower",
        "latitude": 31.3260,
        "longitude": 75.5762,
        "state": "Punjab",
        "district": "Jalandhar",
        "excess_resources": "Harvester, Seed Driller",
        "required_resources": "Tractor, Organic Compost",
        "whatsapp_number": "+919011000002"
    },
    {
        "phone": "+919011000003",
        "name": "Ramesh Patil",
        "land_size_acres": 5.0,
        "location": "Nashik, Maharashtra",
        "crops": "Grapes, Onion, Sugarcane",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "state": "Maharashtra",
        "district": "Nashik",
        "excess_resources": "Drip Irrigation Pipes, Organic Compost, Tractor",
        "required_resources": "Labor, Solar Water Pump",
        "whatsapp_number": "+919011000003"
    },
    {
        "phone": "+919011000004",
        "name": "Suresh Patel",
        "land_size_acres": 15.0,
        "location": "Anand, Gujarat",
        "crops": "Cotton, Groundnut, Tobacco",
        "latitude": 22.5645,
        "longitude": 72.9289,
        "state": "Gujarat",
        "district": "Anand",
        "excess_resources": "Solar Water Pump, Urea Fertilizer",
        "required_resources": "Tractor, Harvesting Labor",
        "whatsapp_number": "+919011000004"
    },
    {
        "phone": "+919011000005",
        "name": "Venkat Rao",
        "land_size_acres": 6.5,
        "location": "Guntur, Andhra Pradesh",
        "crops": "Chilli, Cotton, Paddy",
        "latitude": 16.3067,
        "longitude": 80.4365,
        "state": "Andhra Pradesh",
        "district": "Guntur",
        "excess_resources": "Labor, Pesticide Spray, Cotton Picker",
        "required_resources": "Tractor, Seed Driller",
        "whatsapp_number": "+919011000005"
    },
    {
        "phone": "+919011000006",
        "name": "Selvam R.",
        "land_size_acres": 4.5,
        "location": "Salem, Tamil Nadu",
        "crops": "Tapioca, Coconut, Paddy",
        "latitude": 11.6643,
        "longitude": 78.1460,
        "state": "Tamil Nadu",
        "district": "Salem",
        "excess_resources": "Tractor, Shredder Machine",
        "required_resources": "Water Pump, Organic Compost",
        "whatsapp_number": "+919011000006"
    },
    {
        "phone": "+919011000007",
        "name": "Amit Sharma",
        "land_size_acres": 10.0,
        "location": "Meerut, Uttar Pradesh",
        "crops": "Sugarcane, Wheat, Mustard",
        "latitude": 28.9845,
        "longitude": 77.7064,
        "state": "Uttar Pradesh",
        "district": "Meerut",
        "excess_resources": "Sugarcane Cutter, Tractor",
        "required_resources": "Urea Fertilizer, Labor",
        "whatsapp_number": "+919011000007"
    },
    {
        "phone": "+919011000008",
        "name": "Ananya Das",
        "land_size_acres": 3.5,
        "location": "Bardhaman, West Bengal",
        "crops": "Rice, Jute, Potato",
        "latitude": 23.2324,
        "longitude": 87.8630,
        "state": "West Bengal",
        "district": "Bardhaman",
        "excess_resources": "Paddy Transplanter, Seed Driller",
        "required_resources": "Tractor, Organic Fertilizer",
        "whatsapp_number": "+919011000008"
    },
    {
        "phone": "+919011000009",
        "name": "Kalyan Singh",
        "land_size_acres": 7.0,
        "location": "Jaipur, Rajasthan",
        "crops": "Bajra, Mustard, Barley",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "state": "Rajasthan",
        "district": "Jaipur",
        "excess_resources": "Thresher, Solar Fencing Kit",
        "required_resources": "Water Pump, Tractor",
        "whatsapp_number": "+919011000009"
    },
    {
        "phone": "+919011000010",
        "name": "Vijay Kumar",
        "land_size_acres": 9.2,
        "location": "Dharwad, Karnataka",
        "crops": "Groundnut, Maize, Soyabean",
        "latitude": 15.4589,
        "longitude": 75.0078,
        "state": "Karnataka",
        "district": "Dharwad",
        "excess_resources": "Tractor, Rotavator, Labor",
        "required_resources": "Harvester, Pesticide Spray",
        "whatsapp_number": "+919011000010"
    },
    {
        "phone": "+919011000011",
        "name": "Mohan Lal",
        "land_size_acres": 11.5,
        "location": "Indore, Madhya Pradesh",
        "crops": "Soyabean, Wheat, Gram",
        "latitude": 22.7196,
        "longitude": 75.8577,
        "state": "Madhya Pradesh",
        "district": "Indore",
        "excess_resources": "Seed Driller, Thresher",
        "required_resources": "Tractor, Sprinkler Pipes",
        "whatsapp_number": "+919011000011"
    },
    {
        "phone": "+919011000012",
        "name": "Radha Nair",
        "land_size_acres": 2.5,
        "location": "Palakkad, Kerala",
        "crops": "Paddy, Coconut, Spices",
        "latitude": 10.7867,
        "longitude": 76.6548,
        "state": "Kerala",
        "district": "Palakkad",
        "excess_resources": "Organic Fertilizer, Water Pump",
        "required_resources": "Paddy Transplanter, Labor",
        "whatsapp_number": "+919011000012"
    },
    {
        "phone": "+919011000013",
        "name": "Tarun Gogoi",
        "land_size_acres": 5.5,
        "location": "Guwahati, Assam",
        "crops": "Tea, Paddy, Mustard",
        "latitude": 26.1445,
        "longitude": 91.7362,
        "state": "Assam",
        "district": "Guwahati",
        "excess_resources": "Labor, Shredder Machine",
        "required_resources": "Tractor, Soil PH Tester",
        "whatsapp_number": "+919011000013"
    },
    {
        "phone": "+919011000014",
        "name": "Sanjay Mohanty",
        "land_size_acres": 6.0,
        "location": "Bhubaneswar, Odisha",
        "crops": "Paddy, Vegetables, Groundnut",
        "latitude": 20.2961,
        "longitude": 85.8245,
        "state": "Odisha",
        "district": "Bhubaneswar",
        "excess_resources": "Water Pump, Rotavator",
        "required_resources": "Tractor, Harvesting Labor",
        "whatsapp_number": "+919011000014"
    },
    
    # Enrichment of existing users
    {
        "phone": "+919930679651",
        "name": "ABC",
        "land_size_acres": 12.5,
        "location": "Mumbai, Maharashtra",
        "crops": "Wheat, Rice",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "district": "Mumbai",
        "excess_resources": "Tractor, Sprinkler Pipes",
        "required_resources": "Harvester, Labor",
        "whatsapp_number": "+919930679651"
    },
    {
        "phone": "7620072562",
        "name": "shrita",
        "land_size_acres": 60.0,
        "location": "Mumbai, Maharashtra",
        "crops": "Rice",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "district": "Mumbai",
        "excess_resources": "Tractor, Organic Compost",
        "required_resources": "Harvester, Labor",
        "whatsapp_number": "+917620072562"
    },
    {
        "phone": "8591616138",
        "name": "Matharva Pandit",
        "land_size_acres": 35.0,
        "location": "Kalyan, Maharashtra",
        "crops": "Wheat, Rice, Bajra",
        "latitude": 19.2403,
        "longitude": 73.1305,
        "state": "Maharashtra",
        "district": "Kalyan",
        "excess_resources": "Harvester, Seed Driller",
        "required_resources": "Labor, Urea Fertilizer",
        "whatsapp_number": "+918591616138"
    },
    {
        "phone": "7820859781",
        "name": "Navya Sinha",
        "land_size_acres": 45.0,
        "location": "Mumbai, Maharashtra",
        "crops": "Wheat",
        "latitude": 19.0820,
        "longitude": 72.8820,
        "state": "Maharashtra",
        "district": "Mumbai",
        "excess_resources": "Labor, Tractor",
        "required_resources": "Tractor, Organic Compost",
        "whatsapp_number": "+917820859781"
    },
    {
        "phone": "+917820859781",
        "name": "Navya Sinha",
        "land_size_acres": 500.0,
        "location": "Mumbai, Maharashtra",
        "crops": "Wheat",
        "latitude": 19.0820,
        "longitude": 72.8820,
        "state": "Maharashtra",
        "district": "Mumbai",
        "excess_resources": "Labor, Tractor",
        "required_resources": "Tractor, Organic Compost",
        "whatsapp_number": "+917820859781"
    },
    {
        "phone": "9321481275",
        "name": "Anuj Gite",
        "land_size_acres": 5.5,
        "location": "Nashik, Maharashtra",
        "crops": "Rice",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "state": "Maharashtra",
        "district": "Nashik",
        "excess_resources": "Water Pump, Tractor",
        "required_resources": "Labor, Pesticide Spray",
        "whatsapp_number": "+919321481275"
    },
    {
        "phone": "+918087379943",
        "name": "Vedant Tamboli",
        "land_size_acres": 5.0,
        "location": "Palghar, Maharashtra",
        "crops": "Cotton",
        "latitude": 19.6967,
        "longitude": 72.7667,
        "state": "Maharashtra",
        "district": "Palghar",
        "excess_resources": "Labor, Pesticide Spray",
        "required_resources": "Tractor, Seed Driller",
        "whatsapp_number": "+918087379943"
    },
    {
        "phone": "+919000000001",
        "name": "Rajesh Ghadge",
        "land_size_acres": 6.0,
        "location": "Nashik, Maharashtra",
        "crops": "Grapes, Onion",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "state": "Maharashtra",
        "district": "Nashik",
        "excess_resources": "Tractor",
        "required_resources": "Harvester",
        "whatsapp_number": "+919000000001"
    },
    {
        "phone": "+919000000002",
        "name": "Dinesh Shinde",
        "land_size_acres": 8.0,
        "location": "Nashik, Maharashtra",
        "crops": "Paddy, Sugarcane",
        "latitude": 20.0120,
        "longitude": 73.7950,
        "state": "Maharashtra",
        "district": "Nashik",
        "excess_resources": "Harvester",
        "required_resources": "Labor",
        "whatsapp_number": "+919000000002"
    },
    {
        "phone": "+919000000003",
        "name": "Anil Pawar",
        "land_size_acres": 5.5,
        "location": "Nashik, Maharashtra",
        "crops": "Wheat, Vegetables",
        "latitude": 19.9850,
        "longitude": 73.8010,
        "state": "Maharashtra",
        "district": "Nashik",
        "excess_resources": "Labor",
        "required_resources": "Tractor",
        "whatsapp_number": "+919000000003"
    }
]

def seed():
    print("Starting database seeding for Indian Farmers...")
    
    # Wait for 1s to make sure hot reload is completed
    time.sleep(1)
    
    success_count = 0
    for user in mock_users:
        data = json.dumps(user).encode("utf-8")
        req = urllib.request.Request(
            BACKEND_URL,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode("utf-8"))
                if result.get("status") == "success":
                    print(f"Registered: {user['name']} ({user['location']})")
                    success_count += 1
                else:
                    print(f"Failed to register {user['name']}: {result}")
        except urllib.error.URLError as e:
            print(f"Connection error for {user['name']}: {e}. Retrying locally via db connection...")
            # If server is not responding or loaded yet, register directly via db fallback
            try:
                from skyview.data.db import get_session
                from sqlalchemy import text
                db = get_session()
                db.execute(
                    text("""
                        INSERT INTO users (phone, name, land_size_acres, location, crops,
                                           latitude, longitude, state, district,
                                           excess_resources, required_resources, whatsapp_number)
                        VALUES (:phone, :name, :land, :location, :crops,
                                :latitude, :longitude, :state, :district,
                                :excess_resources, :required_resources, :whatsapp_number)
                        ON CONFLICT (phone) DO UPDATE SET
                            name               = COALESCE(EXCLUDED.name, users.name),
                            land_size_acres    = COALESCE(EXCLUDED.land_size_acres, users.land_size_acres),
                            location           = COALESCE(EXCLUDED.location, users.location),
                            crops              = COALESCE(EXCLUDED.crops, users.crops),
                            latitude           = COALESCE(EXCLUDED.latitude, users.latitude),
                            longitude          = COALESCE(EXCLUDED.longitude, users.longitude),
                            state              = COALESCE(EXCLUDED.state, users.state),
                            district           = COALESCE(EXCLUDED.district, users.district),
                            excess_resources   = COALESCE(EXCLUDED.excess_resources, users.excess_resources),
                            required_resources = COALESCE(EXCLUDED.required_resources, users.required_resources),
                            whatsapp_number    = COALESCE(EXCLUDED.whatsapp_number, users.whatsapp_number)
                    """),
                    {
                        "phone":              user["phone"],
                        "name":               user["name"],
                        "land":               user["land_size_acres"],
                        "location":           user["location"],
                        "crops":              user["crops"],
                        "latitude":           user["latitude"],
                        "longitude":          user["longitude"],
                        "state":              user["state"],
                        "district":           user["district"],
                        "excess_resources":   user["excess_resources"],
                        "required_resources": user["required_resources"],
                        "whatsapp_number":    user["whatsapp_number"],
                    }
                )
                db.commit()
                db.close()
                print(f"DB DIRECT SEED: {user['name']} ({user['location']})")
                success_count += 1
            except Exception as dbe:
                print(f"DB direct seed failed: {dbe}")
                
    print(f"Seeding complete. Successfully registered {success_count}/{len(mock_users)} farmers.")

if __name__ == "__main__":
    seed()
