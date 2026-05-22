import json
import os
import time
import threading
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from config import Config

class LocalJSONCollection:
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
                print(f"Error writing to local JSON db: {e}")

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
        matched = []
        for doc in docs:
            if self._matches_filter(doc, filter_dict):
                matched.append(doc)

        # Sorting logic (e.g. [('timestamp', -1)])
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
                # Basic update (supporting only '$set' structure)
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
        new_docs = []
        for doc in docs:
            if not self._matches_filter(doc, filter_dict):
                new_docs.append(doc)
        self._write(new_docs)
        return type("DeleteResult", (), {"deleted_count": initial_count - len(new_docs)})


class DatabaseWrapper:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_fallback = False
        self.lock = threading.Lock()
        self.fallback_path = os.path.join(os.path.dirname(__file__), "..", "db_fallback.json")
        
        self.init_db()

    def init_db(self):
        if not Config.MONGO_URI:
            self._setup_fallback("No MONGO_URI configured. Using fallback local JSON Database.")
            return

        try:
            # Connect with a short timeout to fail fast if DB is down or credentials incorrect
            self.client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2000)
            # Try a ping command
            self.client.admin.command('ping')
            
            # Extract database name from connection string or default
            db_name = "aqi_safety_db"
            if "/" in Config.MONGO_URI.split("://")[-1]:
                parsed_name = Config.MONGO_URI.split("/")[-1].split("?")[0]
                if parsed_name:
                    db_name = parsed_name
            self.db = self.client[db_name]
            print(f"Successfully connected to MongoDB Atlas database: {db_name}")
        except (ConnectionFailure, ConfigurationError, Exception) as e:
            self._setup_fallback(f"Failed to connect to MongoDB Atlas. Fallback to local JSON. Error: {e}")

    def _setup_fallback(self, reason):
        print(reason)
        self.is_fallback = True
        # Initialize collections as JSON mockups
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
