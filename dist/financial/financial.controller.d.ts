import { FinancialParsingService } from './financial-parsing.service';
import { ParseFinancialRequestDto, FinancialEventsResponseDto } from './dtos/financial-events.dto';
import { ResponseDto } from '../common/dto/response.dto';
export declare class FinancialController {
    private readonly financialParsingService;
    constructor(financialParsingService: FinancialParsingService);
    parseFinancial(body: ParseFinancialRequestDto, req: any): Promise<ResponseDto<FinancialEventsResponseDto>>;
    healthCheck(): Promise<ResponseDto<{
        status: string;
    }>>;
}
