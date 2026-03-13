from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import time

app = FastAPI(title="XVision API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
detections: list[dict] = []
start_time = time.time()
detection_counter = 0


class DetectionData(BaseModel):
    landmarks: list[dict]
    timestamp: float
    confidence: float


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/stats")
def stats():
    return {
        "uptime_seconds": round(time.time() - start_time),
        "total_detections": detection_counter,
        "stored_detections": len(detections),
    }


@app.post("/api/detections")
def save_detection(data: DetectionData):
    global detection_counter
    detection_counter += 1
    entry = {
        "id": detection_counter,
        "landmarks": data.landmarks,
        "timestamp": data.timestamp,
        "confidence": data.confidence,
        "saved_at": datetime.utcnow().isoformat(),
    }
    detections.append(entry)
    # Keep only last 100
    if len(detections) > 100:
        detections.pop(0)
    return {"saved": True, "id": detection_counter}


@app.get("/api/detections")
def list_detections():
    return {"count": len(detections), "detections": detections[-20:]}


@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_text()
            await ws.send_text(f"echo: {data}")
    except WebSocketDisconnect:
        pass
