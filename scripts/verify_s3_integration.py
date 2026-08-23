#!/usr/bin/env python3
"""
Get My Moment — Non-Customer S3 Integration Verification Script (P1-BATCH-02)
Performs end-to-end synthetic verification using IAM Instance Profile credentials:
1. PUT synthetic test object in integration-tests/<uuid>/
2. HEAD / exists check
3. GET / download & byte comparison
4. SSE-S3 AES-256 encryption validation
5. Presigned GET URL generation & download
6. DELETE test object
7. Verification that object is 100% removed
8. Public-access negative check (verifying 403 Forbidden anonymously)
"""

import sys
import uuid
import urllib.request
import urllib.error
import logging
from apps.api.services.s3_storage import S3StorageService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("s3_integration_test")


def run_integration_test(bucket_name: str, region: str = "eu-north-1"):
    logger.info(f"Starting S3 Integration Verification on bucket: '{bucket_name}' (Region: {region})")
    test_id = str(uuid.uuid4())
    test_key = f"integration-tests/{test_id}/test_payload.txt"
    test_content = f"GetMyMoment-Synthetic-Integration-Test-Payload-UUID-{test_id}".encode("utf-8")

    s3_svc = S3StorageService(bucket_name=bucket_name, region=region)
    client = s3_svc._get_client()

    try:
        # Step 1: PUT Object with SSE-S3
        logger.info(f"1. Testing PUT test object: {test_key}")
        client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=test_content,
            ContentType="text/plain",
            ServerSideEncryption="AES256",
            Metadata={"test_id": test_id, "purpose": "synthetic_integration_test"}
        )
        logger.info("   -> PUT OK")

        # Step 2: HEAD / exists check & SSE-S3 verification
        logger.info("2. Testing HEAD & Encryption verification...")
        head = client.head_object(Bucket=bucket_name, Key=test_key)
        sse = head.get("ServerSideEncryption")
        logger.info(f"   -> Server-Side Encryption confirmed: {sse}")
        assert sse == "AES256", f"Expected SSE-S3 AES256, got {sse}"

        # Step 3: GET / download verification
        logger.info("3. Testing GET object download...")
        downloaded = s3_svc.get_file_bytes(test_key)
        assert downloaded == test_content, "Downloaded payload does not match original!"
        logger.info("   -> Content integrity 100% verified.")

        # Step 4: Presigned URL verification
        logger.info("4. Testing Presigned GET URL generation...")
        presigned_url = s3_svc.get_presigned_url(test_key, expires_in=300)
        logger.info("   -> Presigned URL generated successfully.")
        
        req = urllib.request.Request(presigned_url, headers={"User-Agent": "GMM-IntegrationTest/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            presigned_content = resp.read()
            assert presigned_content == test_content
            logger.info("   -> Download via Presigned URL HTTP 200 OK.")

        # Step 5: Anonymous / Public-access negative check
        logger.info("5. Testing Anonymous Public Access Denial (Negative Security Test)...")
        raw_public_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{test_key}"
        try:
            with urllib.request.urlopen(raw_public_url, timeout=5) as resp:
                logger.error("   -> SECURITY FAILURE: Object is publicly readable!")
                sys.exit(1)
        except urllib.error.HTTPError as e:
            if e.code in [403, 400]:
                logger.info(f"   -> Expected Public Access Denied (HTTP {e.code}) — Block Public Access is ACTIVE.")
            else:
                logger.warning(f"   -> Unexpected HTTP response on anonymous probe: {e.code}")

        # Step 6: DELETE test object
        logger.info("6. Testing DELETE test object...")
        delete_success = s3_svc.delete_file(test_key)
        assert delete_success is True, "Delete operation failed!"
        logger.info("   -> DELETE OK.")

        # Step 7: Confirm object no longer exists
        logger.info("7. Confirming object existence returns False...")
        assert s3_svc.object_exists(test_key) is False, "Object still exists after deletion!"
        logger.info("   -> Object removal confirmed.")

        logger.info("==================================================")
        logger.info("ALL S3 INTEGRATION VERIFICATION CHECKS PASSED (100%)")
        logger.info("==================================================")

    except Exception as e:
        logger.error(f"S3 Integration Test Failed: {e}", exc_info=True)
        # Attempt cleanup
        try:
            client.delete_object(Bucket=bucket_name, Key=test_key)
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    bucket = sys.argv[1] if len(sys.argv) > 1 else "getmymoment-media-prod-347447669372-eunorth1"
    region = sys.argv[2] if len(sys.argv) > 2 else "eu-north-1"
    run_integration_test(bucket, region)

