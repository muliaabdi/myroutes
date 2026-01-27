# 🏍️ Route Planning & CCTV Monitoring

Plan your journey with interactive maps featuring real-time CCTV cameras along your route. Search locations, set origin/destination points, and view nearby traffic cameras with live streaming video feeds.

![MyRoutes](https://img.shields.io/badge/Next.js-13.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

**🔗 Live Demo:** [https://myroutes.muliaabdi.net](https://myroutes.muliaabdi.net/)

## ✨ Features

- **🗺️ Interactive Route Planning**
  - Click on map to set origin (A) and destination (B)
  - Search for locations by name
  - Real-time route calculation with distance & duration

- **📹 CCTV Camera Integration**
  - View live CCTV cameras along your route
  - Navigate between cameras with Previous/Next buttons
  - Cameras sorted by route order (origin to destination)
  - HLS video streaming with CORS proxy support
  - Stream error handling for offline cameras

- **🎨 Multiple Map Styles**
  - Voyager (default)
  - OpenStreetMap
  - Satellite
  - Dark mode

- **🚦 Traffic Overlay**
  - Optional Mapbox Traffic layer for real-time traffic conditions

## 🛠️ Tech Stack

- **Frontend:** Next.js 13.5, React 18, TypeScript
- **Maps:** Leaflet, OSRM (Open Source Routing Machine)
- **Geocoding:** LocationIQ API
- **Video:** HLS.js for stream playback
- **Styling:** Tailwind CSS

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/myroutes.git
cd myroutes

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Configuration

Create a `.env.local` file in the root directory:

```env
# LocationIQ API Key (get free at https://locationiq.com/)
NEXT_PUBLIC_LOCATIONIQ_API_KEY=your_api_key_here

# Optional: Mapbox Traffic (requires Mapbox token)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

### Getting LocationIQ API Key

1. Go to [LocationIQ](https://locationiq.com/)
2. Sign up for free account (5,000 requests/day)
3. Get your API key from the dashboard
4. Add it to your `.env.local` file

## 🚀 Usage

1. **Set Origin (A)**
   - Click "Set Origin (A)" button
   - Either search for a location OR click directly on the map

2. **Set Destination (B)**
   - Click "Set Destination (B)" button
   - Either search for a location OR click directly on the map

3. **Calculate Route**
   - Click "Calculate Route" button
   - View route distance and duration
   - See nearby CCTV cameras along the route

4. **View CCTV Cameras**
   - Click on any CCTV marker on the map
   - Or click on CCTV list in sidebar
   - Use Previous/Next buttons to navigate between cameras
   - Click "Open Stream in New Tab" if stream fails to load

## 🌐 API Routes

- `/api/route` - Calculate route using OSRM
- `/api/geocode` - Search locations using LocationIQ
- `/api/proxy-stream` - Proxy CCTV streams to bypass CORS

## 🤖 CCTV Data Scraper

This project includes a Python scraper to collect CCTV data from multiple sources in the Bandung & Cimahi region.

### Running the Scraper

The scraper can be run using Docker (recommended):

```bash
docker run --rm -v "$(pwd):/app" -w /app python:3-alpine sh -c "pip install requests beautifulsoup4 && python scraper.py"
```

This will:
1. Scrape CCTV data from all sources
2. Geocode locations for Cimahi CCTVs
3. Save to `src/data/cctvs.json`

### Scraper Details

The [`scraper.py`](scraper.py) script collects CCTV data from:

| Source | Region | Cameras | Data Type |
|--------|--------|---------|-----------|
| ATCS Kota Bandung | Kota Bandung | 34 | AJAX API |
| Pelindung | Kota Bandung | 395 | REST API |
| Dishub Kab. Bandung | Kab. Bandung | 8 | JavaScript array |
| Dishub KBB | Bandung Barat | 58 | JSON API |
| SmartCity Cimahi | Kota Cimahi | 11 | HTML scraping |

### Updating CCTV Data

To update the CCTV data:

```bash
# Run the scraper
docker run --rm -v "$(pwd):/app" -w /app python:3-alpine sh -c "pip install requests beautifulsoup4 && python scraper.py"

# Or with Python locally (requires Python 3, requests, beautifulsoup4)
pip install requests beautifulsoup4
python scraper.py
```

The scraper will output progress for each source and save the combined data to `src/data/cctvs.json`.

### Adding New CCTV Sources

To add a new CCTV source, edit [`scraper.py`](scraper.py) and:

1. Add a new method `scrape_your_source(self)`
2. Implement scraping logic for that source
3. Add `self.scrape_your_source()` to the `__main__` section

Example structure:
```python
def scrape_your_source(self):
    """Scraping Your Source"""
    self.log("SOURCE", "Memulai scraping...")
    url = "https://example.com/api/cctv"
    try:
        # Scraping logic here
        pass
    except Exception as e:
        self.log("SOURCE", f"Gagal: {e}")
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OSRM](http://project-osrm.org/) - Open Source Routing Machine
- [LocationIQ](https://locationiq.com/) - Geocoding API
- [Leaflet](https://leafletjs.com/) - Open-source JavaScript library for mobile-friendly interactive maps
- [Mapbox](https://www.mapbox.com/) - Map tiles and traffic overlay

### CCTV Data Sources

Traffic camera data sourced from:

- **Kota Bandung** - [Dishub Kota Bandung](https://atcs-dishub.bandung.go.id/) (ATCS) & [Pelindung](https://pelindung.bandung.go.id:8443/)
- **Kabupaten Bandung** - [Dishub Kabupaten Bandung](https://dishub.bandungkab.go.id/cctv/)
- **Bandung Barat** - [Dishub KBB](https://atcs.bandungbaratkab.go.id/)
- **Kota Cimahi** - [SmartCity Cimahi](https://smartcity.cimahikota.go.id/cctv) (approximate coordinates)

**Total: 528+ CCTV cameras** across the Bandung & Cimahi region

---

Made with ❤️ for safer travels in Bandung
