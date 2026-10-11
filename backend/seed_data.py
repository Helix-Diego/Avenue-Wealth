import os
from datetime import datetime
from backend.database import get_connection, init_db
from backend.knowledge_base import init_knowledge_base

def seed_initial_data():
    """
    Initializes database schema, knowledge base, categories, supported banks,
    and settings. Does NOT insert personal portfolio or transaction data.
    """
    init_db()
    init_knowledge_base()
    print("Database ready: schema, categories, supported banks and default settings initialized.")

if __name__ == "__main__":
    seed_initial_data()

