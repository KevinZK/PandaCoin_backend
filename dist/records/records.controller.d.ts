import { RecordsService } from './records.service';
import { CreateRecordDto, UpdateRecordDto, VoiceRecordDto } from './dto/record.dto';
export declare class RecordsController {
    private readonly recordsService;
    constructor(recordsService: RecordsService);
    create(user: any, dto: CreateRecordDto): Promise<{
        category: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        userId: string;
        amount: number;
        accountId: string;
        description: string | null;
        rawText: string | null;
        date: Date;
        isConfirmed: boolean;
        confidence: number | null;
        aiRawResponse: string | null;
    }>;
    createFromVoice(user: any, dto: VoiceRecordDto): Promise<{
        records: {
            category: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string;
            userId: string;
            amount: number;
            accountId: string;
            description: string | null;
            rawText: string | null;
            date: Date;
            isConfirmed: boolean;
            confidence: number | null;
            aiRawResponse: string | null;
        }[];
        originalText: string;
    }>;
    findAll(user: any, type?: string, category?: string, accountId?: string, startDate?: string, endDate?: string): Promise<({
        account: {
            name: string;
            id: string;
            type: string;
        };
    } & {
        category: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        userId: string;
        amount: number;
        accountId: string;
        description: string | null;
        rawText: string | null;
        date: Date;
        isConfirmed: boolean;
        confidence: number | null;
        aiRawResponse: string | null;
    })[]>;
    getStatistics(user: any, period?: 'month' | 'year'): Promise<{
        period: "year" | "month";
        startDate: Date;
        endDate: Date;
        totalIncome: number;
        totalExpense: number;
        balance: number;
        categoryStats: Record<string, number>;
        recordCount: number;
    }>;
    findOne(user: any, id: string): Promise<{
        account: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string;
            balance: number;
            currency: string;
            userId: string;
        };
    } & {
        category: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        userId: string;
        amount: number;
        accountId: string;
        description: string | null;
        rawText: string | null;
        date: Date;
        isConfirmed: boolean;
        confidence: number | null;
        aiRawResponse: string | null;
    }>;
    update(user: any, id: string, dto: UpdateRecordDto): Promise<{
        category: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        userId: string;
        amount: number;
        accountId: string;
        description: string | null;
        rawText: string | null;
        date: Date;
        isConfirmed: boolean;
        confidence: number | null;
        aiRawResponse: string | null;
    }>;
    remove(user: any, id: string): Promise<{
        category: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        userId: string;
        amount: number;
        accountId: string;
        description: string | null;
        rawText: string | null;
        date: Date;
        isConfirmed: boolean;
        confidence: number | null;
        aiRawResponse: string | null;
    }>;
}
