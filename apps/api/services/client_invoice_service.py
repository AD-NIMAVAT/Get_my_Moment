"""
Get My Moment — Client Invoicing, Quotations, Milestones, Payments & Export Service
Flow A: Photographer -> Client Billing Engine
"""

import uuid
import csv
import io
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from apps.api.models.photographer import Photographer
from apps.api.models.finance import (
    ClientInvoice,
    ClientInvoiceItem,
    ClientPaymentRecord,
    InvoicePaymentMilestone,
    InvoiceSequence,
    CreditNote,
)
from apps.api.models.crm import Lead, Quotation, QuotationItem
from apps.api.services.tax_engine import tax_engine


class ClientInvoiceService:
    """
    Comprehensive service for Photographer-to-Client financial transactions.
    """

    def get_financial_year(self, dt: Optional[datetime] = None) -> str:
        """Calculate Indian Financial Year (e.g. 2026-27)."""
        d = dt or datetime.utcnow()
        if d.month >= 4:
            return f"{d.year}-{(d.year + 1) % 100:02d}"
        else:
            return f"{d.year - 1}-{d.year % 100:02d}"

    def get_next_sequence_number(
        self,
        db: Session,
        photographer_id: str,
        doc_type: str = "INVOICE"
    ) -> str:
        """
        Atomic sequence generator for concurrency-safe invoice and quotation numbering.
        Format:
        - INVOICE: INV-YYYY-000001
        - QUOTATION: QT-YYYY-000001
        - RECEIPT: RCP-YYYY-000001
        - CREDIT_NOTE: CN-YYYY-000001
        """
        fy = self.get_financial_year()
        year_tag = fy.split("-")[0]

        # Use atomic update / select for update
        seq = db.query(InvoiceSequence).filter(
            InvoiceSequence.photographer_id == photographer_id,
            InvoiceSequence.document_type == doc_type,
            InvoiceSequence.financial_year == fy,
        ).with_for_update().first()

        if not seq:
            seq = InvoiceSequence(
                photographer_id=photographer_id,
                document_type=doc_type,
                financial_year=fy,
                last_number=1,
            )
            db.add(seq)
            db.flush()
            num = 1
        else:
            seq.last_number += 1
            db.flush()
            num = seq.last_number

        prefixes = {
            "INVOICE": "INV",
            "QUOTATION": "QT",
            "RECEIPT": "RCP",
            "CREDIT_NOTE": "CN",
        }
        prefix = prefixes.get(doc_type, "INV")
        return f"{prefix}-{year_tag}-{num:06d}"

    # -------------------------------------------------------------
    # QUOTATIONS & ESTIMATES
    # -------------------------------------------------------------
    def create_quotation(
        self,
        db: Session,
        photographer: Photographer,
        data: Dict[str, Any]
    ) -> Quotation:
        """Create a new client quotation / estimate."""
        quotation_num = self.get_next_sequence_number(db, photographer.id, "QUOTATION")

        items_data = data.get("items", [])
        subtotal = 0.0
        line_items = []

        for idx, item in enumerate(items_data):
            qty = float(item.get("quantity", 1.0))
            price = float(item.get("unit_price_inr", 0.0))
            disc = float(item.get("discount_inr", 0.0))
            line_total = max(0.0, round((qty * price) - disc, 2))
            subtotal += line_total

            line_items.append(
                QuotationItem(
                    service_type=item.get("service_type", "PHOTOGRAPHY"),
                    description=item.get("description", "Photography Service"),
                    quantity=qty,
                    unit_price_inr=price,
                    discount_inr=disc,
                    line_total_inr=line_total,
                    sort_order=idx,
                )
            )

        overall_discount = float(data.get("discount_inr", 0.0))
        tax_mode = data.get("tax_mode", photographer.default_tax_mode or "WITHOUT_GST")
        tax_pct = float(data.get("tax_pct", 18.0 if tax_mode == "WITH_GST" else 0.0))

        tax_res = tax_engine.calculate_tax(
            subtotal=subtotal,
            discount=overall_discount,
            gst_status=photographer.gst_status,
            tax_mode=tax_mode,
            seller_state=photographer.gst_state or photographer.state,
            buyer_state=data.get("venue_city"),
            tax_rate_pct=tax_pct,
        )

        lead_id = data.get("lead_id")
        if not lead_id:
            lead = Lead(
                photographer_id=photographer.id,
                client_name=data.get("client_name", "Client"),
                client_phone=data.get("client_phone") or "N/A",
                client_email=data.get("client_email"),
                event_type=data.get("event_type", "Wedding"),
                event_date=data.get("event_date"),
                venue_city=data.get("venue_city"),
                estimated_budget_inr=tax_res["grand_total_inr"],
                stage="QUOTE_SENT",
            )
            db.add(lead)
            db.flush()
            lead_id = lead.id

        quotation = Quotation(
            photographer_id=photographer.id,
            lead_id=lead_id,
            quotation_number=quotation_num,
            package_name=data.get("package_name", "Photography Package"),
            client_name=data.get("client_name", "Client"),
            client_phone=data.get("client_phone"),
            client_email=data.get("client_email"),
            event_type=data.get("event_type", "Wedding"),
            event_date=data.get("event_date"),
            venue_city=data.get("venue_city"),
            deliverables=data.get("deliverables", []),
            subtotal_inr=tax_res["subtotal_inr"],
            discount_inr=tax_res["discount_inr"],
            price_inr=tax_res["taxable_amount_inr"],
            tax_mode=tax_res["tax_mode"],
            tax_pct=tax_res["gst_rate_pct"],
            tax_amount_inr=tax_res["total_tax_inr"],
            total_amount_inr=tax_res["grand_total_inr"],
            status="DRAFT",
            valid_until=data.get("valid_until"),
            notes=data.get("notes"),
            terms_conditions=data.get("terms_conditions"),
            items=line_items,
        )

        db.add(quotation)
        db.commit()
        db.refresh(quotation)
        return quotation

    def convert_quotation_to_invoice(
        self,
        db: Session,
        photographer: Photographer,
        quotation_id: str
    ) -> ClientInvoice:
        """1-Click Conversion: Converts an accepted Quotation into a full Client Invoice."""
        quotation = db.query(Quotation).filter(
            Quotation.id == quotation_id,
            Quotation.photographer_id == photographer.id
        ).first()

        if not quotation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

        if quotation.status == "CONVERTED" and quotation.converted_invoice_id:
            existing_inv = db.query(ClientInvoice).filter(ClientInvoice.id == quotation.converted_invoice_id).first()
            if existing_inv:
                return existing_inv

        invoice_num = self.get_next_sequence_number(db, photographer.id, "INVOICE")
        fy = self.get_financial_year()

        tax_res = tax_engine.calculate_tax(
            subtotal=quotation.subtotal_inr,
            discount=quotation.discount_inr,
            gst_status=photographer.gst_status,
            tax_mode=quotation.tax_mode,
            seller_state=photographer.gst_state or photographer.state,
            buyer_state=quotation.venue_city,
            tax_rate_pct=quotation.tax_pct or 18.0,
        )

        invoice_items = []
        for idx, q_item in enumerate(quotation.items):
            invoice_items.append(
                ClientInvoiceItem(
                    service_type=q_item.service_type,
                    description=q_item.description,
                    quantity=q_item.quantity,
                    unit_price_inr=q_item.unit_price_inr,
                    discount_type="FIXED",
                    discount_value=q_item.discount_inr,
                    discount_amount_inr=q_item.discount_inr,
                    tax_rate_pct=tax_res["gst_rate_pct"],
                    tax_amount_inr=round(q_item.line_total_inr * (tax_res["gst_rate_pct"] / 100), 2) if tax_res["gst_applied"] else 0.0,
                    line_total_inr=q_item.line_total_inr,
                    sort_order=idx,
                )
            )

        invoice = ClientInvoice(
            photographer_id=photographer.id,
            quotation_id=quotation.id,
            invoice_number=invoice_num,
            financial_year=fy,
            document_type=tax_res["document_type"],
            tax_mode=tax_res["tax_mode"],
            gst_applied=tax_res["gst_applied"],
            gst_rate_pct=tax_res["gst_rate_pct"],
            invoice_date=datetime.utcnow(),
            due_date=quotation.valid_until,
            finalized_at=datetime.utcnow(),
            status="ISSUED",
            client_name=quotation.client_name,
            client_phone=quotation.client_phone,
            client_email=quotation.client_email,
            client_city=quotation.venue_city,
            event_name=f"{quotation.event_type} - {quotation.client_name}",
            event_date=quotation.event_date,
            event_venue=quotation.venue_city,
            subtotal_inr=tax_res["subtotal_inr"],
            discount_inr=tax_res["discount_inr"],
            taxable_amount_inr=tax_res["taxable_amount_inr"],
            cgst_amount_inr=tax_res["cgst_amount_inr"],
            sgst_amount_inr=tax_res["sgst_amount_inr"],
            igst_amount_inr=tax_res["igst_amount_inr"],
            total_tax_inr=tax_res["total_tax_inr"],
            grand_total_inr=tax_res["grand_total_inr"],
            amount_paid_inr=0.0,
            balance_due_inr=tax_res["grand_total_inr"],
            seller_legal_name_snapshot=photographer.gst_legal_name or photographer.studio_name,
            seller_gstin_snapshot=photographer.gstin or photographer.gst_number,
            seller_state_snapshot=photographer.gst_state or photographer.state,
            seller_address_snapshot=photographer.gst_address,
            seller_bank_name_snapshot=photographer.bank_name,
            seller_account_no_snapshot=photographer.bank_account_number,
            seller_ifsc_snapshot=photographer.bank_ifsc,
            seller_upi_id_snapshot=photographer.upi_id,
            notes=quotation.notes,
            terms_conditions=quotation.terms_conditions,
            items=invoice_items,
        )

        db.add(invoice)
        db.flush()

        quotation.status = "CONVERTED"
        quotation.converted_invoice_id = invoice.id

        db.commit()
        db.refresh(invoice)
        return invoice

    # -------------------------------------------------------------
    # CLIENT INVOICE LIFECYCLE & TAX SNAPSHOTS
    # -------------------------------------------------------------
    def create_invoice(
        self,
        db: Session,
        photographer: Photographer,
        data: Dict[str, Any]
    ) -> ClientInvoice:
        """Create a Draft or Issued Client Invoice."""
        invoice_num = self.get_next_sequence_number(db, photographer.id, "INVOICE")
        fy = self.get_financial_year()

        items_data = data.get("items", [])
        subtotal = 0.0
        line_items = []

        tax_mode = data.get("tax_mode", photographer.default_tax_mode or "WITHOUT_GST")
        tax_pct = float(data.get("gst_rate_pct", 18.0))

        for idx, item in enumerate(items_data):
            qty = float(item.get("quantity", 1.0))
            price = float(item.get("unit_price_inr", 0.0))
            disc_val = float(item.get("discount_value", 0.0))
            disc_type = item.get("discount_type", "FIXED")

            if disc_type == "PERCENTAGE":
                disc_amt = round((qty * price) * (disc_val / 100), 2)
            else:
                disc_amt = round(disc_val, 2)

            line_tot = max(0.0, round((qty * price) - disc_amt, 2))
            subtotal += line_tot

            line_items.append(
                ClientInvoiceItem(
                    service_type=item.get("service_type", "PHOTOGRAPHY"),
                    description=item.get("description", "Photography Service"),
                    quantity=qty,
                    unit_price_inr=price,
                    discount_type=disc_type,
                    discount_value=disc_val,
                    discount_amount_inr=disc_amt,
                    tax_rate_pct=tax_pct,
                    line_total_inr=line_tot,
                    sort_order=idx,
                )
            )

        overall_discount = float(data.get("discount_inr", 0.0))
        buyer_state = data.get("client_state") or data.get("client_city")

        tax_res = tax_engine.calculate_tax(
            subtotal=subtotal,
            discount=overall_discount,
            gst_status=photographer.gst_status,
            tax_mode=tax_mode,
            seller_state=photographer.gst_state or photographer.state,
            buyer_state=buyer_state,
            tax_rate_pct=tax_pct,
        )

        # Milestone Schedule setup
        milestones_data = data.get("milestones", [])
        milestone_items = []
        grand_total = tax_res["grand_total_inr"]

        if milestones_data:
            for m in milestones_data:
                pct = float(m.get("percentage", 0.0))
                amt = float(m.get("amount_inr", 0.0))
                if amt <= 0.0 and pct > 0.0:
                    amt = round(grand_total * (pct / 100), 2)

                milestone_items.append(
                    InvoicePaymentMilestone(
                        photographer_id=photographer.id,
                        title=m.get("title", "Payment Milestone"),
                        percentage=pct,
                        amount_inr=amt,
                        due_date=m.get("due_date"),
                        status="PENDING",
                    )
                )

        # Immediate advance payment recording if provided
        initial_advance = float(data.get("advance_paid_inr", 0.0))
        payment_records = []
        status_val = "ISSUED" if data.get("finalize", True) else "DRAFT"

        if initial_advance > 0.0:
            receipt_no = self.get_next_sequence_number(db, photographer.id, "RECEIPT")
            payment_records.append(
                ClientPaymentRecord(
                    photographer_id=photographer.id,
                    receipt_number=receipt_no,
                    amount_inr=initial_advance,
                    payment_mode=data.get("advance_payment_mode", "UPI"),
                    payment_status="SUCCESS",
                    reference_no=data.get("advance_reference_no"),
                    payment_date=datetime.utcnow(),
                    notes="Advance Token Payment Recorded at Invoice Creation",
                )
            )
            balance = max(0.0, round(grand_total - initial_advance, 2))
            if balance == 0.0:
                status_val = "PAID"
            else:
                status_val = "PARTIALLY_PAID"
        else:
            balance = grand_total

        invoice = ClientInvoice(
            photographer_id=photographer.id,
            event_id=data.get("event_id"),
            quotation_id=data.get("quotation_id"),
            invoice_number=invoice_num,
            financial_year=fy,
            document_type=tax_res["document_type"],
            tax_mode=tax_res["tax_mode"],
            gst_applied=tax_res["gst_applied"],
            gst_rate_pct=tax_res["gst_rate_pct"],
            invoice_date=data.get("invoice_date") or datetime.utcnow(),
            due_date=data.get("due_date"),
            finalized_at=datetime.utcnow() if status_val != "DRAFT" else None,
            status=status_val,
            client_name=data.get("client_name", "Client"),
            client_phone=data.get("client_phone"),
            client_email=data.get("client_email"),
            client_address=data.get("client_address"),
            client_city=data.get("client_city"),
            client_state=data.get("client_state"),
            client_state_code=data.get("client_state_code"),
            client_pincode=data.get("client_pincode"),
            client_gstin=data.get("client_gstin"),
            event_name=data.get("event_name"),
            event_date=data.get("event_date"),
            event_venue=data.get("event_venue"),
            subtotal_inr=tax_res["subtotal_inr"],
            discount_inr=tax_res["discount_inr"],
            taxable_amount_inr=tax_res["taxable_amount_inr"],
            cgst_amount_inr=tax_res["cgst_amount_inr"],
            sgst_amount_inr=tax_res["sgst_amount_inr"],
            igst_amount_inr=tax_res["igst_amount_inr"],
            total_tax_inr=tax_res["total_tax_inr"],
            grand_total_inr=grand_total,
            amount_paid_inr=initial_advance,
            balance_due_inr=balance,
            seller_legal_name_snapshot=photographer.gst_legal_name or photographer.studio_name,
            seller_gstin_snapshot=photographer.gstin or photographer.gst_number,
            seller_state_snapshot=photographer.gst_state or photographer.state,
            seller_address_snapshot=photographer.gst_address,
            seller_bank_name_snapshot=photographer.bank_name,
            seller_account_no_snapshot=photographer.bank_account_number,
            seller_ifsc_snapshot=photographer.bank_ifsc,
            seller_upi_id_snapshot=photographer.upi_id,
            notes=data.get("notes"),
            terms_conditions=data.get("terms_conditions"),
            items=line_items,
            milestones=milestone_items,
            payments=payment_records,
        )

        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        return invoice

    def record_client_payment(
        self,
        db: Session,
        photographer: Photographer,
        invoice_id: str,
        amount: float,
        payment_mode: str = "UPI",
        reference_no: Optional[str] = None,
        milestone_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> ClientPaymentRecord:
        """Record advance / partial / milestone payment against a Client Invoice."""
        invoice = db.query(ClientInvoice).filter(
            ClientInvoice.id == invoice_id,
            ClientInvoice.photographer_id == photographer.id
        ).with_for_update().first()

        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

        if invoice.status == "CANCELLED":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot record payments on cancelled invoice.")

        amount_val = float(max(0.0, round(amount, 2)))
        if amount_val <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero.")

        receipt_no = self.get_next_sequence_number(db, photographer.id, "RECEIPT")

        payment = ClientPaymentRecord(
            invoice_id=invoice.id,
            photographer_id=photographer.id,
            milestone_id=milestone_id,
            receipt_number=receipt_no,
            amount_inr=amount_val,
            payment_mode=payment_mode,
            payment_status="SUCCESS",
            reference_no=reference_no,
            payment_date=datetime.utcnow(),
            notes=notes,
        )
        db.add(payment)
        db.flush()

        # Recalculate authoritative amount_paid and balance_due
        total_paid = db.query(func.sum(ClientPaymentRecord.amount_inr)).filter(
            ClientPaymentRecord.invoice_id == invoice.id,
            ClientPaymentRecord.payment_status == "SUCCESS"
        ).scalar() or 0.0

        invoice.amount_paid_inr = round(float(total_paid), 2)
        invoice.balance_due_inr = max(0.0, round(invoice.grand_total_inr - invoice.amount_paid_inr, 2))

        if invoice.balance_due_inr == 0.0:
            invoice.status = "PAID"
        elif invoice.amount_paid_inr > 0:
            invoice.status = "PARTIALLY_PAID"
        else:
            invoice.status = "ISSUED"

        # Update milestone if linked
        if milestone_id:
            milestone = db.query(InvoicePaymentMilestone).filter(
                InvoicePaymentMilestone.id == milestone_id,
                InvoicePaymentMilestone.invoice_id == invoice.id
            ).first()
            if milestone:
                milestone.status = "PAID"
                milestone.paid_at = datetime.utcnow()

        db.commit()
        db.refresh(payment)
        return payment

    # -------------------------------------------------------------
    # HTML / PDF RENDERING ENGINE
    # -------------------------------------------------------------
    def render_invoice_html(self, invoice: ClientInvoice, photographer: Photographer) -> str:
        """Render official A4 printable Client Invoice HTML."""
        seller_name = invoice.seller_legal_name_snapshot or photographer.studio_name
        seller_gstin = invoice.seller_gstin_snapshot or photographer.gstin or "N/A"
        seller_address = invoice.seller_address_snapshot or photographer.gst_address or f"{photographer.city or ''}, {photographer.state or ''}"
        seller_upi = invoice.seller_upi_id_snapshot or photographer.upi_id
        seller_bank = invoice.seller_bank_name_snapshot or photographer.bank_name
        seller_acc = invoice.seller_account_no_snapshot or photographer.bank_account_number
        seller_ifsc = invoice.seller_ifsc_snapshot or photographer.bank_ifsc

        doc_title = "TAX INVOICE"
        if invoice.document_type == "BILL_OF_SUPPLY":
            doc_title = "BILL OF SUPPLY"
        elif invoice.document_type == "COMMERCIAL_INVOICE":
            doc_title = "COMMERCIAL INVOICE / BILL"

        upi_qr_img = ""
        if seller_upi and invoice.balance_due_inr > 0:
            upi_link = f"upi://pay?pa={seller_upi}&pn={urllib.parse.quote(seller_name)}&am={invoice.balance_due_inr:.2f}&cu=INR&tn={invoice.invoice_number}"
            upi_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=140x140&data={urllib.parse.quote(upi_link)}"
            upi_qr_img = f'<div style="text-align:center;background:#FAF9F7;padding:12px;border-radius:12px;border:1px solid #E8E5E2;display:inline-block;"><img src="{upi_qr_url}" alt="UPI QR" style="width:110px;height:110px;display:block;margin:0 auto;" /><div style="font-size:10px;font-weight:700;color:#E86A5B;margin-top:6px;">SCAN TO PAY VIA UPI</div><div style="font-size:9px;color:#6B7280;font-family:monospace;">{seller_upi}</div></div>'

        item_rows = ""
        for idx, it in enumerate(invoice.items, 1):
            disc_text = f"-₹{it.discount_amount_inr:,.2f}" if it.discount_amount_inr > 0 else "-"
            item_rows += f'<tr><td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;color:#6B7280;">{idx}</td><td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;"><strong>{it.description}</strong><div style="font-size:10px;color:#6B7280;text-transform:uppercase;">Category: {it.service_type}</div></td><td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;">{it.quantity:g}</td><td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">₹{it.unit_price_inr:,.2f}</td><td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#6B7280;">{disc_text}</td><td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:700;">₹{it.line_total_inr:,.2f}</td></tr>'

        tax_rows = ""
        if invoice.gst_applied:
            if invoice.cgst_amount_inr > 0:
                tax_rows += f'<tr><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;color:#4B5563;">CGST ({invoice.gst_rate_pct/2:.1f}%)</td><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">₹{invoice.cgst_amount_inr:,.2f}</td></tr><tr><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;color:#4B5563;">SGST ({invoice.gst_rate_pct/2:.1f}%)</td><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">₹{invoice.sgst_amount_inr:,.2f}</td></tr>'
            else:
                tax_rows += f'<tr><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;color:#4B5563;">IGST ({invoice.gst_rate_pct:.1f}%)</td><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">₹{invoice.igst_amount_inr:,.2f}</td></tr>'

        payment_rows = ""
        if invoice.payments:
            for p in invoice.payments:
                ref_txt = f"({p.reference_no})" if p.reference_no else ""
                payment_rows += f'<tr style="font-size:11px;"><td style="padding:6px 8px;border-bottom:1px dashed #E5E7EB;">{p.receipt_number}</td><td style="padding:6px 8px;border-bottom:1px dashed #E5E7EB;">{p.payment_date.strftime("%d/%m/%Y")}</td><td style="padding:6px 8px;border-bottom:1px dashed #E5E7EB;">{p.payment_mode} {ref_txt}</td><td style="padding:6px 8px;border-bottom:1px dashed #E5E7EB;text-align:right;font-weight:700;color:#059669;">₹{p.amount_inr:,.2f}</td></tr>'

        bank_box_html = ""
        if seller_bank or seller_upi:
            bank_box_html = f'<div style="margin-top:12px;font-size:11px;color:#4B5563;background:#FAF9F7;padding:10px 14px;border-radius:10px;border:1px solid #E8E5E2;"><strong style="color:#111827;">Bank Transfer Details:</strong><br>Bank: <strong>{seller_bank or "N/A"}</strong> | A/C: <strong>{seller_acc or "N/A"}</strong><br>IFSC: <strong>{seller_ifsc or "N/A"}</strong> | UPI ID: <strong>{seller_upi or "N/A"}</strong></div>'

        discount_row_html = f'<tr><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;color:#DC2626;">Discount</td><td style="padding:6px 12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#DC2626;">-₹{invoice.discount_inr:,.2f}</td></tr>' if invoice.discount_inr > 0 else ""
        receipts_box_html = f'<div style="margin-top:20px;"><strong style="font-size:11px;color:#111827;">Payment Receipts:</strong><table style="margin-top:6px;"><thead><tr style="font-size:10px;background:#F9FAFB;"><th style="padding:4px 8px;">Receipt #</th><th style="padding:4px 8px;">Date</th><th style="padding:4px 8px;">Mode</th><th style="padding:4px 8px;text-align:right;">Amount</th></tr></thead><tbody>{payment_rows}</tbody></table></div>' if payment_rows else ""
        gstin_header_html = f'<div style="font-size:11px;color:#1F2937;margin-top:2px;"><strong>GSTIN:</strong> {seller_gstin}</div>' if invoice.gst_applied else ""
        due_date_header_html = f'<div style="font-size:11px;color:#DC2626;">Due Date: {invoice.due_date.strftime("%d %B %Y")}</div>' if invoice.due_date else ""
        client_gstin_html = f'<div style="margin-top:4px;"><strong>Client GSTIN:</strong> {invoice.client_gstin}</div>' if invoice.client_gstin else ""
        terms_box_html = f'<strong>Terms & Conditions:</strong><br>{invoice.terms_conditions}<br><br>' if invoice.terms_conditions else ""
        balance_color = "#DC2626" if invoice.balance_due_inr > 0 else "#059669"

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{doc_title} - {invoice.invoice_number} | {seller_name}</title>
  <style>
    @page {{ size: A4 portrait; margin: 12mm 15mm; }}
    * {{ box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; margin: 0; padding: 24px 16px; background: #F3F1EC; }}
    .no-print-bar {{ max-width: 820px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: space-between; background: #1E293B; color: #FFFFFF; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }}
    .no-print-bar button {{ background: linear-gradient(135deg, #E86A5B, #D95748); color: #FFFFFF; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }}
    .invoice-card {{ max-width: 820px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 36px 40px; border: 1px solid #E2DDD5; }}
    .header {{ display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #E86A5B; margin-bottom: 24px; }}
    .logo {{ font-size: 22px; font-weight: 800; color: #1F2937; letter-spacing: -0.5px; }}
    .badge {{ background: #ECFDF5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px; border: 1px solid #A7F3D0; display: inline-block; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 12px; line-height: 1.5; }}
    .party-box {{ background: #FAF9F7; padding: 14px 16px; border-radius: 12px; border: 1px solid #E8E5E2; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }}
    th {{ background: #F3F4F6; text-align: left; padding: 9px 12px; font-weight: 700; color: #4B5563; border-bottom: 1px solid #D1D5DB; }}
    .total-box {{ max-width: 320px; margin-left: auto; font-size: 13px; }}
    @media print {{
      body {{ background: #FFFFFF !important; padding: 0 !important; }}
      .no-print, .no-print-bar {{ display: none !important; }}
      .invoice-card {{ box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }}
    }}
  </style>
  <script>
    window.addEventListener('DOMContentLoaded', () => {{
      const params = new URLSearchParams(window.location.search);
      if (params.get('autoprint') === 'true') {{
        setTimeout(() => {{ window.print(); }}, 400);
      }}
    }});
  </script>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size: 13px; font-weight: 600;">📄 {doc_title} — <span style="color: #94A3B8;">{invoice.invoice_number}</span> ({invoice.status})</div>
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="logo">{seller_name}</div>
        <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Professional Photography & Cinematic Films</div>
        <div style="font-size: 11px; color: #4B5563; margin-top: 4px;">{seller_address}</div>
        {gstin_header_html}
      </div>
      <div style="text-align: right;">
        <span class="badge">{doc_title} — {invoice.status}</span>
        <div style="font-size: 15px; font-weight: 800; margin-top: 8px; color: #111827;">{invoice.invoice_number}</div>
        <div style="font-size: 11px; color: #6B7280;">Date: {invoice.invoice_date.strftime('%d %B %Y')}</div>
        {due_date_header_html}
      </div>
    </div>
    <div class="grid">
      <div class="party-box">
        <strong style="color: #E86A5B; font-size: 11px; text-transform: uppercase;">Billed To (Client):</strong><br>
        <div style="font-weight: 700; font-size: 13px; color: #111827; margin-top: 3px;">{invoice.client_name}</div>
        <div style="color: #4B5563; margin-top: 2px;">{invoice.client_phone or ''} {f' | {invoice.client_email}' if invoice.client_email else ''}</div>
        <div style="color: #4B5563;">{invoice.client_city or ''} {f', {invoice.client_state}' if invoice.client_state else ''}</div>
        {client_gstin_html}
      </div>
      <div class="party-box">
        <strong style="color: #E86A5B; font-size: 11px; text-transform: uppercase;">Event Details:</strong><br>
        <div style="font-weight: 700; font-size: 13px; color: #111827; margin-top: 3px;">{invoice.event_name or 'Photography Services'}</div>
        <div style="color: #4B5563; margin-top: 2px;">Date: {invoice.event_date.strftime('%d %B %Y') if invoice.event_date else 'Scheduled'}</div>
        <div style="color: #4B5563;">Venue: {invoice.event_venue or 'On Location'}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Service Description</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 100px; text-align: right;">Rate</th>
          <th style="width: 80px; text-align: right;">Disc</th>
          <th style="width: 110px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>{item_rows}</tbody>
    </table>
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
      <div style="flex: 1;">
        {upi_qr_img}
        {bank_box_html}
      </div>
      <div class="total-box">
        <table>
          <tr>
            <td style="padding: 6px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">Subtotal</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">₹{invoice.subtotal_inr:,.2f}</td>
          </tr>
          {discount_row_html}
          {tax_rows}
          <tr style="font-size: 14px; font-weight: 800; background: #FDF2F1; color: #E86A5B;">
            <td style="padding: 10px 12px; border-radius: 8px 0 0 8px;">Grand Total</td>
            <td style="padding: 10px 12px; text-align: right; border-radius: 0 8px 8px 0;">₹{invoice.grand_total_inr:,.2f}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; border-bottom: 1px solid #E5E7EB; color: #059669; font-weight: 700;">Amount Paid</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700; color: #059669;">₹{invoice.amount_paid_inr:,.2f}</td>
          </tr>
          <tr style="font-size: 13px; font-weight: 800; color: {balance_color};">
            <td style="padding: 8px 12px;">Balance Due</td>
            <td style="padding: 8px 12px; text-align: right;">₹{invoice.balance_due_inr:,.2f}</td>
          </tr>
        </table>
      </div>
    </div>
    {receipts_box_html}
    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #6B7280; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        {terms_box_html}
        This is a computer-generated invoice issued by {seller_name}.
      </div>
      <div style="text-align: right; min-width: 140px;">
        <div style="font-weight: 700; color: #1F2937; margin-bottom: 30px;">For {seller_name}</div>
        <div style="border-top: 1px dashed #9CA3AF; padding-top: 4px;">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>"""
        return html

    # -------------------------------------------------------------
    # WHATSAPP SHARING
    # -------------------------------------------------------------
    def generate_whatsapp_share_payload(
        self,
        invoice: ClientInvoice,
        photographer: Photographer,
        base_url: str = "http://localhost:3000"
    ) -> Dict[str, Any]:
        """Generate ready-to-share WhatsApp click-to-chat payload."""
        seller_name = invoice.seller_legal_name_snapshot or photographer.studio_name
        share_url = f"{base_url}/i/{invoice.secure_share_token}"

        msg = (
            f"Hello {invoice.client_name}! 📸\n\n"
            f"Here is your official invoice from *{seller_name}* for {invoice.event_name or 'Photography Services'}:\n\n"
            f"📄 *Invoice No:* {invoice.invoice_number}\n"
            f"💰 *Total Amount:* ₹{invoice.grand_total_inr:,.2f}\n"
            f"✅ *Amount Paid:* ₹{invoice.amount_paid_inr:,.2f}\n"
            f"⏳ *Balance Due:* ₹{invoice.balance_due_inr:,.2f}\n"
            f"📌 *Status:* {invoice.status}\n\n"
            f"🔗 *View & Download PDF Invoice:* {share_url}\n\n"
            f"Thank you for choosing {seller_name}!"
        )

        clean_phone = (invoice.client_phone or "").replace("+", "").replace("-", "").replace(" ", "")
        if clean_phone and not clean_phone.startswith("91") and len(clean_phone) == 10:
            clean_phone = f"91{clean_phone}"

        wa_link = f"https://api.whatsapp.com/send?phone={clean_phone}&text={urllib.parse.quote(msg)}"

        return {
            "client_name": invoice.client_name,
            "client_phone": invoice.client_phone,
            "invoice_number": invoice.invoice_number,
            "grand_total_inr": invoice.grand_total_inr,
            "balance_due_inr": invoice.balance_due_inr,
            "share_url": share_url,
            "message_text": msg,
            "whatsapp_click_url": wa_link,
        }

    # -------------------------------------------------------------
    # GSTR-1 & CA ACCOUNTING CSV EXPORT
    # -------------------------------------------------------------
    def export_invoices_csv(
        self,
        db: Session,
        photographer_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> str:
        """Export Client Invoices in GSTR-1 compliant CSV format for CA / Accounting."""
        query = db.query(ClientInvoice).filter(
            ClientInvoice.photographer_id == photographer_id,
            ClientInvoice.status != "DRAFT"
        )
        if start_date:
            query = query.filter(ClientInvoice.invoice_date >= start_date)
        if end_date:
            query = query.filter(ClientInvoice.invoice_date <= end_date)

        invoices = query.order_by(ClientInvoice.invoice_date.asc()).all()

        output = io.StringIO()
        writer = csv.writer(output)

        # Header Row
        writer.writerow([
            "Invoice Number",
            "Invoice Date",
            "Document Type",
            "Client Name",
            "Client GSTIN",
            "Place of Supply",
            "Taxable Value (INR)",
            "GST Rate %",
            "CGST (INR)",
            "SGST (INR)",
            "IGST (INR)",
            "Total Tax (INR)",
            "Grand Total (INR)",
            "Amount Paid (INR)",
            "Balance Due (INR)",
            "Status",
        ])

        for inv in invoices:
            writer.writerow([
                inv.invoice_number,
                inv.invoice_date.strftime("%d/%m/%Y"),
                inv.document_type,
                inv.client_name,
                inv.client_gstin or "URP",
                inv.client_state or inv.client_city or "Gujarat",
                f"{inv.taxable_amount_inr:.2f}",
                f"{inv.gst_rate_pct:.1f}",
                f"{inv.cgst_amount_inr:.2f}",
                f"{inv.sgst_amount_inr:.2f}",
                f"{inv.igst_amount_inr:.2f}",
                f"{inv.total_tax_inr:.2f}",
                f"{inv.grand_total_inr:.2f}",
                f"{inv.amount_paid_inr:.2f}",
                f"{inv.balance_due_inr:.2f}",
                inv.status,
            ])

        return output.getvalue()


client_invoice_service = ClientInvoiceService()
