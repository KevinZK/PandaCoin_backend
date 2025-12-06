export declare enum TaskType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
    TRANSFER = "TRANSFER"
}
export declare enum TaskFrequency {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY"
}
export declare class CreateScheduledTaskDto {
    name: string;
    type: TaskType;
    amount: number;
    category: string;
    accountId: string;
    frequency: TaskFrequency;
    dayOfMonth?: number;
    dayOfWeek?: number;
    monthOfYear?: number;
    executeTime?: string;
    startDate: string;
    endDate?: string;
    isEnabled?: boolean;
    description?: string;
}
export declare class UpdateScheduledTaskDto {
    name?: string;
    type?: TaskType;
    amount?: number;
    category?: string;
    accountId?: string;
    frequency?: TaskFrequency;
    dayOfMonth?: number;
    dayOfWeek?: number;
    monthOfYear?: number;
    executeTime?: string;
    startDate?: string;
    endDate?: string;
    isEnabled?: boolean;
    description?: string;
}
export interface ScheduledTaskResponseDto {
    id: string;
    name: string;
    type: string;
    amount: number;
    category: string;
    accountId: string;
    frequency: string;
    dayOfMonth?: number;
    dayOfWeek?: number;
    monthOfYear?: number;
    executeTime: string;
    startDate: string;
    endDate?: string;
    isEnabled: boolean;
    lastRunAt?: string;
    nextRunAt?: string;
    runCount: number;
    description?: string;
    createdAt: string;
}
