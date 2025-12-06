import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { ResponseDto } from '../common/dto/response.dto';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    create(user: any, dto: CreateAccountDto): Promise<ResponseDto<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>>;
    findAll(user: any): Promise<ResponseDto<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }[]>>;
    getTotalAssets(user: any): Promise<ResponseDto<{
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
    }>>;
    findOne(user: any, id: string): Promise<ResponseDto<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>>;
    update(user: any, id: string, dto: UpdateAccountDto): Promise<ResponseDto<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>>;
    remove(user: any, id: string): Promise<ResponseDto<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        balance: number;
        currency: string;
        userId: string;
    }>>;
}
