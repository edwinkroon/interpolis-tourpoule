# Rider Photo Import Guide

Dit bestand legt uit hoe je foto's voor renners kunt downloaden, verkleinen en toevoegen aan de database.

## Optie 1: Automatisch met Python Script

### Vereisten
```bash
pip install requests pillow psycopg2-binary
```

### Database Configuratie
Stel environment variables in of pas `DB_CONFIG` aan in `download-rider-photos.py`:
- `DB_HOST`: Database host
- `DB_NAME`: Database naam
- `DB_USER`: Database gebruiker
- `DB_PASSWORD`: Database wachtwoord
- `DB_PORT`: Database poort (standaard 5432)

### Uitvoeren
```bash
python imports/download-rider-photos.py
```

Het script zal:
1. Alle renners zonder foto ophalen uit de database
2. Voor elke renner zoeken naar een foto op Wikipedia
3. De foto downloaden en verkleinen tot 40x40px
4. Omzetten naar base64 (JPEG formaat)
5. Opslaan in de `photo_url` kolom als data URL

## Optie 2: Handmatig met SQL

Je kunt ook handmatig base64 data toevoegen via SQL:

```sql
UPDATE riders 
SET photo_url = 'data:image/jpeg;base64,YOUR_BASE64_DATA_HERE' 
WHERE id = 1;
```

### Base64 Formaat
De foto's moeten in dit formaat worden opgeslagen:
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
```

## Foto Verkleinen (Handmatig)

Als je handmatig foto's wilt verkleinen:

1. **Online tool**: Gebruik een tool zoals [TinyPNG](https://tinypng.com/) of [Squoosh](https://squoosh.app/)
2. **Python script**:
```python
from PIL import Image
import base64
import io

# Open image
img = Image.open('rider-photo.jpg')
img = img.resize((40, 40), Image.Resampling.LANCZOS)

# Convert to base64
buffer = io.BytesIO()
img.save(buffer, format='JPEG', quality=85)
img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

# Create data URL
data_url = f"data:image/jpeg;base64,{img_base64}"
print(data_url)
```

## Opmerkingen

- Foto's worden opgeslagen als 40x40px JPEG met 85% kwaliteit
- Base64 data kan groot zijn (~5-10KB per foto)
- Het Python script probeert eerst de volledige naam, dan alleen de achternaam op Wikipedia
- Als er geen foto wordt gevonden, wordt de renner overgeslagen

