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
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AccountsService = class AccountsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const account = await tx.account.create({
                data: {
                    name: dto.name,
                    type: dto.type,
                    balance: dto.balance,
                    currency: dto.currency || 'CNY',
                    userId,
                },
            });
            if (dto.balance !== 0) {
                const isLiability = ['CREDIT_CARD', 'LOAN', 'MORTGAGE', 'OTHER_LIABILITY'].includes(dto.type);
                const recordType = dto.balance > 0 ? 'INCOME' : 'EXPENSE';
                await tx.record.create({
                    data: {
                        amount: Math.abs(dto.balance),
                        type: isLiability && dto.balance < 0 ? 'EXPENSE' : recordType,
                        category: 'INITIAL_BALANCE',
                        description: `${dto.name} 期初余额`,
                        date: new Date(),
                        accountId: account.id,
                        userId,
                        isConfirmed: true,
                    },
                });
            }
            return account;
        });
    }
    async findAll(userId) {
        return this.prisma.account.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId) {
        const account = await this.prisma.account.findFirst({
            where: { id, userId },
        });
        if (!account) {
            throw new common_1.NotFoundException('资产不存在');
        }
        return account;
    }
    async update(id, userId, dto) {
        await this.findOne(id, userId);
        return this.prisma.account.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.balance !== undefined && { balance: dto.balance }),
            },
        });
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        return this.prisma.account.delete({
            where: { id },
        });
    }
    async getTotalAssets(userId) {
        const accounts = await this.prisma.account.findMany({
            where: { userId },
        });
        const total = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
        return { total, accounts };
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map