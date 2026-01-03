import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvestmentPriceService } from './investment-price.service';
import { InvestmentCodeService } from './investment-code.service';

/**
 * 投资价格定时更新执行器
 */
@Injectable()
export class InvestmentPriceExecutor implements OnModuleInit {
  private readonly logger = new Logger(InvestmentPriceExecutor.name);
  private isUpdating = false;

  constructor(
    private priceService: InvestmentPriceService,
    private codeService: InvestmentCodeService,
  ) {}

  async onModuleInit() {
    this.logger.log('投资价格更新执行器已启动');
  }

  /**
   * 股票/ETF/基金价格更新
   * 工作日 18:00 (北京时间) - A股/港股收盘后
   * Cron: 秒 分 时 日 月 周
   */
  @Cron('0 0 18 * * 1-5', { timeZone: 'Asia/Shanghai' })
  async updateStockPrices() {
    if (this.isUpdating) {
      this.logger.warn('价格更新任务正在执行中，跳过本次');
      return;
    }

    this.isUpdating = true;
    this.logger.log('开始更新股票/ETF/基金价格...');

    try {
      // 更新 A 股
      await this.priceService.updateAllPrices('CN');
      
      // 更新港股
      await this.priceService.updateAllPrices('HK');
      
      // 更新美股 (美股收盘在北京时间次日 05:00，但这里先统一更新)
      await this.priceService.updateAllPrices('US');
      
      // 更新全球其他市场
      await this.priceService.updateAllPrices('GLOBAL');

      this.logger.log('股票价格更新完成');
    } catch (error) {
      this.logger.error('股票价格更新失败', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 美股专用更新 (美股收盘后)
   * 工作日 05:00 (北京时间) - 美股收盘后
   */
  @Cron('0 0 5 * * 2-6', { timeZone: 'Asia/Shanghai' })
  async updateUSStockPrices() {
    if (this.isUpdating) {
      this.logger.warn('价格更新任务正在执行中，跳过本次');
      return;
    }

    this.isUpdating = true;
    this.logger.log('开始更新美股价格...');

    try {
      await this.priceService.updateAllPrices('US');
      this.logger.log('美股价格更新完成');
    } catch (error) {
      this.logger.error('美股价格更新失败', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 数字货币价格更新
   * 每 6 小时执行一次 (24小时交易)
   */
  @Cron('0 0 */6 * * *')
  async updateCryptoPrices() {
    if (this.isUpdating) {
      this.logger.warn('价格更新任务正在执行中，跳过本次');
      return;
    }

    this.isUpdating = true;
    this.logger.log('开始更新数字货币价格...');

    try {
      await this.priceService.updateAllPrices('CRYPTO');
      this.logger.log('数字货币价格更新完成');
    } catch (error) {
      this.logger.error('数字货币价格更新失败', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 验证未验证的资产代码
   * 每天凌晨 3:00 执行
   */
  @Cron('0 0 3 * * *', { timeZone: 'Asia/Shanghai' })
  async verifyUnverifiedCodes() {
    this.logger.log('开始验证未验证的资产代码...');

    try {
      const result = await this.codeService.verifyUnverifiedHoldings();
      this.logger.log(
        `代码验证完成: ${result.verified}/${result.total} 成功`,
      );
    } catch (error) {
      this.logger.error('代码验证失败', error);
    }
  }

  /**
   * 手动触发价格更新 (用于测试或管理员操作)
   */
  async manualUpdate(market?: string): Promise<void> {
    this.logger.log(`手动触发价格更新: ${market || 'ALL'}`);

    if (market) {
      await this.priceService.updateAllPrices(market);
    } else {
      // 更新所有市场
      await this.priceService.updateAllPrices('CN');
      await this.priceService.updateAllPrices('HK');
      await this.priceService.updateAllPrices('US');
      await this.priceService.updateAllPrices('CRYPTO');
      await this.priceService.updateAllPrices('GLOBAL');
    }

    this.logger.log('手动价格更新完成');
  }
}

