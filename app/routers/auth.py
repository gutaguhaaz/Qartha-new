
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from fastapi.security import HTTPBearer
from typing import Optional
from datetime import timedelta
from app.models.user_models import UserLogin, UserPublic, TokenPayload
from app.core.security import verify_password, create_access_token, decode_access_token
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
    # Verify user credentials
    user = await database.fetch_one(
        "SELECT id, email, password_hash, role, is_active FROM users WHERE email = :email",
        {"email": user_data.email}
    )
    
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
    """Logout user by clearing cookie"""
    response.delete_cookie(key="access_token")
    return {"message": "Logout successful"}


@router.get("/auth/me", response_model=UserPublic)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserPublic(**current_user)
