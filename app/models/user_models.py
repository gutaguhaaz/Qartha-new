from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "visitor"

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()


class UserPublic(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]


class UserInDB(UserPublic):
    password_hash: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None


class UserLogin(BaseModel):
    email: str
    password: str