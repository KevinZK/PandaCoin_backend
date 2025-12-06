import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateBudgetDto, UpdateBudgetDto, MonthlyBudgetSummaryDto } from './dto/budget.dto';
export declare class BudgetsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService, logger: LoggerService);
    create(userId: string, dto: CreateBudgetDto): Promise<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }>;
    findByMonth(userId: string, month: string): Promise<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }[]>;
    findAll(userId: string): Promise<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }[]>;
    findOne(userId: string, id: string): Promise<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }>;
    update(userId: string, id: string, dto: UpdateBudgetDto): Promise<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }>;
    remove(userId: string, id: string): Promise<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }>;
    getMonthlyProgress(userId: string, month: string): Promise<MonthlyBudgetSummaryDto>;
    getCurrentMonthProgress(userId: string): Promise<MonthlyBudgetSummaryDto>;
    copyFromPreviousMonth(userId: string): Promise<number>;
}
