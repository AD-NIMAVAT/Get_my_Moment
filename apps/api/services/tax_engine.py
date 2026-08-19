"""
Centralized GST Tax Engine for Get My Moment
Single Source of Truth for Platform & Client Invoicing Tax Calculations
"""

import re
from typing import Dict, Any, Optional
from decimal import Decimal, ROUND_HALF_UP


class TaxEngine:
    """
    GST Tax Calculation & Document Classification Engine.
    Handles Intra-State (CGST+SGST), Inter-State (IGST), Exemptions, and Bill of Supply rules.
    """

    GSTIN_REGEX = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')

    @classmethod
    def validate_gstin(cls, gstin: Optional[str]) -> bool:
        """Validate 15-character Indian GSTIN format."""
        if not gstin:
            return False
        clean_gstin = gstin.strip().upper()
        return bool(cls.GSTIN_REGEX.match(clean_gstin))

    @classmethod
    def determine_document_type(cls, gst_status: str, tax_mode: str) -> str:
        """
        Determine legal document classification based on Indian GST regulations:
        - TAX_INVOICE: Registered seller charging GST
        - BILL_OF_SUPPLY: Composition scheme seller or registered seller issuing non-tax invoice
        - COMMERCIAL_INVOICE: Unregistered non-GST seller
        """
        status = (gst_status or 'UNREGISTERED').strip().upper()
        mode = (tax_mode or 'WITHOUT_GST').strip().upper()

        if status == 'COMPOSITION':
            return 'BILL_OF_SUPPLY'
        elif status == 'REGISTERED':
            if mode == 'WITH_GST':
                return 'TAX_INVOICE'
            else:
                return 'BILL_OF_SUPPLY'
        else:
            return 'COMMERCIAL_INVOICE'

    @classmethod
    def calculate_tax(
        cls,
        subtotal: float,
        discount: float = 0.0,
        gst_status: str = 'UNREGISTERED',
        tax_mode: str = 'WITHOUT_GST',
        seller_state: Optional[str] = None,
        buyer_state: Optional[str] = None,
        tax_rate_pct: float = 18.0,
    ) -> Dict[str, Any]:
        """
        Calculate full tax breakdown and return deterministic financial figures.
        """
        subtotal_dec = Decimal(str(max(0.0, round(float(subtotal), 2))))
        discount_dec = Decimal(str(max(0.0, round(float(discount), 2))))
        taxable_dec = max(Decimal('0.00'), subtotal_dec - discount_dec)

        status = (gst_status or 'UNREGISTERED').strip().upper()
        mode = (tax_mode or 'WITHOUT_GST').strip().upper()

        # Enforce server-side GST applicability rule:
        # Only REGISTERED sellers with WITH_GST enabled can charge GST
        should_apply_gst = (status == 'REGISTERED' and mode == 'WITH_GST')
        document_type = cls.determine_document_type(status, mode)

        if not should_apply_gst:
            return {
                'document_type': document_type,
                'tax_mode': 'WITHOUT_GST' if status != 'REGISTERED' else mode,
                'gst_applied': False,
                'subtotal_inr': float(subtotal_dec),
                'discount_inr': float(discount_dec),
                'taxable_amount_inr': float(taxable_dec),
                'gst_rate_pct': 0.0,
                'cgst_rate_pct': 0.0,
                'sgst_rate_pct': 0.0,
                'igst_rate_pct': 0.0,
                'cgst_amount_inr': 0.0,
                'sgst_amount_inr': 0.0,
                'igst_amount_inr': 0.0,
                'total_tax_inr': 0.0,
                'grand_total_inr': float(taxable_dec),
            }

        # Apply GST
        rate_dec = Decimal(str(max(0.0, float(tax_rate_pct))))
        s_state = (seller_state or '').strip().lower()
        b_state = (buyer_state or '').strip().lower()

        is_intra_state = (not s_state or not b_state or s_state == b_state)

        if is_intra_state:
            half_rate = rate_dec / Decimal('2')
            cgst_dec = (taxable_dec * half_rate / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            sgst_dec = (taxable_dec * half_rate / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            igst_dec = Decimal('0.00')
            cgst_rate = float(half_rate)
            sgst_rate = float(half_rate)
            igst_rate = 0.0
        else:
            cgst_dec = Decimal('0.00')
            sgst_dec = Decimal('0.00')
            igst_dec = (taxable_dec * rate_dec / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            cgst_rate = 0.0
            sgst_rate = 0.0
            igst_rate = float(rate_dec)

        total_tax_dec = cgst_dec + sgst_dec + igst_dec
        grand_total_dec = taxable_dec + total_tax_dec

        return {
            'document_type': document_type,
            'tax_mode': 'WITH_GST',
            'gst_applied': True,
            'subtotal_inr': float(subtotal_dec),
            'discount_inr': float(discount_dec),
            'taxable_amount_inr': float(taxable_dec),
            'gst_rate_pct': float(rate_dec),
            'cgst_rate_pct': cgst_rate,
            'sgst_rate_pct': sgst_rate,
            'igst_rate_pct': igst_rate,
            'cgst_amount_inr': float(cgst_dec),
            'sgst_amount_inr': float(sgst_dec),
            'igst_amount_inr': float(igst_dec),
            'total_tax_inr': float(total_tax_dec),
            'grand_total_inr': float(grand_total_dec),
        }


tax_engine = TaxEngine()
