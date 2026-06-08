import re
import logging
import httpx

logger = logging.getLogger(__name__)

def parse_bc3_line(line: str) -> dict | None:
    """
    Parses a single FIEBDC-3 (BC3) line starting with '~C' (Concept).
    Format standard: ~C|code|unit|price|description|...
    """
    if not line.startswith("~C|"):
        return None
        
    parts = line.strip().split("|")
    if len(parts) < 5:
        return None
        
    code = parts[1].strip()
    unit = parts[2].strip()
    
    # Clean price value
    price_str = parts[3].strip()
    try:
        price = float(price_str) if price_str else 0.0
    except ValueError:
        price = 0.0
        
    description = parts[4].strip()
    
    return {
        "code": code,
        "unit": unit,
        "price": price,
        "description": description
    }

def fetch_and_parse_cype_bc3(code: str, province: str = "asturias") -> dict | None:
    """
    Downloads and parses a CYPE .bc3 file dynamically from CYPE's public servers.
    The path is entirely deterministic based on the Spanish province and item chapter.
    """
    # Exclude invalid inputs
    if not code or len(code) < 3:
        return None
        
    # First 3 characters represent the chapter/category directory (e.g. DPT, REV, INS)
    chapter = code[:3].upper()
    
    # Localize URL path
    prov = province.lower().strip()
    # Normalize double underscores or separators if needed
    cleaned_code = code.strip()
    
    url = f"https://doc.generadordeprecios.info/{prov}/rehabilitacion/_bc3_2_din/{chapter}/{cleaned_code}.bc3"
    
    logger.info(f"Downloading CYPE BC3 file from: {url}")
    try:
        response = httpx.get(url, timeout=10.0)
        if response.status_code != 200:
            logger.warning(f"Failed to fetch BC3 from CYPE. Status: {response.status_code}")
            return None
            
        # Parse content (BC3 files are historically Latin-1/ISO-8859-1 in Spain)
        content_text = response.content.decode("latin-1", errors="ignore")
        
        # Scan for matching Concept line (~C|[code]|)
        for line in content_text.splitlines():
            if line.startswith(f"~C|{cleaned_code}|"):
                parsed = parse_bc3_line(line)
                if parsed:
                    return parsed
                    
        logger.warning(f"CYPE BC3 file loaded successfully, but code '{cleaned_code}' was not found inside its concept definitions.")
        return None
    except Exception as e:
        logger.error(f"Error fetching or parsing CYPE BC3 file: {str(e)}")
        return None
