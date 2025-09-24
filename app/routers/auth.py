from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Request
from fastapi.security import HTTPBearer
from typing import Optional
from datetime import timedelta
import json
from app.models.user_models import UserLogin, UserPublic, TokenPayload, UserCreate
from app.core.security import verify_password, create_access_token, decode_access_token, hash_password
from app.db.database import database
from app.core.config import settings

router = APIRouter(tags=["auth"])
security = HTTPBearer(auto_error=False)


async def get_current_user_from_token(token: str) -> Optional[dict]:
    """Get current user from JWT token"""
    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    user = await database.fetch_one(
        "SELECT id, email, full_name, role, is_active, created_at, last_login_at FROM users WHERE id = :id AND is_active = true",
        {"id": int(user_id)}
    )

    if user is None:
        return None

    return dict(user)


async def get_current_user(access_token: Optional[str] = Cookie(None)) -> dict:
    """Get current authenticated user"""
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await get_current_user_from_token(access_token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    return user


async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Get current user if they are admin"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    """Login user and set HTTP-only cookie"""
    try:
        print(f"Login attempt for email: {user_data.email}")

        # Verify user credentials
        user = await database.fetch_one(
            "SELECT id, email, password_hash, role, is_active FROM users WHERE email = :email",
            {"email": user_data.email}
        )

        print(f"User found: {user is not None}")

    except Exception as e:
        print(f"Database error during login: {e}")
        raise HTTPException(status_code=500, detail="Database error")

    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account inactive")

    # Update last login
    await database.execute(
        "UPDATE users SET last_login_at = NOW() WHERE id = :id",
        {"id": user["id"]}
    )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user["id"])},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Set HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )

    return {"message": "Login successful", "role": user["role"]}


@router.post("/auth/logout")
async def logout(response: Response):
    """Logout user by clearing the token cookie"""
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=None,
        secure=False,
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}


@router.get("/auth/me", response_model=UserPublic)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserPublic(**current_user)


@router.post("/auth/register", response_model=UserPublic)
async def register_user(
    user_data: UserCreate, 
    current_admin: dict = Depends(get_current_admin)
):
    """Register a new user (admin only)"""
    # Check if user already exists
    existing_user = await database.fetch_one(
        "SELECT id FROM users WHERE email = :email",
        {"email": user_data.email}
    )
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user
    user_id = await database.fetch_val(
        """
        INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (:email, :password_hash, :full_name, :role, true, NOW(), NOW())
        RETURNING id
        """,
        {
            "email": user_data.email,
            "password_hash": password_hash,
            "full_name": user_data.full_name,
            "role": user_data.role
        }
    )
    
    # Fetch the created user
    new_user = await database.fetch_one(
        "SELECT id, email, full_name, role, is_active, created_at, last_login_at FROM users WHERE id = :id",
        {"id": user_id}
    )
    
    return UserPublic(**dict(new_user))