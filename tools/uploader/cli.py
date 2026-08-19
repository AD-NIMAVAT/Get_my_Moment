"""
Get My Moment - High-Speed Batch Photo Uploader CLI Tool
"""

import os
import sys
import argparse
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed


def parse_args():
    parser = argparse.ArgumentParser(
        description="Get My Moment - High-Speed Photographer Batch Photo Uploader"
    )
    parser.add_argument("--dir", required=True, help="Path to local folder containing event photos")
    parser.add_argument("--event-id", required=True, help="Target Event UUID")
    parser.add_argument("--api-url", default="http://localhost:8000/api/v1", help="API base URL")
    parser.add_argument("--token", help="Photographer JWT access token")
    parser.add_argument("--email", help="Photographer email for auto-login")
    parser.add_argument("--password", help="Photographer password for auto-login")
    parser.add_argument("--batch-size", type=int, default=10, help="Number of photos per batch")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent upload workers")
    return parser.parse_args()


def authenticate(api_url: str, email: str, password: str) -> str:
    """Log in and retrieve JWT token."""
    login_url = f"{api_url.rstrip('/')}/auth/login"
    res = requests.post(login_url, json={"email": email, "password": password})
    if res.status_code != 200:
        print(f"[!] Authentication failed: {res.text}")
        sys.exit(1)
    return res.json()["access_token"]


def collect_image_files(directory: str):
    """Recursively discover JPEG, PNG, and WebP images."""
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}
    images = []
    for root, _, files in os.walk(directory):
        for f in files:
            if Path(f).suffix.lower() in supported_exts:
                images.append(os.path.join(root, f))
    return sorted(images)


def upload_batch(api_url: str, event_id: str, token: str, file_paths: list):
    """Upload a batch of files to the event."""
    url = f"{api_url.rstrip('/')}/events/{event_id}/photos"
    headers = {"Authorization": f"Bearer {token}"}

    files = []
    opened_files = []
    try:
        for p in file_paths:
            f = open(p, "rb")
            opened_files.append(f)
            files.append(("files", (os.path.basename(p), f, "image/jpeg")))

        res = requests.post(url, headers=headers, files=files)
        if res.status_code == 201:
            data = res.json()
            return data["uploaded_count"], data["duplicates_count"], data["failed_count"]
        else:
            print(f"[!] Batch upload error ({res.status_code}): {res.text}")
            return 0, 0, len(file_paths)
    finally:
        for f in opened_files:
            f.close()


def main():
    args = parse_args()
    print("=" * 60)
    print("  Get My Moment - High-Speed Batch Photo Ingest CLI")
    print("=" * 60)

    # 1. Obtain token
    token = args.token
    if not token:
        if not args.email or not args.password:
            print("[!] Error: Either --token or both --email and --password are required.")
            sys.exit(1)
        print(f"[*] Authenticating photographer {args.email}...")
        token = authenticate(args.api_url, args.email, args.password)
        print("[+] Authentication successful.")

    # 2. Discover files
    folder = os.path.abspath(args.dir)
    if not os.path.isdir(folder):
        print(f"[!] Directory not found: {folder}")
        sys.exit(1)

    print(f"[*] Scanning directory: {folder}")
    images = collect_image_files(folder)
    total_images = len(images)
    print(f"[+] Found {total_images} photos ready for ingest.")

    if total_images == 0:
        print("[*] No photos found. Exiting.")
        return

    # 3. Create batches
    batches = [images[i:i + args.batch_size] for i in range(0, total_images, args.batch_size)]
    print(f"[*] Uploading in {len(batches)} batches across {args.workers} concurrent workers...")

    total_uploaded = 0
    total_duplicates = 0
    total_failed = 0

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(upload_batch, args.api_url, args.event_id, token, batch): i
            for i, batch in enumerate(batches)
        }

        for future in as_completed(futures):
            batch_idx = futures[future]
            try:
                up, dup, fail = future.result()
                total_uploaded += up
                total_duplicates += dup
                total_failed += fail
                processed = total_uploaded + total_duplicates + total_failed
                pct = (processed / total_images) * 100
                print(f"  [{pct:5.1f}%] Batch {batch_idx + 1}/{len(batches)}: +{up} new, {dup} dups, {fail} fails")
            except Exception as e:
                print(f"[!] Error in batch {batch_idx}: {e}")

    print("=" * 60)
    print("  INGEST SUMMARY")
    print("=" * 60)
    print(f"  Total Processed:  {total_images}")
    print(f"  New Photos:       {total_uploaded}")
    print(f"  Duplicates:       {total_duplicates}")
    print(f"  Failed:           {total_failed}")
    print("=" * 60)
    print("[+] All photos dispatched for background face indexing.")


if __name__ == "__main__":
    main()
