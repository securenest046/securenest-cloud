# SecureVault: Personal Encryption Hub

SecureVault is a high-security, professional file management platform designed to provide users with a private, encrypted "nest" for their most sensitive data. Built with production-ready hardening and a clean, accessible interface, SecureVault bridges the gap between complex cryptography and user-friendly design.

## Key Features

- **End-to-End Security**: Every file is encrypted using industry-standard AES-256 before being stored.
- **Smart File Management**: Advanced drag-and-drop relocation, folder nesting, and high-density multi-select toolbars.
- **Identity Hardening**: Multi-factor authentication via NodeMailer OTP and secure Firebase session management.
- **Modern Dashboard**: A premium, "glassmorphism" inspired interface with real-time telemetry and storage analytics.
- **Privacy First**: Access high-level actions (like viewing your encryption key) is protected by platform-level re-authentication.

---

## Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Vanilla CSS (Custom Design System)
- **Icons**: Lucide-React
- **State/Auth**: Firebase Authentication + Custom Context Providers
- **API Client**: Axios

### Backend
- **Server**: Node.js + Express 5
- **Database**: MongoDB (Mongoose ODM)
- **Security**: Helmet, Express-Mongo-Sanitize, Express-Rate-Limit
- **Storage/Mail**: Multer, Nodemailer, Telegram Bot API Integration
- **Admin**: Firebase Admin SDK

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Instance (Atlas or Local)
- Firebase Project (Web + Service Account)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/securenest046/securenest-cloud.git
   cd SecureNest
   ```

2. **Backend Setup**
   ```bash
   cd securenest-backend
   npm install
   ```
   - Create a `.env` file (see [Environment Variables](#environment-variables)).
   - Start the server: `npm start`

3. **Frontend Setup**
   ```bash
   cd ../securenest-frontend
   npm install
   ```
   - Create a `.env` file with your Firebase config.
   - Start the dev server: `npm run dev`

---

## Environment Variables

### Backend (`/securenest-backend/.env`)
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
TELEGRAM_BOT_TOKEN=your_bot_token
# Add your Firebase Service Account JSON keys here or via filepath
```

### Frontend (`/securenest-frontend/.env`)
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_BACKEND_URL=http://localhost:5000
```

---

## Security Hardening

SecureVault has undergone extensive "Language and UI Hardening" to ensure production readiness:
- **Jargon Purge**: Replaced technical jargon (e.g., "AES-GCM Entropy Mapping") with professional English ("Encrypting files").
- **Transient Interaction**: Eliminated annoying "Understand" popups for status messages in favor of drop-down center toasts.
- **Mobile Compression**: The multi-select toolbar dynamically collapses into an icon-only "Action Hub" on small screens.
- **Identity Sync**: Hardened identity propagation to ensure user display names sync correctly across all hubs.

---

## License
This project is licensed under the [MIT License](https://github.com/securenest046/securenest-cloud/blob/main/LICENSE).

**Mission Certified & Production Ready.**
