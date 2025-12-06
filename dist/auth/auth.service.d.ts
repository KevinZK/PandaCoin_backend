import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
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
    }>;
    login(dto: LoginDto): Promise<{
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
    }>;
    validateUser(userId: string): Promise<{
        email: string;
        name: string | null;
        id: string;
        avatar: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    private generateTokens;
}
