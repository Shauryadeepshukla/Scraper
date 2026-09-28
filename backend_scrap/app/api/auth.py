from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user, require_admin
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import (
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ─── Public self-registration (creates ADMIN accounts only) ───────────────────
@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
)
def register_admin(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """Public endpoint. Always creates an ADMIN account.
    Counsellor accounts can only be created by an existing Admin via /register-counsellor."""
    existing_user = (
        db.query(User)
        .filter(User.email.ilike(user_in.email.strip()))
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    user = User(
        name=user_in.name.strip(),
        email=user_in.email.strip().lower(),
        password_hash=get_password_hash(user_in.password),
        role="ADMIN",  # Public registration always creates ADMIN
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


# ─── Admin registers a Counsellor (Admin-only) ────────────────────────────────
@router.post(
    "/register-counsellor",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
)
def register_counsellor(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Admin-only endpoint to create a Counsellor account."""
    existing_user = (
        db.query(User)
        .filter(User.email.ilike(user_in.email.strip()))
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    user = User(
        name=user_in.name.strip(),
        email=user_in.email.strip().lower(),
        password_hash=get_password_hash(user_in.password),
        role="COUNSELLOR",
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


# ─── Login ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email.ilike(login_data.email.strip()))
        .first()
    )
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


# ─── OAuth2 token endpoint (Swagger UI) ──────────────────────────────────────
@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email.ilike(form_data.username.strip()))
        .first()
    )
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


# ─── Current User Profile ─────────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


# ─── List Counsellors (Admin only) ────────────────────────────────────────────
@router.get("/counsellors", response_model=list[UserResponse])
def list_counsellors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    counsellors = (
        db.query(User)
        .filter(User.role == "COUNSELLOR", User.is_active.is_(True))
        .order_by(User.name)
        .all()
    )
    return counsellors
