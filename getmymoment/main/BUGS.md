# Get My Moment — Bugs

## Current Status

No confirmed implementation bugs yet because the production codebase has not started.

## Bug Template

```text
ID:
Date:
Severity:
Area:
Title:
Status:
Steps to reproduce:
Expected:
Actual:
Root cause:
Fix:
Regression test:
```

## Planned Test Areas

### Upload
- Interrupted upload
- Duplicate file
- Corrupt image
- Unsupported format
- Very large image
- Same filename/different content

### AI
- No face
- Multiple faces in selfie
- Low-light selfie
- Side face
- Blurry selfie
- False match
- No match
- Similar-looking people
- Group photo

### Guest
- Invalid mobile
- OTP expiry
- Camera permission denied
- Selfie upload failure
- Slow network
- Refresh during matching

### Security
- Cross-event access
- Cross-photographer access
- Expired QR
- Unauthorized download
- Path traversal
- Rate-limit bypass

### Storage
- Disk full
- Thumbnail failure
- Original missing
- Partial upload
- Worker crash
- Retry loop

## Critical Rule

Any issue that can expose another guest's photos or another event's data is **Critical** and blocks pilot release until fixed.
