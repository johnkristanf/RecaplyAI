import os
import subprocess
import tempfile
import uuid
import boto3

from fastapi import APIRouter, UploadFile, File, Form, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.recordings.dependencies import get_recording_service
from src.database import Database
from src.recordings.model import Recording
from src.recordings.service import RecordingService
import boto3

# PROFILE = "torremocha.johnkristan"  # Optional: set AWS_PROFILE in your environment
# if PROFILE:
#     session = boto3.session.Session(profile_name=PROFILE)
# else:
#     session = boto3.session.Session()
s3 = boto3.client("s3")
BUCKET = "recaplyai-dev-bucket"

recordings_router = APIRouter()


@recordings_router.post("/upload")
async def upload_recording(
    file: UploadFile = File(...),
    title: str = Form(...),
    session: AsyncSession = Depends(Database.get_async_session),
    service: RecordingService = Depends(get_recording_service),
):
    user_id = "2eb3d206-ad33-49d8-9cd7-0a6ce788a0a5"  # TODO: Replace with auth user
    recording_id = str(uuid.uuid4())

    wav_key = f"recordings/{user_id}/{recording_id}.wav"
    m4a_key = f"recordings/{user_id}/{recording_id}.m4a"

    await service.summarize_with_ollama_qwen("TEST")

    # 1️⃣ Save WebM locally
    # with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as webm_file:
    #     webm_path = webm_file.name
    #     webm_file.write(await file.read())

    # wav_path = webm_path.replace(".webm", ".wav")
    # m4a_path = webm_path.replace(".webm", ".m4a")

    # try:
    #     # 2️⃣ Convert WebM → WAV for STT (mono, 16kHz, s16)
    #     subprocess.run(
    #         [
    #             "ffmpeg",
    #             "-y",
    #             "-i",
    #             webm_path,
    #             "-ac",
    #             "1",
    #             "-ar",
    #             "16000",
    #             "-sample_fmt",
    #             "s16",
    #             wav_path,
    #         ],
    #         check=True,
    #     )

    #     # 3️⃣ Convert WebM → M4A for playback (stereo, AAC)
    #     subprocess.run(
    #         [
    #             "ffmpeg",
    #             "-y",
    #             "-i",
    #             wav_path,
    #             "-c:a",
    #             "aac",
    #             "-b:a",
    #             "128k",
    #             "-ac",
    #             "2",  # stereo
    #             "-ar",
    #             "44100",  # standard playback rate
    #             "-movflags",
    #             "+faststart",
    #             m4a_path,
    #         ],
    #         check=True,
    #         stdout=subprocess.DEVNULL,
    #         stderr=subprocess.DEVNULL,
    #     )

    #     # 4️⃣ Upload to S3
    #     s3.upload_file(
    #         wav_path, BUCKET, wav_key, ExtraArgs={"ContentType": "audio/wav"}
    #     )
    #     s3.upload_file(
    #         m4a_path, BUCKET, m4a_key, ExtraArgs={"ContentType": "audio/mp4"}
    #     )

    #     # 5️⃣ Insert into database
    #     new_recording = Recording(
    #         id=recording_id,
    #         title=title,
    #         raw_s3_key=wav_key,
    #         playback_s3_key=m4a_key,
    #         user_id=user_id,
    #     )
    #     session.add(new_recording)
    #     await session.commit()

    # finally:
    #     # 6️⃣ Cleanup temp files
    #     for path in [webm_path, wav_path, m4a_path]:
    #         if os.path.exists(path):
    #             os.remove(path)

    return JSONResponse(
        content={"recording_id": recording_id},
        status_code=status.HTTP_201_CREATED,
    )


@recordings_router.get("/get/all")
async def get_all_recordings(
    session: AsyncSession = Depends(Database.get_async_session),
):
    user_id = "2eb3d206-ad33-49d8-9cd7-0a6ce788a0a5"

    stmt = select(Recording).where(Recording.user_id == user_id)
    result = await session.execute(stmt)
    db_recordings = result.scalars().all()

    recordings_data = []
    for rec in db_recordings:
        src = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": rec.playback_s3_key},
            ExpiresIn=3600,
        )
        recordings_data.append(
            {
                "id": rec.id,
                "title": rec.title,
                "s3_key": rec.raw_s3_key,
                "src": src,
                "created_at": rec.created_at,
                "updated_at": rec.updated_at,
            }
        )

    return JSONResponse(content=recordings_data)
