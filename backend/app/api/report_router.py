"""
VectorNet Defense PDF Report Generator Router
=============================================
Endpoints for exporting defense-grade ReportLab PDF compliance audit sheets.
"""

from typing import Optional
from fastapi import APIRouter, Form, HTTPException, Response

from backend.app.engines.compliance import ComplianceEngine
from backend.app.engines.normalizer import ConfigNormalizer
from backend.app.engines.pdf_generator import PDFReportGenerator

router = APIRouter(tags=["Reports & PDF Export"])


@router.post("/api/export-pdf")
@router.post("/api/v1/report/pdf")
async def post_pdf_report(
    raw_config: Optional[str] = Form(None),
    download: bool = Form(True)
):
    """Generates defense PDF report from uploaded or pasted configuration."""
    if not raw_config or not raw_config.strip():
        raise HTTPException(
            status_code=400,
            detail="No configuration content provided for PDF export."
        )

    sbm = ConfigNormalizer.parse_config(raw_config)
    summary = ComplianceEngine.evaluate_compliance(sbm)

    pdf_bytes = PDFReportGenerator.generate_pdf(summary)
    filename = f"vectornet_audit_{summary.sbm.device_metadata.hostname.lower()}.pdf"
    disp = f"attachment; filename=\"{filename}\"" if download else f"inline; filename=\"{filename}\""

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": disp}
    )

