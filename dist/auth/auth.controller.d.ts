import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResponseDto } from '../common/dto/response.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<ResponseDto<{
        accessToken: string;
        tokenType: string;
        user: {
            email: string;
            name: string | null;
            id: string;
            avatar: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>>;
    login(dto: LoginDto): Promise<ResponseDto<{
        accessToken: string;
        tokenType: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            avatar: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>>;
    getProfile(user: any): Promise<ResponseDto<any>>;
}
