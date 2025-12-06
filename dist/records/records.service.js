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
exports.RecordsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let RecordsService = class RecordsService {
    prisma;
    aiService;
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    async create(userId, dto) {
        const account = await this.prisma.account.findFirst({
            where: { id: dto.accountId, userId },
        });
        if (!account) {
            throw new common_1.NotFoundException('账户不存在');
        }
        const record = await this.prisma.record.create({
            data: {
                amount: dto.amount,
                type: dto.type,
                category: dto.category,
                description: dto.description,
                rawText: dto.rawText,
                date: dto.date ? new Date(dto.date) : new Date(),
                isConfirmed: dto.isConfirmed ?? true,
                confidence: dto.confidence,
                accountId: dto.accountId,
                userId,
            },
        });
        await this.updateAccountBalance(account.id, dto.type, dto.amount);
        return record;
    }
    async createFromVoice(userId, dto) {
        const accounts = await this.prisma.account.findMany({
            where: { userId },
            select: { name: true },
        });
        const accountNames = accounts.map(a => a.name);
        const { records: parsedRecords } = await this.aiService.parseVoiceToRecords(dto.text, accountNames);
        const createdRecords = [];
        for (const parsed of parsedRecords) {
            const account = await this.prisma.account.findFirst({
                where: {
                    userId,
                    name: parsed.accountName,
                },
            });
            if (!account) {
                continue;
            }
            const record = await this.create(userId, {
                amount: parsed.amount,
                type: parsed.type,
                category: parsed.category,
                description: parsed.description,
                rawText: dto.text,
                date: parsed.date,
                isConfirmed: false,
                confidence: parsed.confidence,
                accountId: account.id,
            });
            createdRecords.push(record);
        }
        return {
            records: createdRecords,
            originalText: dto.text,
        };
    }
    async findAll(userId, filters) {
        const where = { userId };
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.category) {
            where.category = filters.category;
        }
        if (filters?.accountId) {
            where.accountId = filters.accountId;
        }
        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
        }
        return this.prisma.record.findMany({
            where,
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
    }
    async findOne(id, userId) {
        const record = await this.prisma.record.findFirst({
            where: { id, userId },
            include: { account: true },
        });
        if (!record) {
            throw new common_1.NotFoundException('记录不存在');
        }
        return record;
    }
    async update(id, userId, dto) {
        const record = await this.findOne(id, userId);
        if (dto.amount !== undefined || dto.type !== undefined) {
            await this.updateAccountBalance(record.accountId, record.type, -Number(record.amount));
            await this.updateAccountBalance(dto.accountId || record.accountId, dto.type || record.type, dto.amount || Number(record.amount));
        }
        return this.prisma.record.update({
            where: { id },
            data: {
                amount: dto.amount,
                type: dto.type,
                category: dto.category,
                description: dto.description,
                date: dto.date ? new Date(dto.date) : undefined,
                accountId: dto.accountId,
            },
        });
    }
    async remove(id, userId) {
        const record = await this.findOne(id, userId);
        await this.updateAccountBalance(record.accountId, record.type, -Number(record.amount));
        return this.prisma.record.delete({
            where: { id },
        });
    }
    async updateAccountBalance(accountId, type, amount) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
        });
        if (!account)
            return;
        let balanceChange = 0;
        if (type === 'INCOME') {
            balanceChange = amount;
        }
        else if (type === 'EXPENSE') {
            balanceChange = -amount;
        }
        await this.prisma.account.update({
            where: { id: accountId },
            data: {
                balance: Number(account.balance) + balanceChange,
            },
        });
    }
    async getStatistics(userId, period = 'month') {
        const now = new Date();
        const startDate = new Date();
        if (period === 'month') {
            startDate.setMonth(now.getMonth());
            startDate.setDate(1);
        }
        else {
            startDate.setFullYear(now.getFullYear());
            startDate.setMonth(0);
            startDate.setDate(1);
        }
        startDate.setHours(0, 0, 0, 0);
        const records = await this.prisma.record.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                },
            },
        });
        const totalIncome = records
            .filter(r => r.type === 'INCOME')
            .reduce((sum, r) => sum + Number(r.amount), 0);
        const totalExpense = records
            .filter(r => r.type === 'EXPENSE')
            .reduce((sum, r) => sum + Number(r.amount), 0);
        const categoryStats = {};
        records
            .filter(r => r.type === 'EXPENSE')
            .forEach(r => {
            categoryStats[r.category] = (categoryStats[r.category] || 0) + Number(r.amount);
        });
        return {
            period,
            startDate,
            endDate: now,
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            categoryStats,
            recordCount: records.length,
        };
    }
};
exports.RecordsService = RecordsService;
exports.RecordsService = RecordsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], RecordsService);
//# sourceMappingURL=records.service.js.map