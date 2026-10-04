#!/usr/bin/env python3
"""
check_cctv_status.py
Batch health-checker for CCTV streams in MyRoutes.
Tests stream URLs concurrently and updates online/offline status in cctvs.json.
"""

import json
import os
import time
import requests
import urllib3
from concurrent.futures import ThreadPoolExecutor, as_completed

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

TIMEOUT = 4.0  # seconds per camera probe

def check_stream(cctv):
    stream_url = cctv.get('streamUrl', '').strip()
    cctv_id = cctv.get('id')
    
    if not stream_url:
        return cctv_id, False, "No stream URL"
        
    try:
        # Stream=True reads only headers, does not download the whole media
        with requests.get(
            stream_url,
            headers=HEADERS,
            timeout=TIMEOUT,
            stream=True,
            verify=False,
            allow_redirects=True
        ) as res:
            is_ok = 200 <= res.status_code < 400
            status_code = res.status_code
            res.close()

        # Consider 200-399 as online
        if is_ok:
            return cctv_id, True, f"HTTP {status_code}"
        else:
            return cctv_id, False, f"HTTP {status_code}"
    except requests.exceptions.Timeout:
        return cctv_id, False, "Timeout"
    except requests.exceptions.RequestException as e:
        return cctv_id, False, f"Connection error: {type(e).__name__}"
    except Exception as e:
        return cctv_id, False, str(e)

def run_check(max_workers=30, target_prefix=None):
    json_path = os.path.join("public", "cctvs.json")
    if not os.path.exists(json_path):
        json_path = os.path.join("src", "data", "cctvs.json")
        
    if not os.path.exists(json_path):
        print(f"[ERROR] cctvs.json tidak ditemukan!")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        cctvs = json.load(f)

    to_check = cctvs
    if target_prefix:
        to_check = [c for c in cctvs if c.get('name', '').startswith(target_prefix)]

    total = len(to_check)
    print(f"[*] Memeriksa status {total} CCTV dengan {max_workers} worker threads...")
    
    start_time = time.time()
    results = {}
    online_count = 0
    offline_count = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_cctv = {executor.submit(check_stream, c): c for c in to_check}
        for i, future in enumerate(as_completed(future_to_cctv), 1):
            cctv_id, is_online, reason = future.result()
            results[cctv_id] = is_online
            if is_online:
                online_count += 1
            else:
                offline_count += 1
            if i % 50 == 0 or i == total:
                print(f"[{i}/{total}] Online: {online_count}, Offline: {offline_count}")

    duration = round(time.time() - start_time, 2)
    print(f"[✓] Selesai dalam {duration}s. Online: {online_count}, Offline: {offline_count}")

    # Update in memory
    for c in cctvs:
        if c['id'] in results:
            c['online'] = results[c['id']]

    # Save to both target files
    targets = [
        os.path.join("public", "cctvs.json"),
        os.path.join("src", "data", "cctvs.json")
    ]

    for p in targets:
        if os.path.exists(os.path.dirname(p)):
            with open(p, "w", encoding="utf-8") as f:
                json.dump(cctvs, f, indent=2, ensure_ascii=False)
            print(f"[✓] File tersimpan: {p}")

if __name__ == "__main__":
    import sys
    prefix = sys.argv[1] if len(sys.argv) > 1 else None
    run_check(max_workers=35, target_prefix=prefix)
