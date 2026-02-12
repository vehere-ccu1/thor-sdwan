"""
DB wrapper for Thor SD-WAN CMS API.
Supports multiple backends for connectivity testing and, for ClickHouse, full operations.
All other backends (MySQL, Elasticsearch, MongoDB, Oracle) implement test_connection
for the config dialog; app data storage remains ClickHouse unless extended.
"""
import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)

# Timeout for test connections
_TEST_TIMEOUT_SEC = 5


class BaseDBBackend(ABC):
    """Base class for DB backends. Subclasses must implement test_connection."""

    @abstractmethod
    def test_connection(
        self,
        host: str,
        port: int,
        user: str = "",
        password: str = "",
        database: str = "",
        **kwargs: Any,
    ) -> tuple[bool, str]:
        """
        Try to connect to the DB with the given params.
        Returns (success: bool, message: str).
        """
        pass


class ClickHouseBackend(BaseDBBackend):
    """ClickHouse backend: full support (get_client, execute, execute_many) + test_connection."""

    def test_connection(
        self,
        host: str,
        port: int,
        user: str = "",
        password: str = "",
        database: str = "default",
        **kwargs: Any,
    ) -> tuple[bool, str]:
        try:
            from clickhouse_driver import Client
            client = Client(
                host=host,
                port=port,
                database=database or "default",
                user=user or "default",
                password=password,
                connect_timeout=_TEST_TIMEOUT_SEC,
            )
            client.execute("SELECT 1")
            client.disconnect()
            return True, "OK"
        except ImportError:
            return False, "clickhouse-driver not installed"
        except Exception as e:
            return False, str(e)


class MySQLBackend(BaseDBBackend):
    def test_connection(
        self,
        host: str,
        port: int,
        user: str = "",
        password: str = "",
        database: str = "",
        **kwargs: Any,
    ) -> tuple[bool, str]:
        try:
            import pymysql
            conn = pymysql.connect(
                host=host,
                port=port,
                user=user or "root",
                password=password,
                database=database or None,
                connect_timeout=_TEST_TIMEOUT_SEC,
            )
            conn.close()
            return True, "OK"
        except ImportError:
            return False, "pymysql not installed (pip install pymysql)"
        except Exception as e:
            return False, str(e)


class ElasticsearchBackend(BaseDBBackend):
    def test_connection(
        self,
        host: str,
        port: int,
        user: str = "",
        password: str = "",
        database: str = "",
        **kwargs: Any,
    ) -> tuple[bool, str]:
        try:
            from elasticsearch import Elasticsearch
            es = Elasticsearch(
                [{"host": host, "port": port}],
                basic_auth=(user, password) if (user or password) else None,
                request_timeout=_TEST_TIMEOUT_SEC,
            )
            if not es.ping():
                return False, "Ping failed"
            return True, "OK"
        except ImportError:
            return False, "elasticsearch not installed (pip install elasticsearch)"
        except Exception as e:
            return False, str(e)


class MongoDBBackend(BaseDBBackend):
    def test_connection(
        self,
        host: str,
        port: int,
        user: str = "",
        password: str = "",
        database: str = "",
        **kwargs: Any,
    ) -> tuple[bool, str]:
        try:
            from pymongo import MongoClient
            from pymongo.errors import ServerSelectionTimeoutError
            uri = f"mongodb://{host}:{port}"
            if user or password:
                from urllib.parse import quote_plus
                user_esc = quote_plus(user or "")
                pass_esc = quote_plus(password or "")
                uri = f"mongodb://{user_esc}:{pass_esc}@{host}:{port}"
            client = MongoClient(uri, serverSelectionTimeoutMS=_TEST_TIMEOUT_SEC * 1000)
            client.admin.command("ping")
            client.close()
            return True, "OK"
        except ImportError:
            return False, "pymongo not installed (pip install pymongo)"
        except Exception as e:
            return False, str(e)


class OracleBackend(BaseDBBackend):
    def test_connection(
        self,
        host: str,
        port: int,
        user: str = "",
        password: str = "",
        database: str = "",
        **kwargs: Any,
    ) -> tuple[bool, str]:
        try:
            import oracledb
            dsn = oracledb.makedsn(host, port, service_name=database or "ORCL")
            conn = oracledb.connect(user=user, password=password, dsn=dsn)
            conn.close()
            return True, "OK"
        except ImportError:
            return False, "oracledb not installed (pip install oracledb)"
        except Exception as e:
            return False, str(e)


# Registry: db_type (lowercase) -> backend class
BACKENDS: dict[str, type[BaseDBBackend]] = {
    "clickhouse": ClickHouseBackend,
    "mysql": MySQLBackend,
    "elasticsearch": ElasticsearchBackend,
    "mongodb": MongoDBBackend,
    "oracle": OracleBackend,
}


def get_backend(db_type: str) -> BaseDBBackend | None:
    """Return backend instance for the given db_type, or None if unknown."""
    cls = BACKENDS.get((db_type or "").strip().lower())
    return cls() if cls else None


def test_db_connection(
    db_type: str,
    host: str,
    port: int,
    user: str = "",
    password: str = "",
    database: str = "",
    **kwargs: Any,
) -> tuple[bool, str]:
    """
    Test connectivity to the given DB. Returns (success, message).
    """
    backend = get_backend(db_type)
    if not backend:
        return False, f"Unknown DB type: {db_type}. Use one of: {', '.join(BACKENDS)}"
    return backend.test_connection(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        **kwargs,
    )


def check_current_db_health() -> tuple[bool, str]:
    """Test connectivity to the DB configured in config (db_type, db_host, etc.). Returns (success, message)."""
    try:
        from config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_TYPE, DB_USER
        return test_db_connection(
            db_type=DB_TYPE,
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
        )
    except Exception as e:
        return False, str(e)
