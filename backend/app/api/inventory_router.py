"""
VectorNet Asset Inventory & Telemetry Router
============================================
Endpoints for network device assets, syslog telemetry, and sample configurations.
"""

from typing import List, Optional
from fastapi import APIRouter

from backend.app.core.models import DeviceAsset, UnifiedJsonLog
from backend.app.data.sample_configs import SAMPLE_CONFIGS
from backend.app.services.telemetry_service import inventory_engine, log_aggregator_engine

router = APIRouter(tags=["Inventory & Telemetry"])


@router.get("/api/sample-configs")
def get_sample_configs():
    """Returns golden benchmark sample configurations (Cisco, Junos, PAN-OS)."""
    return SAMPLE_CONFIGS


@router.get("/api/inventory", response_model=List[DeviceAsset])
def get_inventory():
    """Returns all discovered network device assets."""
    return inventory_engine.get_all_assets()


@router.get("/api/inventory/{device_id}", response_model=Optional[DeviceAsset])
def get_device_asset(device_id: str):
    """Returns specific network device asset details."""
    return inventory_engine.get_asset_by_id(device_id)


@router.post("/api/inventory", response_model=DeviceAsset)
def add_device_asset(asset: DeviceAsset):
    """Registers or updates a discovered network device asset."""
    return inventory_engine.add_or_update_asset(asset)


@router.get("/api/logs", response_model=List[UnifiedJsonLog])
def get_telemetry_logs(device_id: Optional[str] = None):
    """Returns normalized multi-vendor syslog telemetry stream."""
    return log_aggregator_engine.get_logs(device_id=device_id)
