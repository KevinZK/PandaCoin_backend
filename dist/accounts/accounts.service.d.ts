import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
export declare class AccountsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateAccountDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>;
    findAll(userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }[]>;
    findOne(id: string, userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>;
    update(id: string, userId: string, dto: UpdateAccountDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>;
    remove(id: string, userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>;
    getTotalAssets(userId: string): Promise<{
        total: number;
        accounts: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string;
            balance: number;
            currency: string;
            userId: string;
        }[];
    }>;
}
