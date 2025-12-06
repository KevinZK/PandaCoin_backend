import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateRecordDto, UpdateRecordDto, VoiceRecordDto } from './dto/record.dto';
export declare class RecordsService {
    private prisma;
    private aiService;
    constructor(prisma: PrismaService, aiService: AiService);
    create(userId: string, dto: CreateRecordDto): Promise<{
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
    createFromVoice(userId: string, dto: VoiceRecordDto): Promise<{
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
    findAll(userId: string, filters?: {
        type?: string;
        category?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<({
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
    findOne(id: string, userId: string): Promise<{
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
    update(id: string, userId: string, dto: UpdateRecordDto): Promise<{
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
    remove(id: string, userId: string): Promise<{
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
    private updateAccountBalance;
    getStatistics(userId: string, period?: 'month' | 'year'): Promise<{
        period: "year" | "month";
        startDate: Date;
        endDate: Date;
        totalIncome: number;
        totalExpense: number;
        balance: number;
        categoryStats: Record<string, number>;
        recordCount: number;
    }>;
}
