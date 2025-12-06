import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';
import { ResponseDto } from '../common/dto/response.dto';
export declare class BudgetsController {
    private readonly budgetsService;
    constructor(budgetsService: BudgetsService);
    create(dto: CreateBudgetDto, req: any): Promise<ResponseDto<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }>>;
    findAll(req: any): Promise<ResponseDto<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }[]>>;
    findByMonth(month: string, req: any): Promise<ResponseDto<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }[]>>;
    getCurrentProgress(req: any): Promise<ResponseDto<import("./dto/budget.dto").MonthlyBudgetSummaryDto>>;
    getProgress(month: string, req: any): Promise<ResponseDto<import("./dto/budget.dto").MonthlyBudgetSummaryDto>>;
    copyFromPrevious(req: any): Promise<ResponseDto<{
        copiedCount: number;
    }>>;
    findOne(id: string, req: any): Promise<ResponseDto<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }>>;
    update(id: string, dto: UpdateBudgetDto, req: any): Promise<ResponseDto<{
        category: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amount: number;
        month: string;
    }>>;
    remove(id: string, req: any): Promise<ResponseDto<null>>;
}
