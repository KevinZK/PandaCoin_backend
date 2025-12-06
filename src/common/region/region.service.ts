import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';

/**
 * 欧盟国家列表 (ISO 3166-1 alpha-2)
 */
export const EU_COUNTRIES = [
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
];

/**
 * 区域类型
 */
export type RegionCode = 'CN' | 'HK' | 'MO' | 'TW' | 'US' | 'CA' | 'EU' | 'OTHER';

/**
 * 区域识别服务
 * 根据用户资料和请求头识别用户所在区域
 */
@Injectable()
export class RegionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 检测用户区域
   * 优先级：1. 用户资料 2. HTTP Header 3. 默认值
   * @param userId 用户ID
   * @param headers HTTP请求头
   */
  async detectUserRegion(
    userId: string,
    headers: Record<string, string>,
  ): Promise<RegionCode> {
    try {
      // 1. 尝试从用户资料获取
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { country: true },
      });

      if (user?.country) {
        const region = this.mapCountryToRegion(user.country);
        this.logger.debug(
          `Region from user profile: ${user.country} -> ${region}`,
          'RegionService',
        );
        return region;
      }

      // 2. 尝试从 HTTP Header 获取
      const headerRegion =
        headers['x-region'] || headers['X-Region'] || headers['X-REGION'];
      if (headerRegion) {
        const region = this.mapCountryToRegion(headerRegion.toUpperCase());
        this.logger.debug(
          `Region from header: ${headerRegion} -> ${region}`,
          'RegionService',
        );
        return region;
      }

      // 3. 默认返回 OTHER
      this.logger.debug('Region defaulted to OTHER', 'RegionService');
      return 'OTHER';
    } catch (error) {
      this.logger.warn(
        `Failed to detect region: ${error.message}`,
        'RegionService',
      );
      return 'OTHER';
    }
  }

  /**
   * 将国家代码映射到区域代码
   */
  private mapCountryToRegion(countryCode: string): RegionCode {
    const code = countryCode.toUpperCase();

    if (code === 'CN') return 'CN';
    if (code === 'HK') return 'HK';
    if (code === 'MO') return 'MO';
    if (code === 'TW') return 'TW';
    if (code === 'US') return 'US';
    if (code === 'CA') return 'CA';
    if (EU_COUNTRIES.includes(code)) return 'EU';

    return 'OTHER';
  }
}
