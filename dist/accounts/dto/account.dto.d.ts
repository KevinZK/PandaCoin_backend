export declare class CreateAccountDto {
    name: string;
    type: 'BANK' | 'INVESTMENT' | 'CASH' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'RETIREMENT' | 'CRYPTO' | 'PROPERTY' | 'VEHICLE' | 'OTHER_ASSET' | 'OTHER_LIABILITY';
    balance: number;
    currency?: string;
}
export declare class UpdateAccountDto {
    name?: string;
    balance?: number;
}
