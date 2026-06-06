# Architecture Spike: DXF (CAD) Parsing Strategies

## Objective
Evaluate the best technical approach to extract room dimensions and materials from `.dxf` (CAD) files to integrate with our parametric budget calculation engine.

## Context
Our system currently relies on Google's Gemini Multimodal AI (Flash/Pro) to parse unstructured data (JPG, PNG, PDF). However, `.dxf` is a structured vector format standard in architecture, containing exact geometry but often lacking semantic meaning (e.g., a "room" is just a collection of intersecting lines).

## Evaluated Approaches

### Option 1: Native Python Parsing (`ezdxf`)
- **How it works:** Use the `ezdxf` Python library to parse the `.dxf` file, read layers, and extract entities (lines, polylines, text).
- **Pros:** 
  - Free and runs locally within our FastAPI backend.
  - Extracts 100% mathematically accurate dimensions.
- **Cons:** 
  - Extremely complex to reconstruct semantics (identifying which lines form a "bedroom" vs a "bathroom").
  - Vulnerable to messy CAD files where architects don't use standardized layers.

### Option 2: AutoCAD / Autodesk Forge MCP (API)
- **How it works:** Utilize an official AutoCAD integration or Model Context Protocol to query the structured data using Autodesk's cloud APIs.
- **Pros:** 
  - Relies on industry-standard proprietary algorithms that might offer better semantic grouping if the file uses Autodesk standards.
- **Cons:** 
  - Introduces a strong dependency on a paid, third-party API.
  - Slower latency due to external cloud processing overhead.

### Option 3: DXF to Image/SVG Conversion + Gemini Multimodal
- **How it works:** Convert the `.dxf` file to a high-resolution PNG or PDF (using tools like `ezdxf.addons.drawing` or `matplotlib`), and then pass the resulting image to Gemini, exactly as we do for standard images.
- **Pros:** 
  - Reuses our existing `AIParsingService` infrastructure entirely.
  - Gemini excels at semantic understanding (it can "see" the shape of a room and read the textual labels like "Living Room - 15m2").
  - Fastest time-to-market.
- **Cons:** 
  - Slight loss of mathematical precision compared to native vector reading (relies on the AI reading the dimension lines correctly).

## Recommendation
**Proceed with Option 3 (DXF to Image Conversion + Gemini) for the MVP.** 

Reusing the Gemini vision engine provides the best balance of semantic understanding and development speed. We can build a simple conversion pipeline in FastAPI using `ezdxf` to rasterize the file into a PNG before passing it to the current pipeline. If mathematical precision becomes an issue in production, we can explore combining Option 1 and Option 3 (using `ezdxf` to extract text labels and passing them alongside the image to Gemini to ground the AI's measurements).