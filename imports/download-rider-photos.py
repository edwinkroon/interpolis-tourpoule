"""
Script to download rider photos, resize to 40x40px, convert to base64, and update database
Requires: pip install requests pillow psycopg2-binary
"""

import requests
from PIL import Image
import base64
import io
import psycopg2
from psycopg2.extras import execute_values
import os
from urllib.parse import quote

# Database connection
# Option 1: Use NEON_DATABASE_URL (connection string) - same as Netlify uses
NEON_DATABASE_URL = os.getenv('NEON_DATABASE_URL')

# Option 2: Use individual connection parameters (if NEON_DATABASE_URL is not set)
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': os.getenv('DB_PORT', '5432')
}

def search_wikipedia_image(name):
    """Search for rider image on Wikipedia"""
    try:
        # Try to get image from Wikipedia API
        search_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(name)}"
        response = requests.get(search_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'thumbnail' in data and 'source' in data['thumbnail']:
                return data['thumbnail']['source']
    except Exception as e:
        print(f"Error searching Wikipedia for {name}: {e}")
    return None

def download_and_process_image(image_url, target_size=(40, 40)):
    """Download image, resize to target size, and convert to base64"""
    try:
        # Download image
        response = requests.get(image_url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        
        # Open and resize image
        img = Image.open(io.BytesIO(response.content))
        
        # Convert to RGB if necessary (for PNG with transparency)
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Resize to 40x40px with high-quality resampling
        img = img.resize(target_size, Image.Resampling.LANCZOS)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Return as data URL
        return f"data:image/jpeg;base64,{img_base64}"
    except Exception as e:
        print(f"Error processing image from {image_url}: {e}")
        return None

def update_rider_photo(conn, rider_id, first_name, last_name, photo_base64):
    """Update rider photo_url in database"""
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE riders SET photo_url = %s WHERE id = %s",
            (photo_base64, rider_id)
        )
        conn.commit()
        print(f"✓ Updated photo for {first_name} {last_name} (ID: {rider_id})")
        return True
    except Exception as e:
        print(f"✗ Error updating {first_name} {last_name}: {e}")
        conn.rollback()
        return False

def main():
    """Main function to process all riders"""
    # Connect to database
    try:
        if NEON_DATABASE_URL:
            # Use connection string (same as Netlify)
            conn = psycopg2.connect(
                NEON_DATABASE_URL,
                sslmode='require'
            )
            print("Connected to database using NEON_DATABASE_URL")
        else:
            # Use individual config parameters
            conn = psycopg2.connect(**DB_CONFIG)
            print("Connected to database using individual config")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("\nTip: Set NEON_DATABASE_URL environment variable")
        print("   or set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT")
        return
    
    # Get all riders without photos
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, first_name, last_name 
        FROM riders 
        WHERE photo_url IS NULL OR photo_url = ''
        ORDER BY last_name, first_name
    """)
    
    riders = cursor.fetchall()
    print(f"Found {len(riders)} riders without photos")
    
    success_count = 0
    fail_count = 0
    
    for rider_id, first_name, last_name in riders:
        full_name = f"{first_name} {last_name}"
        print(f"\nProcessing: {full_name}")
        
        # Try to find image
        image_url = search_wikipedia_image(full_name)
        
        if not image_url:
            # Try with just last name
            image_url = search_wikipedia_image(last_name)
        
        if not image_url:
            print(f"  ✗ No image found for {full_name}")
            fail_count += 1
            continue
        
        print(f"  Found image: {image_url}")
        
        # Download and process image
        photo_base64 = download_and_process_image(image_url)
        
        if photo_base64:
            # Update database
            if update_rider_photo(conn, rider_id, first_name, last_name, photo_base64):
                success_count += 1
            else:
                fail_count += 1
        else:
            print(f"  ✗ Failed to process image for {full_name}")
            fail_count += 1
    
    print(f"\n=== Summary ===")
    print(f"Successfully updated: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Total processed: {len(riders)}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()

