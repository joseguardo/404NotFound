from supabase import create_client
from dotenv import load_dotenv
import os

# Load .env from project root (2 levels up from TestSkripts)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch all rows from a table
# TODO: Replace "your_table" with your actual table name
response = supabase.table("your_table").select("*").execute()
print(response.data)
