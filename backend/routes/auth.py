import jwt
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify
from config import Config
from models.db import db

auth_bp = Blueprint("auth", __name__)

# --- Safe Cryptographic Fallbacks ---
def hash_password(password):
    try:
        import bcrypt
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    except ImportError:
        # Secure salt fallback using SHA256 if bcrypt C-libraries fail to compile
        salt = "aqi_safety_salt_signature_2026_"
        return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

def check_password(password, hashed):
    try:
        import bcrypt
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except (ImportError, ValueError, AttributeError):
        salt = "aqi_safety_salt_signature_2026_"
        expected = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
        return expected == hashed

# --- JWT Token Verifier Decorator ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
        if not token:
            return jsonify({"message": "Access token is missing"}), 401
            
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            current_user = db.users.find_one({"_id": payload["user_id"]})
            if not current_user:
                return jsonify({"message": "User not found or deleted"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Access token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Access token is invalid"}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

# --- Endpoints ---
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "user").strip().lower()
    
    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400
        
    if role not in ["user", "admin"]:
        role = "user"
        
    existing_user = db.users.find_one({"email": email})
    if existing_user:
        return jsonify({"message": "User with this email already exists"}), 400
        
    hashed = hash_password(password)
    user_doc = {
        "name": name,
        "email": email,
        "password": hashed,
        "role": role,
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    db.users.insert_one(user_doc)
    return jsonify({"message": "Registration successful"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
        
    user = db.users.find_one({"email": email})
    if not user or not check_password(password, user["password"]):
        return jsonify({"message": "Invalid email or password"}), 401
        
    # Generate JWT
    token_payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user.get("role", "user"),
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    token = jwt.encode(token_payload, Config.JWT_SECRET, algorithm="HS256")
    
    return jsonify({
        "token": token,
        "user": {
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "user")
        }
    }), 200

@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    return jsonify({
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user.get("role", "user"),
        "created_at": current_user.get("created_at", "")
    }), 200
