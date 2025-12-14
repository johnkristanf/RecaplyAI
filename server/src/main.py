from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import Database
from src.recordings.router import recordings_router
from src.utils import group


@asynccontextmanager
async def lifespan(app: FastAPI):
    Database.connect_async_session()
    yield
    await Database.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_v1_router = group(
    "/api/v1",
    (recordings_router, "/recordings", ["Recordings"]),
)

app.include_router(api_v1_router)

@app.get("/health")
def health():
    return {"message": "The server is healthy"}

