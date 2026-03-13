# XVision

**AI-Powered Human Pose Detection** — Real-time body tracking using your camera and MediaPipe AI.

No data leaves your device. Everything runs in the browser.

## Features

- **Real-time pose detection** — 33 body landmarks tracked at 30+ FPS
- **Works on any device** — Phone camera, laptop webcam, tablet
- **Privacy-first** — All processing happens in your browser, nothing sent to any server
- **Skeleton overlay** — Live visualization of detected body pose
- **Mobile-friendly** — Front/back camera switching on phones

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| AI/ML | MediaPipe Pose Landmarker (runs in browser) |
| Backend | Python FastAPI |
| Deployment | Vercel (frontend), any Python host (backend) |

## Quick Start

### Frontend (Next.js)

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Backend (Python)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Project Structure

```
xvision/
├── src/app/              # Next.js pages
│   ├── page.tsx          # Marketing landing page
│   └── detect/page.tsx   # Live camera detection
├── backend/              # Python FastAPI backend
│   ├── main.py           # API server
│   └── requirements.txt
└── public/               # Static assets
```

## How It Works

1. **Open your camera** — Click "Start Detection" on the /detect page
2. **AI processes each frame** — MediaPipe Pose Landmarker runs in your browser
3. **See the skeleton** — 33 body landmarks drawn in real-time over your camera feed

## License

MIT

## Author

Built by [Gargi Gupta](https://github.com/GargiGupta-io)
