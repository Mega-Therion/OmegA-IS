import httpx
import logging
import json
import os
from pathlib import Path
from typing import Optional, List
from pydantic import BaseModel
from .config import settings

logger = logging.getLogger("omega.treasury")

def get_nexus_home() -> Path:
    return Path(os.environ.get("HOME", "/home/mega")) / "NEXUS"

class WalletCommand(BaseModel):
    command: str
    amount: Optional[float] = 0.0
    service: Optional[str] = ""
    source: Optional[str] = ""

class TreasuryService:
    """
    Gateway interface to the omega-wallet Rust core.
    """
    def __init__(self):
        # Assuming wallet binary is at this path
        self.wallet_bin = get_nexus_home() / "rust" / "target" / "release" / "omega-wallet"

    async def get_balances(self) -> dict:
        import subprocess
        try:
            result = subprocess.run(
                [str(self.wallet_bin), "balance"],
                capture_output=True,
                text=True,
                check=True
            )
            # For simplicity, we'll read the JSON directly instead of parsing stdout
            treasury_path = get_nexus_home() / "identity" / "treasury.json"
            if treasury_path.exists():
                with open(treasury_path, "r") as f:
                    return json.load(f)
            return {"error": "Treasury file not found"}
        except Exception as e:
            logger.error(f"Failed to get wallet balances: {e}")
            return {"error": str(e)}

    async def execute_payment(self, amount: float, service: str) -> dict:
        import subprocess
        try:
            subprocess.run(
                [str(self.wallet_bin), "pay", str(amount), service],
                check=True
            )
            return await self.get_balances()
        except Exception as e:
            logger.error(f"Failed to execute payment: {e}")
            return {"error": str(e)}

    async def collect_revenue(self, amount: float, source: str) -> dict:
        import subprocess
        try:
            subprocess.run(
                [str(self.wallet_bin), "collect", str(amount), source],
                check=True
            )
            return await self.get_balances()
        except Exception as e:
            logger.error(f"Failed to collect revenue: {e}")
            return {"error": str(e)}

treasury_service = TreasuryService()
