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
exports.BudgetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
let BudgetsService = class BudgetsService {
    prisma;
    logger;
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }
    async create(userId, dto) {
        const existing = await this.prisma.budget.findFirst({
            where: {
                userId,
                month: dto.month,
                category: dto.category || null,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('该月份的预算已存在');
        }
        const budget = await this.prisma.budget.create({
            data: {
                month: dto.month,
                category: dto.category || null,
                amount: dto.amount,
                userId,
            },
        });
        this.logger.log(`Created budget: ${dto.month} ${dto.category || '总预算'} = ¥${dto.amount}`, 'BudgetsService');
        return budget;
    }
    async findByMonth(userId, month) {
        return this.prisma.budget.findMany({
            where: { userId, month },
            orderBy: { category: 'asc' },
        });
    }
    async findAll(userId) {
        return this.prisma.budget.findMany({
            where: { userId },
            orderBy: [{ month: 'desc' }, { category: 'asc' }],
        });
    }
    async findOne(userId, id) {
        const budget = await this.prisma.budget.findFirst({
            where: { id, userId },
        });
        if (!budget) {
            throw new common_1.NotFoundException('预算不存在');
        }
        return budget;
    }
    async update(userId, id, dto) {
        await this.findOne(userId, id);
        return this.prisma.budget.update({
            where: { id },
            data: { amount: dto.amount },
        });
    }
    async remove(userId, id) {
        await this.findOne(userId, id);
        return this.prisma.budget.delete({
            where: { id },
        });
    }
    async getMonthlyProgress(userId, month) {
        const budgets = await this.findByMonth(userId, month);
        const startDate = new Date(`${month}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        const records = await this.prisma.record.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
        });
        const spentByCategory = {};
        let totalSpent = 0;
        for (const record of records) {
            const cat = record.category;
            spentByCategory[cat] = (spentByCategory[cat] || 0) + Number(record.amount);
            totalSpent += Number(record.amount);
        }
        const categoryBudgets = [];
        let totalBudget = 0;
        for (const budget of budgets) {
            const isTotal = !budget.category;
            const spentAmount = isTotal
                ? totalSpent
                : spentByCategory[budget.category] || 0;
            const remainingAmount = budget.amount - spentAmount;
            const usagePercent = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
            categoryBudgets.push({
                id: budget.id,
                month: budget.month,
                category: budget.category,
                budgetAmount: budget.amount,
                spentAmount,
                remainingAmount,
                usagePercent: Math.round(usagePercent * 10) / 10,
                isOverBudget: spentAmount > budget.amount,
            });
            if (isTotal) {
                totalBudget = budget.amount;
            }
        }
        if (totalBudget === 0) {
            totalBudget = categoryBudgets
                .filter(b => b.category)
                .reduce((sum, b) => sum + b.budgetAmount, 0);
        }
        const totalRemaining = totalBudget - totalSpent;
        const overallUsagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        return {
            month,
            totalBudget,
            totalSpent,
            totalRemaining,
            overallUsagePercent: Math.round(overallUsagePercent * 10) / 10,
            categoryBudgets,
        };
    }
    async getCurrentMonthProgress(userId) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return this.getMonthlyProgress(userId, month);
    }
    async copyFromPreviousMonth(userId) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const previousMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        const previousBudgets = await this.findByMonth(userId, previousMonth);
        if (previousBudgets.length === 0) {
            return 0;
        }
        let copiedCount = 0;
        for (const budget of previousBudgets) {
            try {
                await this.create(userId, {
                    month: currentMonth,
                    category: budget.category || undefined,
                    amount: budget.amount,
                });
                copiedCount++;
            }
            catch (error) {
                if (!(error instanceof common_1.ConflictException)) {
                    throw error;
                }
            }
        }
        this.logger.log(`Copied ${copiedCount} budgets from ${previousMonth} to ${currentMonth}`, 'BudgetsService');
        return copiedCount;
    }
};
exports.BudgetsService = BudgetsService;
exports.BudgetsService = BudgetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], BudgetsService);
//# sourceMappingURL=budgets.service.js.map