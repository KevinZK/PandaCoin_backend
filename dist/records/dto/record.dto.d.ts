export declare class CreateRecordDto {
    amount: number;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    category: string;
    accountId?: string;
    description?: string;
    rawText?: string;
    date?: string;
    isConfirmed?: boolean;
    confidence?: number;
}
export declare class UpdateRecordDto {
    amount?: number;
    type?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    category?: string;
    accountId?: string;
    description?: string;
    date?: string;
}
export declare class VoiceRecordDto {
    text: string;
}
export declare class BatchCreateRecordsDto {
    records: CreateRecordDto[];
}
