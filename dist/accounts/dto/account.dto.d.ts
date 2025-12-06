export declare class CreateAccountDto {
    name: string;
    type: 'BANK' | 'INVESTMENT' | 'CASH' | 'CREDIT_CARD';
    balance: number;
    currency?: string;
}
export declare class UpdateAccountDto {
    name?: string;
    balance?: number;
}
