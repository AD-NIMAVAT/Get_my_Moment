# 📱 Get My Moment — Flutter Mobile Application

Get My Moment is a cross-platform (Android & iOS) mobile application for Indian wedding & event photography studios and attending guests.

---

## 🌟 Core Modules

1. **Studio Business OS & Authentication**:
   - Multi-step Studio KYC registration (City, State, Experience, GSTIN).
   - Studio profile & custom branding (Logo, Digital Stamp, Watermark).

2. **Event Command Center**:
   - Create & manage wedding events with package pricing and venue details.
   - Batch photo upload with automatic AI face detection dispatch.
   - Dynamic QR Code generator for guest table tents.

3. **Guest Experience & AI Facial Recognition**:
   - Token lookup & event banner presentation.
   - Biometric privacy consent capture.
   - Front camera selfie capture with sub-50ms AI face matching (YuNet & SFace embeddings).
   - High-res photo gallery with 1-click WhatsApp and social sharing.

4. **CRM & WhatsApp Quotations**:
   - Inquiries pipeline with Kanban stages.
   - 1-Click WhatsApp quote generator formatting packages into instant chats.

5. **Finance & GST Billing**:
   - 18% GST Tax Invoices overview.
   - Advance payments, received revenue, and outstanding balance dues.
   - Secure public invoice links (`/i/[token]`).

6. **In-App Studio Helpdesk**:
   - Technical issue logging with urgency levels.
   - 1-Click VIP Priority WhatsApp support with direct engineer escalation.

---

## 🛠️ How to Run & Build

### 1. Prerequisites
- Flutter SDK (>= 3.0.0)
- Android Studio / Xcode

### 2. Install Dependencies
```bash
cd apps/mobile_flutter
flutter pub get
```

### 3. Run on Emulator / Connected Device
```bash
# For Android Emulator:
flutter run

# For Physical Device (Ensure phone is on same Wi-Fi as your backend PC):
# Update ApiService.baseUrl with your PC's Wi-Fi IP (e.g., http://192.168.1.98:8000/api/v1)
flutter run
```

### 4. Build Release Android APK
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```
