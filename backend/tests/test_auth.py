import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_user


VALID_PASSWORD = "Test@1234"
VALID_EMAIL = "test@example.com"


class TestRegister:
    def test_register_success(self, client: TestClient, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
            "role": "PATIENT",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == VALID_EMAIL
        assert data["role"] == "PATIENT"
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client: TestClient, db):
        create_test_user(db, VALID_EMAIL, VALID_PASSWORD)
        resp = client.post("/api/v1/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
            "role": "PATIENT",
        })
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"].lower()

    def test_register_invalid_email(self, client: TestClient, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": VALID_PASSWORD,
            "role": "PATIENT",
        })
        assert resp.status_code == 400

    def test_register_weak_password(self, client: TestClient, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": VALID_EMAIL,
            "password": "weak",
            "role": "PATIENT",
        })
        assert resp.status_code == 400

    def test_register_invalid_role_defaults_to_patient(self, client: TestClient, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
            "role": "SUPERUSER",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "PATIENT"


class TestLogin:
    def test_login_success_sets_cookie(self, client: TestClient, db):
        create_test_user(db, VALID_EMAIL, VALID_PASSWORD)
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": VALID_EMAIL, "password": VALID_PASSWORD},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        assert "access_token" in resp.cookies

    def test_login_wrong_password(self, client: TestClient, db):
        create_test_user(db, VALID_EMAIL, VALID_PASSWORD)
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": VALID_EMAIL, "password": "WrongPass@1"},
        )
        assert resp.status_code == 401

    def test_login_unknown_email(self, client: TestClient, db):
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "nobody@example.com", "password": VALID_PASSWORD},
        )
        assert resp.status_code == 401

    def test_login_inactive_user(self, client: TestClient, db):
        user = create_test_user(db, VALID_EMAIL, VALID_PASSWORD)
        user.is_active = False
        db.commit()
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": VALID_EMAIL, "password": VALID_PASSWORD},
        )
        assert resp.status_code == 400


class TestMe:
    def test_me_with_cookie(self, client: TestClient, db):
        create_test_user(db, VALID_EMAIL, VALID_PASSWORD)
        client.post(
            "/api/v1/auth/login",
            data={"username": VALID_EMAIL, "password": VALID_PASSWORD},
        )
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == VALID_EMAIL

    def test_me_unauthenticated(self, client: TestClient, db):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_logout_clears_session(self, client: TestClient, db):
        create_test_user(db, VALID_EMAIL, VALID_PASSWORD)
        client.post(
            "/api/v1/auth/login",
            data={"username": VALID_EMAIL, "password": VALID_PASSWORD},
        )
        client.post("/api/v1/auth/logout")
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401
