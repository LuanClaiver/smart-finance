from __future__ import annotations

from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Category, Expense, User
from .finance import dashboard_summary


def money(value: float) -> str:
    text = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {text}"


def build_monthly_pdf(db: Session, owner_id: int, month: str) -> bytes:
    user = db.get(User, owner_id)
    summary = dashboard_summary(db, owner_id, month)
    categories = {item.id: item.name for item in db.scalars(select(Category).where(Category.owner_id == owner_id)).all()}
    expenses = db.scalars(select(Expense).where(Expense.owner_id == owner_id, func.coalesce(Expense.list_month, Expense.billing_month) == month)).all()
    by_category: dict[str, float] = {}
    fixed = variable = 0.0
    card_total = 0.0
    for item in expenses:
        name = categories.get(item.category_id, "Sem categoria")
        by_category[name] = by_category.get(name, 0.0) + float(item.amount)
        if item.expense_type == "fixed":
            fixed += float(item.amount)
        else:
            variable += float(item.amount)
        if item.card_id:
            card_total += float(item.amount)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5 * cm, leftMargin=1.5 * cm, topMargin=1.4 * cm, bottomMargin=1.4 * cm)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleGreen", parent=styles["Title"], textColor=colors.HexColor("#16a34a"), alignment=TA_CENTER, fontSize=22, leading=27)
    subtitle = ParagraphStyle("Subtitle", parent=styles["Normal"], alignment=TA_CENTER, textColor=colors.HexColor("#475569"), fontSize=10)
    heading = ParagraphStyle("Heading", parent=styles["Heading2"], textColor=colors.HexColor("#166534"), spaceBefore=10, spaceAfter=6)
    story = [
        Paragraph("Smart Finance", title),
        Paragraph(f"Relatório mensal • {month} • {user.display_name if user else 'Usuário'}", subtitle),
        Spacer(1, 12),
    ]

    cards = [
        ["Renda prevista", money(summary["income_expected"]), "Renda recebida", money(summary["income_received"])],
        ["Despesas previstas", money(summary["expense_expected"]), "Despesas pagas", money(summary["expense_paid"])],
        ["Saldo previsto", money(summary["balance_expected"]), "Saldo real", money(summary["balance_real"])],
    ]
    table = Table(cards, colWidths=[3.4 * cm, 3.2 * cm, 3.4 * cm, 3.2 * cm], rowHeights=1.1 * cm)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#14532d")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#86efac")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#bbf7d0")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(table)

    story.extend([Paragraph("Composição das despesas", heading)])
    composition = Table([
        ["Gastos fixos", money(fixed)],
        ["Gastos variáveis", money(variable)],
        ["Compras em cartões", money(card_total)],
        ["Lançamentos pendentes", str(summary["pending_expenses"])],
    ], colWidths=[9 * cm, 5 * cm])
    composition.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(composition)

    story.extend([Paragraph("Resumo por categoria", heading)])
    category_data = [["Categoria", "Total"]] + [[name, money(total)] for name, total in sorted(by_category.items(), key=lambda item: item[1], reverse=True)]
    if len(category_data) == 1:
        category_data.append(["Sem despesas no mês", money(0)])
    category_table = Table(category_data, colWidths=[9 * cm, 5 * cm], repeatRows=1)
    category_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#166534")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(category_table)
    story.extend([Spacer(1, 14), Paragraph("Relatório gerado localmente pelo Smart Finance.", subtitle)])
    doc.build(story)
    return buffer.getvalue()
