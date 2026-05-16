#!/usr/bin/env python
"""
Create the singleton ADMIN account.
Run once during initial setup.

Usage:
    python -m scripts.seed_admin
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from app.models.models import User, UserRole
from app.core.security import get_password_hash

def seed_admin():
    """Create singleton admin account."""
    db = SessionLocal()

    # Check if admin already exists
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        print(f"✓ Admin already exists: {existing_admin.email}")
        db.close()
        return

    # Create admin
    admin_email = "admin@healthcare.local"
    admin_password = "ChangeMe123!"  # ← USER MUST CHANGE THIS IMMEDIATELY

    admin_user = User(
        email=admin_email,
        hashed_password=get_password_hash(admin_password),
        role=UserRole.ADMIN,
        is_active=True,
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    db.close()

    print(f"✓ Admin created: {admin_email}")
    print(f"⚠️  TEMPORARY PASSWORD: {admin_password}")
    print(f"⚠️  Change password immediately after first login!")

if __name__ == "__main__":
    seed_admin()
