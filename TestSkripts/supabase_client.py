from supabase import create_client
from dotenv import load_dotenv
import os


class SupabaseClient:
    """Wrapper class for Supabase database operations."""

    def __init__(self):
        load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client = create_client(self.url, self.key)

    def fetch_table(self, table_name: str, columns: str = "*") -> list:
        """Fetch all rows from specified table.

        Args:
            table_name: Name of the table (e.g., "Actions", "Companies", "People")
            columns: Columns to select, defaults to "*" for all columns

        Returns:
            List of records from the table
        """
        response = self.client.table(table_name).select(columns).execute()
        return response.data

    def fetch_people(self, name: str = None, department: str = None) -> list:
        """Fetch from People table with optional name/department filters.

        Args:
            name: Filter by person's first name (exact match)
            department: Filter by department (exact match)

        Returns:
            List of People records matching the filters
        """
        query = self.client.table("People").select("*")
        if name:
            query = query.eq("name", name)
        if department:
            query = query.eq("department", department)
        response = query.execute()
        return response.data


if __name__ == "__main__":
    db = SupabaseClient()

    print("=== Testing SupabaseClient ===\n")

    # Test fetching all from People table
    print("All People:")
    print(db.fetch_table("People"))

    print("\n" + "=" * 40 + "\n")

    # Test with department filter
    print("Filtered by department:")
    print(db.fetch_people(department="Engineering"))
