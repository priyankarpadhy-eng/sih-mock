"""
VectorNet Asset Inventory & Syslog Telemetry Service
=====================================================
Manages discovered network hardware inventory and normalizes multi-vendor syslog
streams into a unified, queryable event stream.
"""

from typing import List, Optional

from backend.app.core.models import DeviceAsset, DeviceType, UnifiedJsonLog


class AssetInventoryEngine:
    """
    Manages active network hardware inventory (Routers, Switches, Firewalls, SASE, White-Box Nodes).
    Tracks model numbers, serial numbers, IP interfaces, management protocols, and live audit scores.
    """

    def __init__(self):
        self.inventory: List[DeviceAsset] = []

    def get_all_assets(self) -> List[DeviceAsset]:
        return self.inventory

    def get_asset_by_id(self, device_id: str) -> Optional[DeviceAsset]:
        for asset in self.inventory:
            if asset.device_id == device_id:
                return asset
        return self.inventory[0] if self.inventory else None

    def add_or_update_asset(self, asset: DeviceAsset) -> DeviceAsset:
        for idx, existing in enumerate(self.inventory):
            if existing.device_id == asset.device_id or existing.hostname.lower() == asset.hostname.lower():
                self.inventory[idx] = asset
                return asset
        self.inventory.append(asset)
        return asset


class CentralizedLogAggregator:
    """
    Normalizes multi-vendor syslog streams into a standardized JSON Log Lake.
    """

    def __init__(self):
        self.logs: List[UnifiedJsonLog] = []

    def add_log(self, log: UnifiedJsonLog) -> UnifiedJsonLog:
        self.logs.append(log)
        return log

    def get_logs(self, device_id: Optional[str] = None) -> List[UnifiedJsonLog]:
        if device_id:
            return [l for l in self.logs if l.device_id == device_id]
        return self.logs


inventory_engine = AssetInventoryEngine()
log_aggregator_engine = CentralizedLogAggregator()
