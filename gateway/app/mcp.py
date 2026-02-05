import json
import asyncio
import logging
from mcp import ClientSession, stdio_client, StdioServerParameters

logger = logging.getLogger("omega.mcp")

class MCPManager:
    def __init__(self, config_path="/home/mega/NEXUS/mcp_config.json"):
        try:
            with open(config_path) as f:
                self.config = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load MCP config: {e}")
            self.config = {"mcpServers": {}}

    async def list_tools(self):
        all_tools = {}
        for name, cfg in self.config.get("mcpServers", {}).items():
            if cfg.get("disabled"): continue
            try:
                tools = await self._list_tools_for_server(name, cfg)
                all_tools[name] = tools
            except Exception as e:
                logger.error(f"Failed to list tools for {name}: {e}")
        return all_tools

    async def _list_tools_for_server(self, name, cfg):
        params = StdioServerParameters(
            command=cfg["command"],
            args=cfg["args"],
            env=cfg.get("env")
        )
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                # Use model_dump() if pydantic, else dict()
                return [t.model_dump() if hasattr(t, "model_dump") else t.dict() for t in tools.tools]

    async def call_tool(self, server_name: str, tool_name: str, arguments: dict):
        cfg = self.config.get("mcpServers", {}).get(server_name)
        if not cfg:
            raise ValueError(f"Server {server_name} not found")

        params = StdioServerParameters(
            command=cfg["command"],
            args=cfg["args"],
            env=cfg.get("env")
        )
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, arguments)
                # Convert content to a more serializable format if needed
                return [c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in result.content]

mcp_manager = MCPManager()
