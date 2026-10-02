import requests
import re
import json
import time
import os
import urllib3

# Disable SSL warnings for pelindung API
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class BandungCCTVScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        }
        self.master_list = []

    def log(self, source, message):
        print(f"[{source}] {message}")

    def scrape_kota_bandung(self):
        """Scraping ATCS Kota Bandung (atcs-dishub.bandung.go.id)"""
        self.log("KOTA", "Memulai scraping...")
        base_url = "https://atcs-dishub.bandung.go.id"
        try:
            res_lokasi = requests.post(f"{base_url}/ajax/lokasi", headers=self.headers, timeout=10)
            locations = res_lokasi.json()
            
            for loc in locations:
                id_loc = loc.get('id_lokasi')
                # Ambil daftar ID CCTV per lokasi
                res_list = requests.post(f"{base_url}/ajax/cctv-list", data={'id': id_loc}, headers=self.headers)
                cctv_ids = re.findall(r"showStreamingModal\((\d+)\)", res_list.text)
                
                for c_id in set(cctv_ids):
                    res_info = requests.post(f"{base_url}/ajax/cctv-info", data={'id': c_id}, headers=self.headers)
                    if res_info.status_code == 200:
                        info = res_info.json()
                        self.master_list.append({
                            "id": f"city-{id_loc}-{c_id}",
                            "name": f"KOTA - {loc.get('nama_lokasi')}",
                            "lat": float(loc.get('lat_lokasi')),
                            "lng": float(loc.get('lon_lokasi')),
                            "streamUrl": info.get('src'),
                            "region": "Kota Bandung"
                        })
                time.sleep(0.05)
            self.log("KOTA", f"Berhasil mengambil {len(locations)} lokasi.")
        except Exception as e:
            self.log("KOTA", f"Gagal: {e}")

    def scrape_bandung_barat(self):
        """Scraping ATCS Bandung Barat (atcs.bandungbaratkab.go.id)"""
        self.log("KBB", "Memulai scraping...")
        url = "https://atcs.bandungbaratkab.go.id/get-cctv"
        try:
            res = requests.get(url, headers=self.headers, timeout=10)
            data = res.json()
            if data.get("status") == "success":
                for i, item in enumerate(data.get("data", [])):
                    coords = item.get("koordinat", "0,0").split(",")
                    stream_url = item.get("link", "").replace(".html", ".m3u8").replace("id/", "id/memfs/")
                    self.master_list.append({
                        "id": f"kbb-{i}",
                        "name": f"KBB - {item.get('nama_cctv')}",
                        "lat": float(coords[0].strip()),
                        "lng": float(coords[1].strip()),
                        "streamUrl": stream_url,
                        "region": "Bandung Barat"
                    })
            self.log("KBB", "Berhasil mengambil data.")
        except Exception as e:
            self.log("KBB", f"Gagal: {e}")

    def scrape_kab_bandung(self):
        """Scraping Dishub Kabupaten Bandung (dishub.bandungkab.go.id)"""
        self.log("KAB", "Memulai scraping...")
        url = "https://dishub.bandungkab.go.id/cctv/"
        try:
            res = requests.get(url, headers=self.headers, timeout=10)
            html = res.text

            # Ambil hanya blok cctvData aktif (sebelum komentar /*)
            active_block = re.search(r'const\s+cctvData\s*=\s*\[(.*?)\];', html, re.DOTALL)
            target_html = active_block.group(1) if active_block else html

            # Cari array CCTV data di JavaScript
            # Pattern: { id: 1, name: "NAME", code: "SP", coordinates: [lat, lng], streamUrl: "URL" }
            pattern = r'\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*code:\s*"([^"]*)",\s*coordinates:\s*\[([^\]]+)\],\s*streamUrl:\s*"([^"]+)"\s*\}'
            matches = re.findall(pattern, target_html)

            count = 0
            for match in matches:
                cctv_id, name, code, coords, stream_url = match
                # Parse coordinates [lat, lng]
                coords = coords.split(',')
                lat = float(coords[0].strip())
                lng = float(coords[1].strip())

                self.master_list.append({
                    "id": f"kab-{cctv_id}",
                    "name": f"KAB - {name}",
                    "lat": lat,
                    "lng": lng,
                    "streamUrl": stream_url,
                    "region": "Kabupaten Bandung"
                })
                count += 1

            self.log("KAB", f"Berhasil mengambil {count} data.")
        except Exception as e:
            self.log("KAB", f"Gagal: {e}")

    def scrape_pelindung(self):
        """Scraping Pelindung Kota Bandung (pelindung.bandung.go.id:8443)"""
        self.log("PELINDUNG", "Memulai scraping...")
        url = "https://pelindung.bandung.go.id:8443/api/cek"
        try:
            res = requests.get(url, headers=self.headers, timeout=10, verify=False)
            data = res.json()

            count = 0
            for item in data:
                self.master_list.append({
                    "id": f"pelindung-{item.get('id', '')}",
                    "name": f"PELINDUNG - {item.get('cctv_name', '')}",
                    "lat": float(item.get('lat', 0)),
                    "lng": float(item.get('lng', 0)),
                    "streamUrl": item.get('stream_cctv', ''),
                    "region": "Kota Bandung"
                })
                count += 1

            self.log("PELINDUNG", f"Berhasil mengambil {count} data.")
        except Exception as e:
            self.log("PELINDUNG", f"Gagal: {e}")

    def scrape_cimahi(self):
        """Scraping Kota Cimahi CCTV (smartcity.cimahikota.go.id/cctv)"""
        self.log("CIMAH", "Memulai scraping...")
        url = "https://smartcity.cimahikota.go.id/cctv"

        # Known coordinates for key Cimahi locations
        # Based on common knowledge of Cimahi street intersections
        cimahi_locations = {
            "Bunderan Pemkot": (-6.873020190339506, 107.55486525311575),
            "Cimindi": (-6.89647988119668, 107.56045292954839),
            "Pasar Atas": (-6.870289335243315, 107.54360928338612),
            "Cihanjuang": (-6.878116774285018, 107.54929931957862),
            "Kebon Kopi": (-6.904906367366839, 107.56561572466714),
            "Citeureup": (-6.8612250331310385, 107.54458679660554),
            "Melong": (-6.920302209533734, 107.56979081642228),
        }

        try:
            res = requests.get(url, headers=self.headers, timeout=10)
            html = res.text

            # Extract CCTV IDs
            cctv_ids = re.findall(r'run\("(\d+)"\)', html)

            # Extract CCTV names (lines starting with Jl)
            cctv_names = re.findall(r'<p>(Jl[^<]+)</p>', html)

            # Pair IDs with names (they should be in the same order)
            count = 0
            for i, cctv_id in enumerate(cctv_ids):
                if i < len(cctv_names):
                    cctv_name = cctv_names[i].strip()
                else:
                    cctv_name = f"CCTV {cctv_id}"

                # Cimahi CCTV stream URL pattern
                stream_url = f"https://smartcity.cimahikota.go.id/video/{cctv_id}/video{cctv_id}.m3u8"

                # Find coordinates based on location keywords
                lat, lng = -6.8747, 107.5396  # Default: Cimahi city center
                for keyword, coords in cimahi_locations.items():
                    if keyword.lower() in cctv_name.lower():
                        lat, lng = coords
                        break

                self.master_list.append({
                    "id": f"cimahi-{cctv_id}",
                    "name": f"CIMAHI - {cctv_name}",
                    "lat": lat,
                    "lng": lng,
                    "streamUrl": stream_url,
                    "region": "Kota Cimahi"
                })
                count += 1

            self.log("CIMAH", f"Berhasil mengambil {count} data.")
        except Exception as e:
            self.log("CIMAH", f"Gagal: {e}")

    def scrape_spklu_bandung(self):
        """Scraping SPKLU khusus Bandung dari spklu.web.id"""
        self.log("SPKLU", "Memulai scraping SPKLU Bandung...")
        url = "https://spklu.web.id/wp-content/themes/spklu-web/data/spklu_data.json"
        try:
            res = requests.get(url, headers=self.headers, timeout=15)
            if res.status_code == 200:
                data = res.json()
                lk = data.get("lookup", {})
                speeds = lk.get("speeds", ['DC Ultra Fast', 'DC Fast Charging', 'Medium Charging', 'Standard AC'])
                kats = lk.get("kats", lk.get("kategori", ['Rest Area Tol', 'Mall / Pusat Belanja', 'Hotel / Penginapan', 'Kantor PLN', 'Dealer / Bengkel', 'Dealer / Bengkel Wuling', 'SPBU', 'Area Publik']))
                sokets = lk.get("sokets", ['CCS2 & CHAdeMO', 'Type 2 (AC)', 'GB/T (Wuling)', 'GB/T (Wuling) & AC Type 2', 'Multi-socket'])

                raw_items = data.get("data", [])
                spklus = []
                for idx, item in enumerate(raw_items):
                    try:
                        lat = float(item[3])
                        lng = float(item[4])
                        city = str(item[2] or "").strip()
                        city_lower = city.lower()

                        # Exclude other cities
                        if any(c in city_lower for c in ["garut", "sumedang", "subang", "purwakarta", "palembang"]):
                            continue

                        # Filter for Bandung & Cimahi
                        is_bandung_city = "bandung" in city_lower or "cimahi" in city_lower
                        is_bandung_coord = (-7.20 <= lat <= -6.70) and (107.38 <= lng <= 107.88)

                        if is_bandung_city or is_bandung_coord:
                            speed_idx = item[6] if isinstance(item[6], int) and 0 <= item[6] < len(speeds) else None
                            kat_idx = item[8] if isinstance(item[8], int) and 0 <= item[8] < len(kats) else None
                            soket_idx = item[9] if isinstance(item[9], int) and 0 <= item[9] < len(sokets) else None

                            spklus.append({
                                "id": f"spklu-{idx + 1}",
                                "name": item[0] or "",
                                "address": item[1] or "",
                                "city": city,
                                "lat": lat,
                                "lng": lng,
                                "powerKw": int(item[5]) if str(item[5]).isdigit() else 0,
                                "chargingSpeed": speeds[speed_idx] if speed_idx is not None else "Standard",
                                "provider": item[7] or "PLN",
                                "category": kats[kat_idx] if kat_idx is not None else "Area Publik",
                                "plugType": sokets[soket_idx] if soket_idx is not None else "Multi-socket",
                                "is24h": item[10] == 1
                            })
                    except Exception:
                        continue

                self.spklu_list = spklus
                self.log("SPKLU", f"Berhasil memfilter {len(spklus)} SPKLU di wilayah Bandung.")
            else:
                self.log("SPKLU", f"Status HTTP: {res.status_code}")
        except Exception as e:
            self.log("SPKLU", f"Gagal: {e}")

    def save_to_json(self):
        targets = [
            os.path.join("src", "data", "cctvs.json"),
            os.path.join("public", "cctvs.json")
        ]

        for filepath in targets:
            folder = os.path.dirname(filepath)
            if not os.path.exists(folder):
                os.makedirs(folder)
            with open(filepath, "w") as f:
                json.dump(self.master_list, f, indent=2)
            print(f"[DONE] Total {len(self.master_list)} CCTV disimpan ke {filepath}")

        if hasattr(self, "spklu_list") and self.spklu_list:
            spklu_targets = [
                os.path.join("src", "data", "spklus.json"),
                os.path.join("public", "spklus.json")
            ]
            for filepath in spklu_targets:
                folder = os.path.dirname(filepath)
                if not os.path.exists(folder):
                    os.makedirs(folder)
                with open(filepath, "w") as f:
                    json.dump(self.spklu_list, f, indent=2)
                print(f"[DONE] Total {len(self.spklu_list)} SPKLU disimpan ke {filepath}")

if __name__ == "__main__":
    scraper = BandungCCTVScraper()
    scraper.scrape_kota_bandung()
    scraper.scrape_bandung_barat()
    scraper.scrape_kab_bandung()
    scraper.scrape_pelindung()
    scraper.scrape_cimahi()
    scraper.scrape_spklu_bandung()
    scraper.save_to_json()