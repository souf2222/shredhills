# Shredhills App - UnRAID Setup Guide

## Prerequisites

1. **Install Docker** on UnRAID (from Community Apps)
2. **Get Firebase credentials**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Open your project → Project Settings → General → Your apps → Web app
   - Copy the `firebaseConfig` values

## Setup Steps

### 1. Create Docker Volume for Persistent Data (Optional)

If you want to modify the .env file inside the container:

```
Docker → Add Container
Name: shredhills-app
Repository: node:20-alpine
Volume: /app -> /mnt/cache/shredhills
```

### 2. Environment Variables

Create a `.env` file in the app directory:

```
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=shredhills.firebaseapp.com
FIREBASE_PROJECT_ID=shredhills
FIREBASE_STORAGE_BUCKET=shredhills.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Build and Run (Development Mode)

```bash
# Build the image
docker build -t shredhills-app .

# Run the container
docker run -d \
  --name shredhills-app \
  -p 3000:3000 \
  --env-file .env \
  shredhills-app
```

### 4. Or use Docker Compose

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Firebase credentials
nano .env

# Start
docker compose up -d
```

## UnRAID Specific

### Using UnRAID WebUI:

1. **Add Container** → Search "shredhills" (after adding template)
2. **Template Variables**:
   - `[ ] Always Enabled`
   - **Config Paths**:
     - `/config`: where .env file is stored
   - **Port**: 3000
   - **Volume**: mount a share to `/app` for persistent storage

### Using Portainer (Alternative):

1. Install Portainer from Community Apps
2. Stacks → Add Stack
3. Paste the docker-compose.yml
4. Set environment variables in the stack config
5. Deploy

## Quick Start (Pre-built)

For testing without building locally:

```bash
# Use nginx Alpine as base, inject Firebase config at runtime
docker run -d \
  --name shredhills \
  -p 3000:80 \
  -e FIREBASE_API_KEY=your_key \
  -e FIREBASE_PROJECT_ID=your_project \
  nginx:alpine
```

## Troubleshooting

### Container won't start:
- Check environment variables are set correctly
- Check port 3000 is not already in use

### Firebase errors:
- Ensure Anonymous auth is enabled in Firebase Console → Authentication → Sign-in method
- Check Firestore security rules allow authenticated users

### View logs:
```bash
docker logs shredhills-app
```