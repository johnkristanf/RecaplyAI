import uuid
import boto3

from fastapi import APIRouter, UploadFile, File, status
from fastapi.responses import JSONResponse

from fastapi import Form, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database import Database
from src.recordings.model import Recording

s3 = boto3.client("s3")
BUCKET = "recaplyai-dev-bucket"

recordings_router = APIRouter()



@recordings_router.post("/upload")
async def upload_recording(
    file: UploadFile = File(...),
    title: str = Form(...),
    session: AsyncSession = Depends(Database.get_async_session),
):
    user_id = "2eb3d206-ad33-49d8-9cd7-0a6ce788a0a5"  # DUMMY USER ID, CHANGE LATER
    recording_id = str(uuid.uuid4())
    s3_key = f"recordings/{user_id}/{recording_id}.webm"

    # Upload audio file to s3
    s3.upload_fileobj(
        file.file, BUCKET, s3_key, ExtraArgs={"ContentType": "audio/webm"}
    )

    # Insert the recording in the database
    new_recording = Recording(
        id=recording_id,
        title=title,
        s3_key=s3_key,
        user_id=user_id,
    )
    session.add(new_recording)
    await session.commit()

    return JSONResponse(
        content={"recording_id": recording_id}, status_code=status.HTTP_201_CREATED
    )


@recordings_router.get("/get/all")
async def get_all_recordings(session: AsyncSession = Depends(Database.get_async_session)):

    user_id = "2eb3d206-ad33-49d8-9cd7-0a6ce788a0a5"  # DUMMY USER ID, CHANGE LATER

    # Use SQLAlchemy select instead of Table select
    stmt = select(Recording).where(Recording.user_id == user_id)
    result = await session.execute(stmt)
    db_recordings = result.scalars().all()

    recordings_data = []
    for rec in db_recordings:
        # rec is a Recording model instance
        recording_s3_key = rec.s3_key
        recording_id = rec.id

        # Generate presigned src URL
        src = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": recording_s3_key},
            ExpiresIn=3600
        )

        recordings_data.append({
            "id": recording_id,
            "title": rec.title,
            "s3_key": recording_s3_key,
            "src": src,
            "created_at": rec.created_at,
            "updated_at": rec.updated_at
        })

    return JSONResponse(content=recordings_data)
