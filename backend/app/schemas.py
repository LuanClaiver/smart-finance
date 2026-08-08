from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserPublic(ORMModel):
    id: int
    username: str
    display_name: str
    email: str
    role: str
    is_active: bool
    must_change_password: bool
    created_at: datetime


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    display_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    recovery_key: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    identifier: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=4, max_length=128)


class RecoverPasswordRequest(BaseModel):
    identifier: str
    recovery_key: str
    new_password: str = Field(min_length=4, max_length=128)


class ChangeRecoveryKeyRequest(BaseModel):
    current_password: str
    new_recovery_key: str = Field(min_length=6, max_length=128)


class AccountInput(BaseModel):
    name: str
    account_type: str = "digital"
    initial_balance: Decimal = Decimal("0")
    reported_balance: Decimal | None = None
    is_active: bool = True


class AccountReconcileInput(BaseModel):
    reported_balance: Decimal


class CategoryInput(BaseModel):
    name: str
    kind: str = "expense"
    is_active: bool = True


class CardInput(BaseModel):
    name: str
    bank: str = ""
    brand: str = ""
    credit_limit: Decimal = Decimal("0")
    closing_day: int = Field(default=1, ge=1, le=31)
    due_day: int = Field(default=10, ge=1, le=31)
    payment_account_id: int | None = None
    color: str = "#22c55e"
    is_active: bool = True


class IncomeInput(BaseModel):
    description: str
    amount_expected: Decimal
    amount_received: Decimal = Decimal("0")
    expected_date: date
    received_date: date | None = None
    status: str = "pending"
    account_id: int | None = None
    category_id: int | None = None
    notes: str = ""
    external_id: str | None = None


class ExpenseInput(BaseModel):
    description: str
    amount: Decimal
    purchase_date: date
    due_date: date | None = None
    paid_date: date | None = None
    category_id: int | None = None
    expense_type: str = "variable"
    payment_method: str = "pix"
    merchant: str = ""
    notes: str = ""
    status: str = "pending"
    account_id: int | None = None
    card_id: int | None = None
    installments: int = Field(default=1, ge=1, le=360)
    list_month: str | None = None
    auto_card_due: bool = True
    external_id: str | None = None

    @field_validator("list_month")
    @classmethod
    def validate_list_month(cls, value: str | None):
        if value is None:
            return value
        if len(value) != 7 or value[4] != "-":
            raise ValueError("Use o formato AAAA-MM")
        year, month = value.split("-")
        if not year.isdigit() or not month.isdigit() or not 1 <= int(month) <= 12:
            raise ValueError("Mês de referência inválido")
        return value


class RecurringExpenseInput(BaseModel):
    description: str
    amount: Decimal
    due_day: int = Field(ge=1, le=31)
    category_id: int | None = None
    payment_method: str = "pix"
    merchant: str = ""
    account_id: int | None = None
    start_month: str
    end_month: str | None = None
    months_to_generate: int = Field(default=24, ge=1, le=120)
    active: bool = True

    @field_validator("start_month", "end_month")
    @classmethod
    def validate_month(cls, value: str | None):
        if value is None:
            return value
        if len(value) != 7 or value[4] != "-":
            raise ValueError("Use o formato AAAA-MM")
        return value


class RecurringIncomeInput(BaseModel):
    description: str
    amount: Decimal
    expected_day: int = Field(ge=1, le=31)
    category_id: int | None = None
    account_id: int | None = None
    notes: str = ""
    start_month: str
    end_month: str | None = None
    months_to_generate: int = Field(default=24, ge=1, le=120)
    active: bool = True

    @field_validator("start_month", "end_month")
    @classmethod
    def validate_month(cls, value: str | None):
        if value is None:
            return value
        if len(value) != 7 or value[4] != "-":
            raise ValueError("Use o formato AAAA-MM")
        return value


class LoanInput(BaseModel):
    creditor: str
    principal_amount: Decimal
    total_amount: Decimal
    interest_rate: Decimal = Decimal("0")
    installment_count: int = Field(ge=1, le=600)
    installment_amount: Decimal
    first_due_date: date
    notes: str = ""


class LoanUpdateInput(LoanInput):
    """Dados editáveis do empréstimo completo."""


class LoanInstallmentInput(BaseModel):
    due_date: date
    amount: Decimal
    status: str = "pending"
    paid_date: date | None = None
    account_id: int | None = None


class BudgetInput(BaseModel):
    month: str
    category_id: int
    limit_amount: Decimal = Field(gt=0)

    @field_validator("month")
    @classmethod
    def validate_month(cls, value: str):
        if len(value) != 7 or value[4] != "-":
            raise ValueError("Use o formato AAAA-MM")
        return value


class GoalInput(BaseModel):
    name: str
    target_amount: Decimal = Field(gt=0)
    current_amount: Decimal = Decimal("0")
    target_date: date | None = None
    status: str = "active"


class InternalTransferInput(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal = Field(gt=0)
    transfer_date: date
    notes: str = ""


class ImportRuleInput(BaseModel):
    pattern: str = Field(min_length=2, max_length=160)
    kind: str = "expense"
    category_id: int | None = None
    payment_method: str = "pix"


class AdminUserUpdate(BaseModel):
    username: str | None = None
    display_name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=4, max_length=128)
