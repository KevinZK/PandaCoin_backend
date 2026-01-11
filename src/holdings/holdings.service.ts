import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHoldingDto,
  UpdateHoldingDto,
  CreateHoldingTransactionDto,
  BuyNewHoldingDto,
  HoldingTransactionType,
} from './dto/holding.dto';
import { InvestmentPriceService } from '../investment-price/investment-price.service';
import { InvestmentCodeService } from '../investment-price/investment-code.service';

@Injectable()
export class HoldingsService {
  private readonly logger = new Logger(HoldingsService.name);

  constructor(
    private prisma: PrismaService,
    private priceService: InvestmentPriceService,
    private codeService: InvestmentCodeService,
  ) {}

  /**
   * 创建持仓（无初始交易）
   */
  async create(userId: string, dto: CreateHoldingDto) {
    // 验证投资账户存在且属于用户
    const investment = await this.prisma.investment.findFirst({
      where: { id: dto.investmentId, userId, deletedAt: null },
    });

    if (!investment) {
      throw new NotFoundException('投资账户不存在');
    }

    return this.prisma.holding.create({
      data: {
        investmentId: dto.investmentId,
        userId,
        name: dto.name,
        displayName: dto.displayName,
        type: dto.type,
        market: dto.market || 'US',
        tickerCode: dto.tickerCode,
        codeVerified: dto.codeVerified || false,
        quantity: dto.quantity,
        avgCostPrice: dto.avgCostPrice,
        currentPrice: dto.currentPrice,
        currency: dto.currency || 'USD',
      },
    });
  }

  /**
   * 买入新资产（创建持仓 + 首次买入交易 + 扣减账户余额）
   */
  async buyNewHolding(userId: string, dto: BuyNewHoldingDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 验证账户
      const investment = await tx.investment.findFirst({
        where: { id: dto.investmentId, userId },
      });

      if (!investment) {
        throw new NotFoundException('投资账户不存在');
      }

      if (!['INVESTMENT', 'CRYPTO'].includes(investment.type)) {
        throw new BadRequestException('只能在投资账户或加密货币账户下创建持仓');
      }

      const amount = dto.quantity * dto.price;
      const totalCost = amount + (dto.fee || 0);

      // 2. 检查账户余额
      if (investment.balance < totalCost) {
        throw new BadRequestException(
          `账户余额不足，当前余额: ${investment.balance}，需要: ${totalCost}`,
        );
      }

      // 3. 创建持仓
      const holding = await tx.holding.create({
        data: {
          investmentId: dto.investmentId,
          userId,
          name: dto.name,
          displayName: dto.displayName,
          type: dto.type,
          market: dto.market || 'US',
          tickerCode: dto.tickerCode,
          codeVerified: false,
          quantity: dto.quantity,
          avgCostPrice: dto.price,
          currentPrice: dto.price,
          currency: dto.currency || 'USD',
        },
      });

      // 4. 创建交易记录
      const transaction = await tx.holdingTransaction.create({
        data: {
          holdingId: holding.id,
          investmentId: dto.investmentId,
          userId,
          type: 'BUY',
          quantity: dto.quantity,
          price: dto.price,
          amount,
          fee: dto.fee,
          quantityAfter: dto.quantity,
          avgCostAfter: dto.price,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
          rawText: dto.rawText,
        },
      });

      // 5. 扣减投资账户余额
      await tx.investment.update({
        where: { id: dto.investmentId },
        data: { balance: { decrement: totalCost } },
      });

      return { holding, transaction };
    });

    // 6. 异步获取最新价格（不阻塞主流程）
    this.fetchAndUpdatePrice(result.holding.id, result.holding.name, dto.tickerCode, dto.market || 'US')
      .catch(err => this.logger.warn(`自动获取价格失败: ${err.message}`));

    return result;
  }

  /**
   * 异步获取并更新持仓价格
   * 在创建持仓后自动调用，不阻塞主流程
   */
  private async fetchAndUpdatePrice(
    holdingId: string,
    name: string,
    tickerCode?: string,
    market: string = 'US',
  ) {
    try {
      // 1. 如果没有 tickerCode，尝试通过名称搜索
      let finalTickerCode = tickerCode;
      let displayName: string | undefined;

      if (!finalTickerCode) {
        this.logger.log(`尝试搜索 "${name}" 的代码...`);
        const searchResults = await this.codeService.searchAssets(name, market);
        
        if (searchResults.length > 0) {
          const bestMatch = searchResults[0];
          finalTickerCode = bestMatch.tickerCode;
          displayName = bestMatch.name;
          this.logger.log(`找到匹配: ${name} -> ${finalTickerCode} (${displayName})`);
        } else {
          this.logger.warn(`未找到 "${name}" 的代码`);
          return;
        }
      }

      // 2. 更新 tickerCode 到数据库
      await this.prisma.holding.update({
        where: { id: holdingId },
        data: {
          tickerCode: finalTickerCode,
          displayName: displayName,
          codeVerified: true,
          codeSource: 'YFINANCE',
        },
      });

      // 3. 获取最新价格
      await this.priceService.updateHoldingPrice(holdingId);
      this.logger.log(`成功更新 "${name}" 的价格`);
    } catch (error) {
      this.logger.error(`获取价格失败 (${name}): ${error.message}`);
    }
  }

  /**
   * 获取用户所有持仓
   */
  async findAll(userId: string) {
    return this.prisma.holding.findMany({
      where: { userId, deletedAt: null },
      include: {
        investment: {
          select: { id: true, name: true, type: true, balance: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取指定账户下的持仓
   */
  async findByInvestment(userId: string, investmentId: string) {
    // 验证投资账户
    const investment = await this.prisma.investment.findFirst({
      where: { id: investmentId, userId, deletedAt: null },
    });

    if (!investment) {
      throw new NotFoundException('投资账户不存在');
    }

    const holdings = await this.prisma.holding.findMany({
      where: { investmentId, userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // 计算持仓总市值
    const totalMarketValue = holdings.reduce((sum, h) => {
      const price = h.currentPrice || h.avgCostPrice;
      return sum + h.quantity * price;
    }, 0);

    // 计算持仓总成本
    const totalCost = holdings.reduce((sum, h) => {
      return sum + h.quantity * h.avgCostPrice;
    }, 0);

    return {
      investment,
      holdings,
      summary: {
        cashBalance: investment.balance,
        holdingsMarketValue: totalMarketValue,
        holdingsCost: totalCost,
        totalValue: investment.balance + totalMarketValue,
        unrealizedPnL: totalMarketValue - totalCost,
        unrealizedPnLPercent:
          totalCost > 0
            ? ((totalMarketValue - totalCost) / totalCost) * 100
            : 0,
      },
    };
  }

  /**
   * 获取单个持仓详情
   */
  async findOne(id: string, userId: string) {
    const holding = await this.prisma.holding.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        investment: {
          select: { id: true, name: true, type: true },
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!holding) {
      throw new NotFoundException('持仓不存在');
    }

    // 计算持仓盈亏
    const currentPrice = holding.currentPrice || holding.avgCostPrice;
    const marketValue = holding.quantity * currentPrice;
    const cost = holding.quantity * holding.avgCostPrice;

    return {
      ...holding,
      marketValue,
      cost,
      unrealizedPnL: marketValue - cost,
      unrealizedPnLPercent: cost > 0 ? ((marketValue - cost) / cost) * 100 : 0,
    };
  }

  /**
   * 更新持仓信息
   */
  async update(id: string, userId: string, dto: UpdateHoldingDto) {
    // 获取当前持仓数据
    const currentHolding = await this.prisma.holding.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!currentHolding) {
      throw new NotFoundException('持仓不存在');
    }

    // 计算新的数量和成本价
    const newQuantity = dto.quantity !== undefined ? dto.quantity : currentHolding.quantity;
    const newAvgCostPrice = dto.avgCostPrice !== undefined ? dto.avgCostPrice : currentHolding.avgCostPrice;
    const newCurrentPrice = dto.currentPrice !== undefined ? dto.currentPrice : currentHolding.currentPrice;

    // 重新计算盈亏相关字段
    const currentPrice = newCurrentPrice || newAvgCostPrice;
    const currentValue = newQuantity * currentPrice;
    const costBasis = newQuantity * newAvgCostPrice;
    const profitLoss = currentValue - costBasis;
    const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

    return this.prisma.holding.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.tickerCode !== undefined && { tickerCode: dto.tickerCode }),
        ...(dto.codeVerified !== undefined && {
          codeVerified: dto.codeVerified,
        }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.avgCostPrice !== undefined && {
          avgCostPrice: dto.avgCostPrice,
        }),
        ...(dto.currentPrice !== undefined && {
          currentPrice: dto.currentPrice,
          lastPriceAt: new Date(),
        }),
        ...(dto.market && { market: dto.market }),
        // 更新计算字段
        currentValue,
        profitLoss,
        profitLossPercent,
      },
    });
  }

  /**
   * 删除持仓
   */
  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.holding.delete({
      where: { id },
    });
  }

  /**
   * 买入（增加持仓）
   */
  async buy(userId: string, dto: CreateHoldingTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // 获取持仓
      const holding = await tx.holding.findFirst({
        where: { id: dto.holdingId, userId, deletedAt: null },
      });

      if (!holding) {
        throw new NotFoundException('持仓不存在');
      }

      // 获取投资账户
      const investment = await tx.investment.findFirst({
        where: { id: holding.investmentId, deletedAt: null },
      });

      if (!investment) {
        throw new NotFoundException('投资账户不存在');
      }

      const amount = dto.quantity * dto.price;
      const totalCost = amount + (dto.fee || 0);

      // 检查账户余额
      if (investment.balance < totalCost) {
        throw new BadRequestException(
          `账户余额不足，当前余额: ${investment.balance}，需要: ${totalCost}`,
        );
      }

      // 计算新的平均成本
      const oldTotalCost = holding.quantity * holding.avgCostPrice;
      const newQuantity = holding.quantity + dto.quantity;
      const newAvgCost = (oldTotalCost + amount) / newQuantity;

      // 更新持仓
      const updatedHolding = await tx.holding.update({
        where: { id: dto.holdingId },
        data: {
          quantity: newQuantity,
          avgCostPrice: newAvgCost,
          currentPrice: dto.price,
          lastPriceAt: new Date(),
        },
      });

      // 创建交易记录
      const transaction = await tx.holdingTransaction.create({
        data: {
          holdingId: dto.holdingId,
          investmentId: holding.investmentId,
          userId,
          type: 'BUY',
          quantity: dto.quantity,
          price: dto.price,
          amount,
          fee: dto.fee,
          quantityAfter: newQuantity,
          avgCostAfter: newAvgCost,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
          rawText: dto.rawText,
        },
      });

      // 扣减投资账户余额
      await tx.investment.update({
        where: { id: holding.investmentId },
        data: { balance: { decrement: totalCost } },
      });

      return { holding: updatedHolding, transaction };
    });
  }

  /**
   * 卖出（减少持仓）
   */
  async sell(userId: string, dto: CreateHoldingTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // 获取持仓
      const holding = await tx.holding.findFirst({
        where: { id: dto.holdingId, userId, deletedAt: null },
      });

      if (!holding) {
        throw new NotFoundException('持仓不存在');
      }

      // 检查持仓数量
      if (holding.quantity < dto.quantity) {
        throw new BadRequestException(
          `持仓数量不足，当前持有: ${holding.quantity}，卖出: ${dto.quantity}`,
        );
      }

      const amount = dto.quantity * dto.price;
      const netAmount = amount - (dto.fee || 0);
      const newQuantity = holding.quantity - dto.quantity;

      // 更新持仓
      const updatedHolding = await tx.holding.update({
        where: { id: dto.holdingId },
        data: {
          quantity: newQuantity,
          currentPrice: dto.price,
          lastPriceAt: new Date(),
        },
      });

      // 创建交易记录
      const transaction = await tx.holdingTransaction.create({
        data: {
          holdingId: dto.holdingId,
          investmentId: holding.investmentId,
          userId,
          type: 'SELL',
          quantity: dto.quantity,
          price: dto.price,
          amount,
          fee: dto.fee,
          quantityAfter: newQuantity,
          avgCostAfter: holding.avgCostPrice, // 卖出不改变平均成本
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
          rawText: dto.rawText,
        },
      });

      // 增加投资账户余额
      await tx.investment.update({
        where: { id: holding.investmentId },
        data: { balance: { increment: netAmount } },
      });

      // 如果持仓数量为0，可选择删除持仓
      if (newQuantity === 0) {
        // 保留持仓记录，不删除，方便查看历史
      }

      return { holding: updatedHolding, transaction };
    });
  }

  /**
   * 获取持仓交易记录
   */
  async getTransactions(
    userId: string,
    holdingId?: string,
    accountId?: string,
  ) {
    const where: any = { userId };
    if (holdingId) where.holdingId = holdingId;
    if (accountId) where.accountId = accountId;

    return this.prisma.holdingTransaction.findMany({
      where,
      include: {
        holding: {
          select: { id: true, name: true, tickerCode: true, type: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }

  /**
   * 批量更新价格
   */
  async updatePrices(
    userId: string,
    prices: { holdingId: string; currentPrice: number }[],
  ) {
    const updates = prices.map((p) =>
      this.prisma.holding.updateMany({
        where: { id: p.holdingId, userId },
        data: {
          currentPrice: p.currentPrice,
          lastPriceAt: new Date(),
        },
      }),
    );

    await this.prisma.$transaction(updates);

    return { updated: prices.length };
  }

  /**
   * 获取用户持仓总市值
   */
  async getTotalHoldingsValue(userId: string) {
    const holdings = await this.prisma.holding.findMany({
      where: { userId, deletedAt: null },
    });

    let totalMarketValue = 0;
    let totalCost = 0;

    holdings.forEach((h) => {
      const price = h.currentPrice || h.avgCostPrice;
      totalMarketValue += h.quantity * price;
      totalCost += h.quantity * h.avgCostPrice;
    });

    return {
      totalMarketValue,
      totalCost,
      unrealizedPnL: totalMarketValue - totalCost,
      unrealizedPnLPercent:
        totalCost > 0 ? ((totalMarketValue - totalCost) / totalCost) * 100 : 0,
      holdingsCount: holdings.length,
    };
  }
}
