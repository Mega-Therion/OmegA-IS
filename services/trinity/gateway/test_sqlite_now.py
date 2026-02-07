import sqlite3
import datetime
conn = sqlite3.connect('/home/mega/NEXUS/repos/OMEGA-Trinity/gateway/gateway.db')
conn.create_function("NOW", 0, lambda: datetime.datetime.now().isoformat())
cursor = conn.cursor()
try:
    cursor.execute("SELECT NOW()")
    print(f"SUCCESS: {cursor.fetchone()}")
except Exception as e:
    print(f"FAILURE: {e}")
conn.close()
