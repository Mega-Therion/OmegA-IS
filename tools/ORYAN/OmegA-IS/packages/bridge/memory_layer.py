"""Memory Layer Module - OMEGA Trinity Multi-Agent System

Implements the four-layer memory backbone: Working, Session, Semantic, and Relational.
Follows the Memory-First Design principle as defined in the Shared Constitution.

Production backends (optional):
- Session: Redis for sub-millisecond coordination
- Semantic: Milvus Lite + HNSW for vector search
- Relational: Neo4j AuraDB for knowledge graphs
"""

import os
import json
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from collections import deque

# Optional production backend imports
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

try:
    from pymilvus import MilvusClient
    MILVUS_AVAILABLE = True
except ImportError:
    MILVUS_AVAILABLE = False

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False


class WorkingMemory:
    """In-process context buffer with budgeting to prevent degradation.

    This is always in-memory as it's designed for fast, ephemeral context.
    Budget prevents "lost in the middle" degradation in LLM context windows.
    """

    def __init__(self, budget: int = 50):
        self.budget = budget
        self.memory: deque = deque(maxlen=budget)
        # Back-compat for tests and older callers.
        self.buffer = self.memory
        self.metadata: Dict[str, Any] = {}

    def add_entry(self, entry: Dict[str, Any]) -> None:
        """Add an entry to working memory with automatic pruning."""
        entry["timestamp"] = datetime.now(timezone.utc).isoformat()
        entry["id"] = hashlib.md5(json.dumps(entry, sort_keys=True, default=str).encode()).hexdigest()[:12]
        self.memory.append(entry)

    def get_recent(self, count: int = 10) -> List[Dict]:
        """Get most recent entries."""
        return list(self.memory)[-count:]

    def get_all(self) -> List[Dict]:
        """Get all entries."""
        return list(self.memory)

    def clear(self) -> None:
        """Clear working memory."""
        self.memory.clear()

    def get_size(self) -> int:
        """Get current memory size."""
        return len(self.memory)

    def is_full(self) -> bool:
        """Check if memory is at budget capacity."""
        return len(self.memory) >= self.budget

    def search(self, query: str) -> List[Dict]:
        """Simple keyword search in working memory."""
        query_lower = query.lower()
        results = []
        for entry in self.memory:
            content = str(entry.get("content", "")).lower()
            entry_type = str(entry.get("type", "")).lower()
            if query_lower in content or query_lower in entry_type:
                results.append(entry)
        return results


class SessionMemory:
    """Redis-backed session memory for sub-millisecond coordination of live task states.

    Falls back to in-memory dict if Redis is not available.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.environ.get("REDIS_URL")
        self.redis_client = None
        self.sessions: Dict[str, Dict] = {}  # Fallback storage

        if self.redis_url and REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(self.redis_url)
                self.redis_client.ping()
                print(f"[SessionMemory] Connected to Redis at {self.redis_url}")
            except Exception as e:
                print(f"[SessionMemory] Redis connection failed: {e}. Using in-memory fallback.")
                self.redis_client = None

    @property
    def is_production(self) -> bool:
        """Check if using production Redis backend."""
        return self.redis_client is not None

    def set_session(self, session_id: str, data: Dict[str, Any], ttl: int = 3600) -> None:
        """Set session data with optional TTL (default: 1 hour)."""
        timestamp = datetime.now(timezone.utc).isoformat()
        session_data = {"data": data, "updated_at": timestamp}

        if self.redis_client:
            try:
                self.redis_client.setex(
                    f"session:{session_id}",
                    ttl,
                    json.dumps(session_data)
                )
                return
            except Exception as e:
                print(f"[SessionMemory] Redis SET failed: {e}")

        # Fallback to in-memory
        self.sessions[session_id] = session_data

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        if self.redis_client:
            try:
                data = self.redis_client.get(f"session:{session_id}")
                if data:
                    session = json.loads(data)
                    return session["data"]
                return None
            except Exception as e:
                print(f"[SessionMemory] Redis GET failed: {e}")

        # Fallback to in-memory
        session = self.sessions.get(session_id)
        return session["data"] if session else None

    def delete_session(self, session_id: str) -> bool:
        """Delete session data."""
        if self.redis_client:
            try:
                result = self.redis_client.delete(f"session:{session_id}")
                return result > 0
            except Exception as e:
                print(f"[SessionMemory] Redis DEL failed: {e}")

        # Fallback to in-memory
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def session_exists(self, session_id: str) -> bool:
        """Check if session exists."""
        if self.redis_client:
            try:
                return self.redis_client.exists(f"session:{session_id}") > 0
            except Exception as e:
                print(f"[SessionMemory] Redis EXISTS failed: {e}")

        return session_id in self.sessions

    def get_all_sessions(self) -> List[str]:
        """Get all session IDs."""
        if self.redis_client:
            try:
                keys = self.redis_client.keys("session:*")
                return [k.decode().replace("session:", "") for k in keys]
            except Exception as e:
                print(f"[SessionMemory] Redis KEYS failed: {e}")

        return list(self.sessions.keys())


class SemanticMemory:
    """Milvus Lite-backed vector memory for sub-30ms semantic retrieval.

    Falls back to simple keyword search if Milvus is not available.
    In production, uses HNSW index for approximate nearest neighbor search.
    """

    def __init__(self, milvus_uri: Optional[str] = None, collection_name: str = "omega_semantic"):
        self.milvus_uri = milvus_uri or os.environ.get("MILVUS_URL")
        self.collection_name = collection_name
        self.milvus_client = None
        self.vectors: Dict[str, Dict] = {}  # Fallback storage
        self.index_count = 0

        if self.milvus_uri and MILVUS_AVAILABLE:
            try:
                self.milvus_client = MilvusClient(uri=self.milvus_uri)
                print(f"[SemanticMemory] Connected to Milvus at {self.milvus_uri}")
            except Exception as e:
                print(f"[SemanticMemory] Milvus connection failed: {e}. Using in-memory fallback.")
                self.milvus_client = None

    @property
    def is_production(self) -> bool:
        """Check if using production Milvus backend."""
        return self.milvus_client is not None

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text.

        In production, this would call an embedding model (e.g., OpenAI, Ollama).
        For now, returns a simple hash-based pseudo-vector.
        """
        # Simple pseudo-embedding based on text hash (for development)
        # In production, replace with actual embedding model
        hash_bytes = hashlib.sha256(text.encode()).digest()
        # Convert to 128-dim float vector
        return [float(b) / 255.0 for b in hash_bytes[:128] + hash_bytes[:128][::-1]][:128]

    def index_document(self, doc_id: str, content: str, metadata: Optional[Dict] = None) -> str:
        """Index a document for semantic search."""
        vector_id = f"vec_{self.index_count}"
        self.index_count += 1
        timestamp = datetime.now(timezone.utc).isoformat()

        doc_data = {
            "doc_id": doc_id,
            "content": content,
            "metadata": metadata or {},
            "indexed_at": timestamp,
            "vector_id": vector_id,
        }

        if self.milvus_client:
            try:
                embedding = self._generate_embedding(content)
                self.milvus_client.insert(
                    collection_name=self.collection_name,
                    data=[{
                        "id": vector_id,
                        "vector": embedding,
                        "doc_id": doc_id,
                        "content": content,
                        "metadata": json.dumps(metadata or {}),
                        "indexed_at": timestamp,
                    }]
                )
                doc_data["embedding"] = embedding[:5]  # Store first 5 dims for reference
                self.vectors[vector_id] = doc_data
                return vector_id
            except Exception as e:
                print(f"[SemanticMemory] Milvus insert failed: {e}")

        # Fallback to in-memory
        doc_data["embedding"] = None
        self.vectors[vector_id] = doc_data
        return vector_id

    def semantic_search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Perform semantic search."""
        if self.milvus_client:
            try:
                query_embedding = self._generate_embedding(query)
                results = self.milvus_client.search(
                    collection_name=self.collection_name,
                    data=[query_embedding],
                    limit=top_k,
                    output_fields=["doc_id", "content", "metadata", "indexed_at"],
                )
                return [
                    {
                        "doc_id": hit["entity"]["doc_id"],
                        "content": hit["entity"]["content"],
                        "metadata": json.loads(hit["entity"]["metadata"]),
                        "indexed_at": hit["entity"]["indexed_at"],
                        "score": hit["distance"],
                    }
                    for hit in results[0]
                ]
            except Exception as e:
                print(f"[SemanticMemory] Milvus search failed: {e}")

        # Fallback: simple keyword search
        query_lower = query.lower()
        scored_results = []
        for vec_id, doc in self.vectors.items():
            content_lower = doc["content"].lower()
            # Simple relevance score based on keyword overlap
            query_words = set(query_lower.split())
            content_words = set(content_lower.split())
            overlap = len(query_words & content_words)
            if overlap > 0:
                score = overlap / len(query_words)
                scored_results.append({**doc, "score": score})

        # Sort by score and return top_k
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]

    def get_document(self, vector_id: str) -> Optional[Dict]:
        """Retrieve document by vector ID."""
        return self.vectors.get(vector_id)

    def delete_document(self, vector_id: str) -> bool:
        """Delete a document by vector ID."""
        if self.milvus_client:
            try:
                self.milvus_client.delete(
                    collection_name=self.collection_name,
                    ids=[vector_id],
                )
            except Exception as e:
                print(f"[SemanticMemory] Milvus delete failed: {e}")

        if vector_id in self.vectors:
            del self.vectors[vector_id]
            return True
        return False


class RelationalMemory:
    """Neo4j-backed graph memory for multi-hop reasoning.

    Falls back to in-memory graph if Neo4j is not available.
    Supports knowledge graph operations and path finding.
    """

    def __init__(
        self,
        neo4j_uri: Optional[str] = None,
        neo4j_user: Optional[str] = None,
        neo4j_password: Optional[str] = None,
    ):
        self.neo4j_uri = neo4j_uri or os.environ.get("NEO4J_URL")
        self.neo4j_user = neo4j_user or os.environ.get("NEO4J_USER", "neo4j")
        self.neo4j_password = neo4j_password or os.environ.get("NEO4J_PASSWORD")
        self.driver = None
        self.nodes: Dict[str, Dict] = {}  # Fallback storage
        self.relationships: List[Dict] = []

        if self.neo4j_uri and self.neo4j_password and NEO4J_AVAILABLE:
            try:
                self.driver = GraphDatabase.driver(
                    self.neo4j_uri,
                    auth=(self.neo4j_user, self.neo4j_password),
                )
                self.driver.verify_connectivity()
                print(f"[RelationalMemory] Connected to Neo4j at {self.neo4j_uri}")
            except Exception as e:
                print(f"[RelationalMemory] Neo4j connection failed: {e}. Using in-memory fallback.")
                self.driver = None

    @property
    def is_production(self) -> bool:
        """Check if using production Neo4j backend."""
        return self.driver is not None

    def create_node(self, node_id: str, node_type: str, properties: Dict) -> None:
        """Create a node in the knowledge graph."""
        timestamp = datetime.now(timezone.utc).isoformat()
        node_data = {
            "type": node_type,
            "properties": properties,
            "created_at": timestamp,
        }

        if self.driver:
            try:
                with self.driver.session() as session:
                    query = f"""
                    MERGE (n:{node_type} {{id: $node_id}})
                    SET n += $properties
                    SET n.created_at = $timestamp
                    RETURN n
                    """
                    session.run(
                        query,
                        node_id=node_id,
                        properties=properties,
                        timestamp=timestamp,
                    )
            except Exception as e:
                print(f"[RelationalMemory] Neo4j create node failed: {e}")

        # Always store locally for quick access
        self.nodes[node_id] = node_data

    def create_relationship(
        self,
        from_node: str,
        to_node: str,
        rel_type: str,
        properties: Optional[Dict] = None,
    ) -> None:
        """Create a relationship between nodes."""
        timestamp = datetime.now(timezone.utc).isoformat()
        rel_data = {
            "from": from_node,
            "to": to_node,
            "type": rel_type,
            "properties": properties or {},
            "created_at": timestamp,
        }

        if self.driver:
            try:
                with self.driver.session() as session:
                    query = f"""
                    MATCH (a {{id: $from_node}})
                    MATCH (b {{id: $to_node}})
                    MERGE (a)-[r:{rel_type}]->(b)
                    SET r += $properties
                    SET r.created_at = $timestamp
                    RETURN r
                    """
                    session.run(
                        query,
                        from_node=from_node,
                        to_node=to_node,
                        properties=properties or {},
                        timestamp=timestamp,
                    )
            except Exception as e:
                print(f"[RelationalMemory] Neo4j create relationship failed: {e}")

        self.relationships.append(rel_data)

    def find_path(
        self,
        start_node: str,
        end_node: str,
        max_hops: int = 3,
    ) -> Optional[List[Dict]]:
        """Find shortest path between nodes."""
        if self.driver:
            try:
                with self.driver.session() as session:
                    query = """
                    MATCH path = shortestPath(
                        (start {id: $start_node})-[*1..$max_hops]-(end {id: $end_node})
                    )
                    RETURN path
                    """
                    result = session.run(
                        query,
                        start_node=start_node,
                        end_node=end_node,
                        max_hops=max_hops,
                    )
                    record = result.single()
                    if record:
                        path = record["path"]
                        return [{"node": node["id"]} for node in path.nodes]
            except Exception as e:
                print(f"[RelationalMemory] Neo4j path finding failed: {e}")

        # Fallback: simple BFS path finding
        return self._bfs_path(start_node, end_node, max_hops)

    def _bfs_path(
        self,
        start: str,
        end: str,
        max_hops: int,
    ) -> Optional[List[Dict]]:
        """Simple BFS path finding for in-memory fallback."""
        if start not in self.nodes or end not in self.nodes:
            return None

        # Build adjacency list
        adj: Dict[str, List[str]] = {}
        for rel in self.relationships:
            from_node = rel["from"]
            to_node = rel["to"]
            adj.setdefault(from_node, []).append(to_node)
            adj.setdefault(to_node, []).append(from_node)

        # BFS
        visited = {start}
        queue = [(start, [start])]
        while queue:
            current, path = queue.pop(0)
            if current == end:
                return [{"node": n} for n in path]
            if len(path) > max_hops:
                continue
            for neighbor in adj.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

        return None

    def get_node(self, node_id: str) -> Optional[Dict]:
        """Retrieve node by ID."""
        if self.driver:
            try:
                with self.driver.session() as session:
                    result = session.run(
                        "MATCH (n {id: $node_id}) RETURN n",
                        node_id=node_id,
                    )
                    record = result.single()
                    if record:
                        node = record["n"]
                        return dict(node)
            except Exception as e:
                print(f"[RelationalMemory] Neo4j get node failed: {e}")

        return self.nodes.get(node_id)

    def get_neighbors(self, node_id: str) -> List[Dict]:
        """Get all neighbors of a node."""
        if self.driver:
            try:
                with self.driver.session() as session:
                    result = session.run(
                        """
                        MATCH (n {id: $node_id})-[r]-(neighbor)
                        RETURN neighbor.id as id, type(r) as relationship
                        """,
                        node_id=node_id,
                    )
                    return [{"id": record["id"], "relationship": record["relationship"]} for record in result]
            except Exception as e:
                print(f"[RelationalMemory] Neo4j get neighbors failed: {e}")

        # Fallback
        neighbors = []
        for rel in self.relationships:
            if rel["from"] == node_id:
                neighbors.append({"id": rel["to"], "relationship": rel["type"]})
            elif rel["to"] == node_id:
                neighbors.append({"id": rel["from"], "relationship": rel["type"]})
        return neighbors

    def close(self) -> None:
        """Close database connection."""
        if self.driver:
            self.driver.close()


class UnifiedMemoryLayer:
    """Unified interface for all memory layers.

    Provides a single entry point for all memory operations across
    the four-tier architecture: Working, Session, Semantic, and Relational.
    """

    def __init__(
        self,
        working_budget: int = 50,
        redis_url: Optional[str] = None,
        milvus_uri: Optional[str] = None,
        neo4j_uri: Optional[str] = None,
        neo4j_user: Optional[str] = None,
        neo4j_password: Optional[str] = None,
    ):
        self.working = WorkingMemory(budget=working_budget)
        self.session = SessionMemory(redis_url=redis_url)
        self.semantic = SemanticMemory(milvus_uri=milvus_uri)
        self.relational = RelationalMemory(
            neo4j_uri=neo4j_uri,
            neo4j_user=neo4j_user,
            neo4j_password=neo4j_password,
        )

    def get_status(self) -> Dict[str, Any]:
        """Get status of all memory layers."""
        status = {
            "working_memory": {
                "size": self.working.get_size(),
                "budget": self.working.budget,
                "is_full": self.working.is_full(),
                "backend": "in-memory",
            },
            "session_memory": {
                "active_sessions": len(self.session.sessions) if not self.session.is_production else "N/A",
                "backend": "redis" if self.session.is_production else "in-memory",
                "connected": self.session.is_production,
            },
            "semantic_memory": {
                "indexed_documents": len(self.semantic.vectors),
                "backend": "milvus" if self.semantic.is_production else "in-memory",
                "connected": self.semantic.is_production,
            },
            "relational_memory": {
                "nodes": len(self.relational.nodes),
                "relationships": len(self.relational.relationships),
                "backend": "neo4j" if self.relational.is_production else "in-memory",
                "connected": self.relational.is_production,
            },
        }
        # Provide legacy key expected by tests.
        status["working"] = status["working_memory"]
        return status

    def close(self) -> None:
        """Close all database connections."""
        self.relational.close()


if __name__ == "__main__":
    # Example usage
    print("=" * 50)
    print("OMEGA Trinity - Unified Memory Layer Demo")
    print("=" * 50)

    memory = UnifiedMemoryLayer()

    # Working memory example
    memory.working.add_entry({"type": "task", "content": "Research vector databases"})
    memory.working.add_entry({"type": "context", "content": "User is building an AI system"})
    print(f"\nWorking memory size: {memory.working.get_size()}")
    print(f"Recent entries: {memory.working.get_recent(2)}")

    # Semantic memory example
    vec_id = memory.semantic.index_document(
        "doc1",
        "Milvus is an open-source vector database for similarity search",
        {"source": "documentation"},
    )
    memory.semantic.index_document(
        "doc2",
        "Redis is an in-memory data structure store",
        {"source": "documentation"},
    )
    print(f"\nIndexed document: {vec_id}")
    print(f"Semantic search for 'vector': {memory.semantic.semantic_search('vector database', 2)}")

    # Relational memory example
    memory.relational.create_node("concept1", "Concept", {"name": "Vector Search"})
    memory.relational.create_node("tech1", "Technology", {"name": "Milvus"})
    memory.relational.create_node("tech2", "Technology", {"name": "Redis"})
    memory.relational.create_relationship("tech1", "concept1", "IMPLEMENTS")
    memory.relational.create_relationship("tech2", "concept1", "SUPPORTS")

    print(f"\nNeighbors of concept1: {memory.relational.get_neighbors('concept1')}")
    print(f"Path from tech1 to tech2: {memory.relational.find_path('tech1', 'tech2')}")

    print(f"\n{'=' * 50}")
    print("Memory layer status:")
    import json
    print(json.dumps(memory.get_status(), indent=2))
