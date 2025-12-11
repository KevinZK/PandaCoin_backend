"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseFinancialRequestDto = exports.FinancialEventsResponseDto = exports.FinancialEventDto = exports.NullStatementData = exports.CreditCardUpdateData = exports.BudgetData = exports.AssetUpdateData = exports.TransactionData = exports.PaymentSchedule = exports.Priority = exports.BudgetAction = exports.AssetType = exports.Category = exports.TransactionType = exports.EventType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var EventType;
(function (EventType) {
    EventType["TRANSACTION"] = "TRANSACTION";
    EventType["ASSET_UPDATE"] = "ASSET_UPDATE";
    EventType["CREDIT_CARD_UPDATE"] = "CREDIT_CARD_UPDATE";
    EventType["BUDGET"] = "BUDGET";
    EventType["NULL_STATEMENT"] = "NULL_STATEMENT";
})(EventType || (exports.EventType = EventType = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["EXPENSE"] = "EXPENSE";
    TransactionType["INCOME"] = "INCOME";
    TransactionType["TRANSFER"] = "TRANSFER";
    TransactionType["PAYMENT"] = "PAYMENT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var Category;
(function (Category) {
    Category["FOOD"] = "FOOD";
    Category["TRANSPORT"] = "TRANSPORT";
    Category["SHOPPING"] = "SHOPPING";
    Category["HOUSING"] = "HOUSING";
    Category["ENTERTAINMENT"] = "ENTERTAINMENT";
    Category["INCOME_SALARY"] = "INCOME_SALARY";
    Category["LOAN_REPAYMENT"] = "LOAN_REPAYMENT";
    Category["ASSET_SALE"] = "ASSET_SALE";
    Category["FEES_AND_TAXES"] = "FEES_AND_TAXES";
    Category["SUBSCRIPTION"] = "SUBSCRIPTION";
    Category["OTHER"] = "OTHER";
})(Category || (exports.Category = Category = {}));
var AssetType;
(function (AssetType) {
    AssetType["BANK"] = "BANK";
    AssetType["INVESTMENT"] = "INVESTMENT";
    AssetType["CASH"] = "CASH";
    AssetType["CREDIT_CARD"] = "CREDIT_CARD";
    AssetType["DIGITAL_WALLET"] = "DIGITAL_WALLET";
    AssetType["LOAN"] = "LOAN";
    AssetType["MORTGAGE"] = "MORTGAGE";
    AssetType["SAVINGS"] = "SAVINGS";
    AssetType["RETIREMENT"] = "RETIREMENT";
    AssetType["CRYPTO"] = "CRYPTO";
    AssetType["PROPERTY"] = "PROPERTY";
    AssetType["VEHICLE"] = "VEHICLE";
    AssetType["OTHER_ASSET"] = "OTHER_ASSET";
    AssetType["OTHER_LIABILITY"] = "OTHER_LIABILITY";
})(AssetType || (exports.AssetType = AssetType = {}));
var BudgetAction;
(function (BudgetAction) {
    BudgetAction["CREATE_BUDGET"] = "CREATE_BUDGET";
    BudgetAction["UPDATE_BUDGET"] = "UPDATE_BUDGET";
})(BudgetAction || (exports.BudgetAction = BudgetAction = {}));
var Priority;
(function (Priority) {
    Priority["HIGH"] = "HIGH";
    Priority["MEDIUM"] = "MEDIUM";
    Priority["LOW"] = "LOW";
})(Priority || (exports.Priority = Priority = {}));
var PaymentSchedule;
(function (PaymentSchedule) {
    PaymentSchedule["WEEKLY"] = "WEEKLY";
    PaymentSchedule["MONTHLY"] = "MONTHLY";
    PaymentSchedule["YEARLY"] = "YEARLY";
})(PaymentSchedule || (exports.PaymentSchedule = PaymentSchedule = {}));
class TransactionData {
    transaction_type;
    amount;
    currency;
    source_account;
    target_account;
    category;
    note;
    date;
    fee_amount;
    fee_currency;
    is_recurring;
    payment_schedule;
    card_identifier;
}
exports.TransactionData = TransactionData;
__decorate([
    (0, class_validator_1.IsEnum)(TransactionType),
    __metadata("design:type", String)
], TransactionData.prototype, "transaction_type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TransactionData.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "source_account", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "target_account", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(Category),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], TransactionData.prototype, "fee_amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "fee_currency", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], TransactionData.prototype, "is_recurring", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PaymentSchedule),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "payment_schedule", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TransactionData.prototype, "card_identifier", void 0);
class AssetUpdateData {
    asset_type;
    name;
    amount;
    institution_name;
    quantity;
    currency;
    date;
    is_initial_record;
    cost_basis;
    cost_basis_currency;
    interest_rate_apy;
    maturity_date;
    projected_value;
    location;
    repayment_amount;
    repayment_schedule;
    card_identifier;
}
exports.AssetUpdateData = AssetUpdateData;
__decorate([
    (0, class_validator_1.IsEnum)(AssetType),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "asset_type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AssetUpdateData.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "institution_name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AssetUpdateData.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AssetUpdateData.prototype, "is_initial_record", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AssetUpdateData.prototype, "cost_basis", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "cost_basis_currency", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AssetUpdateData.prototype, "interest_rate_apy", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "maturity_date", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AssetUpdateData.prototype, "projected_value", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AssetUpdateData.prototype, "repayment_amount", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PaymentSchedule),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "repayment_schedule", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AssetUpdateData.prototype, "card_identifier", void 0);
class BudgetData {
    budget_action;
    name;
    amount;
    currency;
    date;
    priority;
}
exports.BudgetData = BudgetData;
__decorate([
    (0, class_validator_1.IsEnum)(BudgetAction),
    __metadata("design:type", String)
], BudgetData.prototype, "budget_action", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BudgetData.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], BudgetData.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BudgetData.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BudgetData.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(Priority),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BudgetData.prototype, "priority", void 0);
class CreditCardUpdateData {
    name;
    amount;
    currency;
    date;
    institution_name;
    credit_limit;
    repayment_due_date;
    card_identifier;
}
exports.CreditCardUpdateData = CreditCardUpdateData;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardUpdateData.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreditCardUpdateData.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardUpdateData.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardUpdateData.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardUpdateData.prototype, "institution_name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreditCardUpdateData.prototype, "credit_limit", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardUpdateData.prototype, "repayment_due_date", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardUpdateData.prototype, "card_identifier", void 0);
class NullStatementData {
    error_message;
}
exports.NullStatementData = NullStatementData;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NullStatementData.prototype, "error_message", void 0);
class FinancialEventDto {
    event_type;
    data;
}
exports.FinancialEventDto = FinancialEventDto;
__decorate([
    (0, class_validator_1.IsEnum)(EventType),
    __metadata("design:type", String)
], FinancialEventDto.prototype, "event_type", void 0);
class FinancialEventsResponseDto {
    events;
}
exports.FinancialEventsResponseDto = FinancialEventsResponseDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => FinancialEventDto),
    __metadata("design:type", Array)
], FinancialEventsResponseDto.prototype, "events", void 0);
class ParseFinancialRequestDto {
    text;
}
exports.ParseFinancialRequestDto = ParseFinancialRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ParseFinancialRequestDto.prototype, "text", void 0);
//# sourceMappingURL=financial-events.dto.js.map