from skyview.data.db import get_session
from sqlalchemy import text

def run():
    db = get_session()
    try:
        # Check current row
        row = db.execute(text("SELECT phone, name FROM users WHERE phone='+919930679651'")).fetchone()
        print("Before update:", row)
        
        # Perform update
        db.execute(text("""
            UPDATE users 
            SET name='Test Farmer',
                excess_resources='Tractor, Labor', 
                required_resources='Harvester, Organic Compost',
                latitude=19.05,
                longitude=73.00,
                location='Panvel, Maharashtra',
                crops='Wheat, Rice'
            WHERE phone='+919930679651'
        """))
        db.commit()
        
        # Verify update
        updated = db.execute(text("SELECT phone, name, excess_resources, required_resources, latitude, longitude, location, crops FROM users WHERE phone='+919930679651'")).fetchone()
        print("After update:", updated)
    except Exception as e:
        print("Error during update:", e)
    finally:
        db.close()

if __name__ == '__main__':
    run()
