from neo4j import GraphDatabase
from .config import settings
import logging

logger = logging.getLogger("omega.knowledge")

class KnowledgeGraph:
    def __init__(self):
        self.driver = None
        if settings.neo4j_uri:
            try:
                self.driver = GraphDatabase.driver(
                    settings.neo4j_uri, 
                    auth=(settings.neo4j_user, settings.neo4j_password)
                )
                logger.info("Neo4j driver initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize Neo4j driver: {e}")

    def close(self):
        if self.driver:
            self.driver.close()

    def query(self, cypher: str, params: dict = None):
        if not self.driver:
            return []
        with self.driver.session() as session:
            result = session.run(cypher, params or {})
            return [record.data() for record in result]

    def upsert_relation(self, subject: str, relation: str, obj: str, meta: dict = None):
        if not self.driver:
            return
        
        # Simple schema: Entities with names, and typed relationships
        cypher = (
            "MERGE (s:Entity {name: $subject}) "
            "MERGE (o:Entity {name: $obj}) "
            "MERGE (s)-[r:RELATED {type: $relation}]->(o) "
            "SET r += $meta, r.updated_at = datetime()"
            "RETURN r"
        )
        try:
            with self.driver.session() as session:
                session.run(cypher, subject=subject, obj=obj, relation=relation, meta=meta or {})
        except Exception as e:
            logger.error(f"Neo4j relation upsert error: {e}")

kg = KnowledgeGraph()
