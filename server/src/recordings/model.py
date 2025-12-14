from sqlalchemy import Column, ForeignKey
from sqlalchemy.types import String
from sqlalchemy.dialects.postgresql import UUID

from src.database import Base


from sqlalchemy import func

class Recording(Base):
    __tablename__ = "recordings"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=True)
    
    raw_s3_key = Column(String)        # WAV
    playback_s3_key = Column(String)   # M4A

    # Use server_default=func.now() so these are auto-filled by the database.
    created_at = Column(String, nullable=False, server_default=func.now())
    updated_at = Column(String, nullable=False, server_default=func.now(), onupdate=func.now())

    user_id = Column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
