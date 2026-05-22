import json
import os
import time
import threading
import sys

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, ConfigurationError
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False

from config import Config

logger_prefix = "[DB]"

def _log(msg):
    print(f"{logger_prefix} {msg}", file=sys.stdout, flush=True)


class LocalJSONCollection:
    """Thread-safe mock MongoDB collection backed by a JSON file.
    Used as a fallback when MongoDB Atlas is unavailable (local dev)."""

    def __init__(self, db_path, collection_name, lock):
        self.db_path = db_path
        self.collection_name = collection_name
        self.lock = lock

    def _read(self):
        with self.lock:
            if not os.path.exists(self.db_path):
                return []
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get(self.collection_name, [])
            except Exception:
                return []

    def _write(self, data):
        with self.lock:
            all_data = {}
            if os.path.exists(self.db_path):
                try:
                    with open(self.db_path, "r", encoding="utf-8") as f:
                        all_data = json.load(f)
                except Exception:
                    pass
            all_data[self.collection_name] = data
            try:
                with open(self.db_path, "w", encoding="utf-8") as f:
                    json.dump(all_data, f, indent=2, default=str)
            except Exception as e:
                _log(f"Warning: Could not write to local JSON db: {e}")

    def _matches_filter(self, doc, filter_dict):
        if not filter_dict:
            return True
        import re
        for k, v in filter_dict.items():
            doc_val = doc.get(k)
            if isinstance(v, dict):
                if "$regex" in v:
                    pattern = v["$regex"]
                    flags = 0
                    if "i" in v.get("$options", "").lower():
                        flags = re.IGNORECASE
                    try:
                        if doc_val is None or not re.search(pattern, str(doc_val), flags):
                            return False
                    except Exception:
                        return False
                else:
                    if doc_val != v:
                        return False
            else:
                if doc_val != v:
                    return False
        return True

    def find_one(self, filter_dict):
        docs = self._read()
        for doc in docs:
            if self._matches_filter(doc, filter_dict):
                return doc
        return None

    def find(self, filter_dict=None, sort=None, limit=None):
        if filter_dict is None:
            filter_dict = {}
        docs = self._read()
        matched = [doc for doc in docs if self._matches_filter(doc, filter_dict)]

        if sort:
            for field, order in reversed(sort):
                matched.sort(key=lambda x: x.get(field) or "", reverse=(order == -1))
        if limit:
            matched = matched[:limit]
        return matched

    def insert_one(self, doc):
        docs = self._read()
        if "_id" not in doc:
            doc["_id"] = str(int(time.time() * 1000))
        docs.append(doc)
        self._write(docs)
        return type("InsertOneResult", (), {"inserted_id": doc["_id"]})

    def insert_many(self, new_docs):
        docs = self._read()
        for doc in new_docs:
            if "_id" not in doc:
                doc["_id"] = str(int(time.time() * 1000)) + "_" + str(os.urandom(4).hex())
            docs.append(doc)
        self._write(docs)
        return True

    def update_one(self, filter_dict, update_dict):
        docs = self._read()
        modified = 0
        for doc in docs:
            if self._matches_filter(doc, filter_dict):
                if "$set" in update_dict:
                    for sk, sv in update_dict["$set"].items():
                        doc[sk] = sv
                    modified = 1
                    break
        if modified > 0:
            self._write(docs)
        return type("UpdateResult", (), {"modified_count": modified})

    def delete_many(self, filter_dict):
        docs = self._read()
        initial_count = len(docs)
        new_docs = [doc for doc in docs if not self._matches_filter(doc, filter_dict)]
        self._write(new_docs)
        return type("DeleteResult", (), {"deleted_count": initial_count - len(new_docs)})


class InMemoryCollection:
    """Ephemeral in-memory collection for Vercel serverless (read-only filesystem).
    Data is lost when the function instance is recycled, but that's fine —
    MongoDB Atlas is the primary DB on Vercel. This is only for edge cases
    where MongoDB is temporarily unreachable."""

    def __init__(self, name):
        self.name = name
        self._docs = []

    def find_one(self, filter_dict=None):
        for doc in self._docs:
            if self._match(doc, filter_dict or {}):
                return doc
        return None

    def find(self, filter_dict=None, sort=None, limit=None):
        matched = [d for d in self._docs if self._match(d, filter_dict or {})]
        if sort:
            for field, order in reversed(sort):
                matched.sort(key=lambda x: x.get(field) or "", reverse=(order == -1))
        if limit:
            matched = matched[:limit]
        return matched

    def insert_one(self, doc):
        if "_id" not in doc:
            doc["_id"] = str(int(time.time() * 1000))
        self._docs.append(doc)
        return type("InsertOneResult", (), {"inserted_id": doc["_id"]})

    def insert_many(self, new_docs):
        for doc in new_docs:
            if "_id" not in doc:
                doc["_id"] = str(int(time.time() * 1000)) + "_" + os.urandom(4).hex()
            self._docs.append(doc)
        return True

    def update_one(self, filter_dict, update_dict):
        for doc in self._docs:
            if self._match(doc, filter_dict):
                if "$set" in update_dict:
                    doc.update(update_dict["$set"])
                    return type("UpdateResult", (), {"modified_count": 1})
        return type("UpdateResult", (), {"modified_count": 0})

    def delete_many(self, filter_dict):
        before = len(self._docs)
        self._docs = [d for d in self._docs if not self._match(d, filter_dict)]
        return type("DeleteResult", (), {"deleted_count": before - len(self._docs)})

    def _match(self, doc, f):
        import re
        for k, v in f.items():
            dv = doc.get(k)
            if isinstance(v, dict) and "$regex" in v:
                flags = re.IGNORECASE if "i" in v.get("$options", "") else 0
                if dv is None or not re.search(v["$regex"], str(dv), flags):
                    return False
            elif dv != v:
                return False
        return True


class DatabaseWrapper:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_fallback = False
        self.lock = threading.Lock()

        # For local dev: use the JSON file in the backend directory
        self.fallback_path = os.path.join(os.path.dirname(__file__), "..", "db_fallback.json")

        self.init_db()

    def init_db(self):
        if not Config.MONGO_URI:
            self._setup_fallback("No MONGO_URI configured. Using fallback database.")
            return

        if not PYMONGO_AVAILABLE:
            self._setup_fallback("pymongo not available. Using fallback database.")
            return

        try:
            self.client = MongoClient(
                Config.MONGO_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=10000,
            )
            # Verify connectivity
            self.client.admin.command('ping')

            # Extract database name from URI or use default
            db_name = "aqi_safety_db"
            uri_path = Config.MONGO_URI.split("://")[-1]
            if "/" in uri_path:
                parsed_name = uri_path.split("/")[-1].split("?")[0]
                if parsed_name:
                    db_name = parsed_name
            self.db = self.client[db_name]
            _log(f"Connected to MongoDB Atlas: {db_name}")
        except Exception as e:
            self._setup_fallback(f"MongoDB connection failed ({e}). Using fallback database.")

    def _setup_fallback(self, reason):
        _log(reason)
        self.is_fallback = True

        if Config.IS_VERCEL:
            # Vercel has a READ-ONLY filesystem — use in-memory collections
            _log("Vercel detected -> using in-memory fallback (ephemeral)")
            self.users_col = InMemoryCollection("users")
            self.aqi_col = InMemoryCollection("aqi_data")
            self.pred_col = InMemoryCollection("predictions")
        else:
            # Local dev — use JSON file fallback (read/write)
            _log(f"Local dev -> using JSON fallback at {self.fallback_path}")
            self.users_col = LocalJSONCollection(self.fallback_path, "users", self.lock)
            self.aqi_col = LocalJSONCollection(self.fallback_path, "aqi_data", self.lock)
            self.pred_col = LocalJSONCollection(self.fallback_path, "predictions", self.lock)

    @property
    def users(self):
        return self.db["users"] if not self.is_fallback else self.users_col

    @property
    def aqi_data(self):
        return self.db["aqi_data"] if not self.is_fallback else self.aqi_col

    @property
    def predictions(self):
        return self.db["predictions"] if not self.is_fallback else self.pred_col


# Single instance export
db = DatabaseWrapper()
