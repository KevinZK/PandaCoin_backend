export declare const FINANCIAL_PARSING_SYSTEM_PROMPT = "You are an advanced, multilingual Financial Data Parser API.\nYour sole function is to analyze the user's free-form financial statement, determine the user's intent(s), and output a single, strict JSON object containing an array of financial events.\n\n[CRITICAL RULES]\n\n1. Output ONLY the JSON object. Do not include any preamble, explanations, or markdown fences.\n\n2. The output JSON MUST follow the \"Unified Schema\" defined below.\n\n3. The input may be in ANY language. All JSON KEYS and ENUM values (like \"event_type\", \"category\") MUST remain in English as defined.\n\n4. Use today's date in YYYY-MM-DD format for \"{CURRENT_DATE}\" if no date is specified. Infer the date if relative terms like \"yesterday\", \"last month\", or \"next Monday\" are used, using \"{CURRENT_DATE}\" as the reference point.\n\n5. If the user's statement contains no identifiable financial data or a non-actionable command (e.g., \"hello\" or \"what is the weather\"), you MUST return the special JSON: {\"events\": [{\"event_type\": \"NULL_STATEMENT\", \"data\": {\"error_message\": \"Non-financial or insufficient data.\"}}]}\n\n6. COMPOUND EVENTS: If the statement contains multiple distinct financial actions (e.g., \"I earned 100 and transferred 50\"), you MUST return multiple event objects within the \"events\" array.\n\n[UNIFIED SCHEMA]\n{\n  \"events\": [\n    {\n      \"event_type\": \"TRANSACTION\" | \"ASSET_UPDATE\" | \"GOAL\" | \"NULL_STATEMENT\",\n      \"data\": {\n        // Content depends on event_type\n      }\n    }\n  ]\n}\n\n[EVENT TYPE DEFINITIONS]\n\n1. TRANSACTION (Money flow: income, expense, transfer, payment)\n   data schema: { transaction_type, amount, currency, source_account, target_account, category, note, date, fee_amount, fee_currency, is_recurring, payment_schedule }\n   \n   transaction_type ENUMS: \"EXPENSE\", \"INCOME\", \"TRANSFER\", \"PAYMENT\"\n   \n   category ENUMS: \"FOOD\", \"TRANSPORT\", \"SHOPPING\", \"HOUSING\", \"ENTERTAINMENT\", \"INCOME_SALARY\", \"LOAN_REPAYMENT\", \"ASSET_SALE\", \"FEES_AND_TAXES\", \"SUBSCRIPTION\", \"OTHER\"\n   \n   NEW FIELDS:\n   - is_recurring (boolean): True if this is a weekly/monthly/yearly scheduled payment (e.g., rent, subscription). Default to False.\n   - payment_schedule (string, optional): \"WEEKLY\", \"MONTHLY\", \"YEARLY\" (if is_recurring is True).\n\n2. ASSET_UPDATE (Change in holdings, value, or account balances, including liabilities)\n   data schema: { asset_type, asset_name, institution_name, quantity, currency, total_value, date, is_initial_record, cost_basis, cost_basis_currency, interest_rate_apy, maturity_date }\n   \n   asset_type ENUMS: \"BANK_BALANCE\", \"STOCK\", \"CRYPTO\", \"PHYSICAL_ASSET\", \"LIABILITY\", \"FIXED_INCOME\"\n   \n   NEW FIELDS:\n   - institution_name (string, optional): The name of the bank, brokerage, or wallet.\n   - interest_rate_apy (number, optional): Annual Percentage Yield/Rate for the asset or liability.\n   - maturity_date (string, optional): YYYY-MM-DD for fixed-term assets/loans.\n\n3. GOAL (Financial plans, savings targets, or debt targets)\n   data schema: { goal_action, goal_name, target_amount, target_currency, target_date, priority, current_contribution }\n   \n   goal_action ENUMS: \"CREATE_SAVINGS\", \"CREATE_DEBT_REPAYMENT\", \"UPDATE_TARGET\"\n   \n   NEW FIELDS:\n   - priority (ENUM): \"HIGH\", \"MEDIUM\", \"LOW\".\n   - current_contribution (number, optional): The amount already saved or paid towards this goal.\n\n[EXAMPLES]\n\nInput: \"\u6628\u5929\u5348\u9910\u82B1\u4E8635\u5143\"\nOutput: {\"events\":[{\"event_type\":\"TRANSACTION\",\"data\":{\"transaction_type\":\"EXPENSE\",\"amount\":35,\"currency\":\"CNY\",\"category\":\"FOOD\",\"note\":\"\u5348\u9910\",\"date\":\"{YESTERDAY}\"}}]}\n\nInput: \"\u5DE5\u8D44\u53D1\u4E868000\"\nOutput: {\"events\":[{\"event_type\":\"TRANSACTION\",\"data\":{\"transaction_type\":\"INCOME\",\"amount\":8000,\"currency\":\"CNY\",\"category\":\"INCOME_SALARY\",\"date\":\"{CURRENT_DATE}\"}}]}\n\nInput: \"I spent $50 on groceries and earned $200 from freelance work\"\nOutput: {\"events\":[{\"event_type\":\"TRANSACTION\",\"data\":{\"transaction_type\":\"EXPENSE\",\"amount\":50,\"currency\":\"USD\",\"category\":\"FOOD\",\"note\":\"groceries\",\"date\":\"{CURRENT_DATE}\"}},{\"event_type\":\"TRANSACTION\",\"data\":{\"transaction_type\":\"INCOME\",\"amount\":200,\"currency\":\"USD\",\"category\":\"OTHER\",\"note\":\"freelance work\",\"date\":\"{CURRENT_DATE}\"}}]}";
export declare function getSystemPrompt(currentDate: string): string;
export declare const FINANCIAL_EVENTS_JSON_SCHEMA: {
    type: string;
    properties: {
        events: {
            type: string;
            items: {
                type: string;
                properties: {
                    event_type: {
                        type: string;
                        enum: string[];
                    };
                    data: {
                        type: string;
                        properties: {
                            transaction_type: {
                                type: string;
                                enum: string[];
                            };
                            amount: {
                                type: string;
                            };
                            currency: {
                                type: string;
                            };
                            source_account: {
                                type: string;
                            };
                            target_account: {
                                type: string;
                            };
                            category: {
                                type: string;
                                enum: string[];
                            };
                            note: {
                                type: string;
                            };
                            date: {
                                type: string;
                            };
                            fee_amount: {
                                type: string;
                            };
                            fee_currency: {
                                type: string;
                            };
                            is_recurring: {
                                type: string;
                            };
                            payment_schedule: {
                                type: string;
                                enum: string[];
                            };
                            asset_type: {
                                type: string;
                                enum: string[];
                            };
                            asset_name: {
                                type: string;
                            };
                            institution_name: {
                                type: string;
                            };
                            quantity: {
                                type: string;
                            };
                            total_value: {
                                type: string;
                            };
                            is_initial_record: {
                                type: string;
                            };
                            cost_basis: {
                                type: string;
                            };
                            cost_basis_currency: {
                                type: string;
                            };
                            interest_rate_apy: {
                                type: string;
                            };
                            maturity_date: {
                                type: string;
                            };
                            goal_action: {
                                type: string;
                                enum: string[];
                            };
                            goal_name: {
                                type: string;
                            };
                            target_amount: {
                                type: string;
                            };
                            target_currency: {
                                type: string;
                            };
                            target_date: {
                                type: string;
                            };
                            priority: {
                                type: string;
                                enum: string[];
                            };
                            current_contribution: {
                                type: string;
                            };
                            error_message: {
                                type: string;
                            };
                        };
                    };
                };
                required: string[];
            };
        };
    };
    required: string[];
};
