"""
VectorNet Defense PDF Report Generator Router
=============================================
Endpoints for exporting defense-grade ReportLab PDF compliance audit sheets.
"""

from typing import Optional
from fastapi import APIRouter, Form, Response

from backend.app.data.sample_configs import SAMPLE_CONFIGS
from backend.app.engines.compliance import ComplianceEngine
from backend.app.engines.normalizer import ConfigNormalizer
from backend.app.engines.pdf_generator import PDFReportGenerator

router = APIRouter(tags=["Reports & PDF Export"])


@router.get("/api/v1/report/pdf")
def get_pdf_report(download: bool = False):
    """Generates PDF report for default gold standard benchmark (Cisco CUCME)."""
    text_content = SAMPLE_CONFIGS["cisco_cucme"]["raw"]
    sbm = ConfigNormalizer.parse_config(text_content)
    summary = ComplianceEngine.evaluate_compliance(sbm)
    
    pdf_bytes = PDFReportGenerator.generate_pdf(summary)
    filename = f"vectornet_verification_sheet_{summary.sbm.device_metadata.hostname.lower()}.pdf"
    disp = f"attachment; filename=\"{filename}\"" if download else f"inline; filename=\"{filename}\""
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": disp}
    )


@router.post("/api/export-pdf")
@router.post("/api/v1/report/pdf")
async def post_pdf_report(
    raw_config: Optional[str] = Form(None),
    download: bool = Form(True)
):
    """Generates on-demand defense PDF report from uploaded or pasted configuration."""
    text_content = raw_config if raw_config else SAMPLE_CONFIGS["cisco_cucme"]["raw"]
    sbm = ConfigNormalizer.parse_config(text_content)
    summary = ComplianceEngine.evaluate_compliance(sbm)
    
    pdf_bytes = PDFReportGenerator.generate_pdf(summary)
    filename = f"vectornet_verification_sheet_{summary.sbm.device_metadata.hostname.lower()}.pdf"
    disp = f"attachment; filename=\"{filename}\"" if download else f"inline; filename=\"{filename}\""
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": disp}
    )
