# Adminova License Portal (`adminova-license-portal`)

[![React 19](https://img.shields.io/badge/React-19.x-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?logo=vite)](https://vitejs.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Hosting-FFCA28.svg?logo=firebase)](https://firebase.google.com)
[![Cryptography](https://img.shields.io/badge/Crypto-RSA--2048%20%2F%20SHA--256-green.svg?logo=shield)](https://github.com/kjur/jsrsasign)

The **Adminova License Portal** is the centralized, cloud-hosted administrative dashboard used by the software vendor to issue, activate, configure, and monitor Adminova SIMS installations.

---

## 🔑 Key Capabilities

- **Institute Registry:** Manage client schools, colleges, student capacity quotas, and assigned modules.
- **Disposable Token Generation:** Issues secure one-time activation tokens (`SIMS-TOK-XXXX-XXXX`) linked to client orders.
- **Cryptographic Asymmetric Signing:** Uses in-browser WebCrypto and `jsrsasign` to generate RSA-2048 private/public key pairs and produce tamper-proof digital signatures signed with SHA-256.
- **Hardware Binding Management:** Tracks and validates Motherboard BIOS UUIDs (`Win32_ComputerSystemProduct.UUID`) sent during client installation activation.
- **Modular Feature Gating:** Allows toggling modules (Timetables, WhatsApp gateway, Financial Billing, Examination) remotely per license tier.
- **One-Click Token Reset:** Allows re-binding or resetting an activation token if a school upgrades or changes their host server hardware.

---

## 🛠️ Tech Stack

- **UI Framework:** React 19 + TypeScript
- **Bundler:** Vite 8.x
- **Linter:** Oxlint (High-performance Rust-based linter)
- **Styling:** Tailwind CSS + Lucide Icons
- **Cloud Backend:** Google Cloud Firebase (Cloud Firestore + Firebase Hosting)
- **Cryptographic Library:** `jsrsasign` (Pure JavaScript RSA & PKCS#1 v1.5 / PSS signing)

---

## 📂 Project Structure

```
adminova-license-portal/
├── src/
│   ├── components/         # Modal dialogues, School List, Key Manager, Token Creator
│   ├── services/
│   │   ├── cryptoService.ts   # RSA-2048 keypair generator & SHA-256 signer
│   │   ├── firebase.ts        # Firebase app initialization & Firestore client
│   │   └── schoolService.ts   # CRUD operations for institutions and licenses
│   ├── types/              # TypeScript interfaces (LicenseData, SchoolRecord, etc.)
│   ├── App.tsx             # Root dashboard interface
│   └── main.tsx            # Vite React entry point
├── firebase.json           # Firebase Hosting routing & cache headers
└── firestore.rules         # Cloud Firestore security rules
```

---

## 🚀 Development & Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build & Firebase Hosting Deploy
```bash
# Build production bundle
npm run build

# Deploy directly to Firebase Hosting
npm run deploy
```

---

## 🔒 Security Architecture

1. **Private Key Protection:** Private keys used for signing license payloads are securely managed in the vendor portal and never distributed to client installations.
2. **Public Key Distribution:** Only the corresponding RSA public key is embedded in `sims-app/app/Services/LicenseVerifier.php`.
3. **Payload Verification:** The client application verifies that the signature matches the payload containing the motherboard hardware UUID and expiry timestamp before granting system access.
