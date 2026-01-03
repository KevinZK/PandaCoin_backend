#!/usr/bin/env python3
"""
yfinance Bridge Script
用于从 Node.js 调用 yfinance 获取股票/ETF/基金价格

Usage:
    python3 yfinance_bridge.py get_price --ticker AAPL
    python3 yfinance_bridge.py get_prices --tickers AAPL,GOOGL,MSFT
    python3 yfinance_bridge.py search --query Apple --market US
"""

import argparse
import json
import sys

try:
    import yfinance as yf
except ImportError:
    print(json.dumps({"error": "yfinance not installed. Run: pip install yfinance"}))
    sys.exit(1)


def get_price(ticker: str) -> dict:
    """获取单个股票的价格"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # 获取最新价格
        current_price = info.get('currentPrice') or info.get('regularMarketPrice')
        
        if not current_price:
            # 尝试从历史数据获取
            hist = stock.history(period="1d")
            if not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
        
        if not current_price:
            return {"error": f"No price data for {ticker}"}
        
        return {
            "ticker": ticker,
            "price": float(current_price),
            "previousClose": float(info.get('previousClose', 0) or 0),
            "open": float(info.get('open', 0) or 0),
            "high": float(info.get('dayHigh', 0) or 0),
            "low": float(info.get('dayLow', 0) or 0),
            "volume": int(info.get('volume', 0) or 0),
            "currency": info.get('currency', 'USD'),
            "name": info.get('longName') or info.get('shortName', ''),
        }
    except Exception as e:
        return {"error": str(e)}


def get_prices(tickers: str) -> dict:
    """批量获取股票价格"""
    ticker_list = [t.strip() for t in tickers.split(',') if t.strip()]
    prices = {}
    
    for ticker in ticker_list:
        prices[ticker] = get_price(ticker)
    
    return {"prices": prices}


def search_asset(query: str, market: str = "") -> dict:
    """搜索资产"""
    try:
        # yfinance 的搜索功能
        search = yf.Search(query, enable_fuzzy_query=True)
        
        results = []
        
        # 获取股票结果
        if hasattr(search, 'quotes') and search.quotes:
            for quote in search.quotes[:10]:
                # 根据市场过滤
                exchange = quote.get('exchange', '')
                if market:
                    if market == 'US' and not any(x in exchange for x in ['NAS', 'NYQ', 'NYSE', 'NASDAQ']):
                        continue
                    elif market == 'HK' and 'HK' not in exchange:
                        continue
                    elif market == 'CN' and not any(x in exchange for x in ['SS', 'SZ', 'SHE', 'SHA']):
                        continue
                
                results.append({
                    "symbol": quote.get('symbol', ''),
                    "name": quote.get('longname') or quote.get('shortname', ''),
                    "quoteType": quote.get('quoteType', ''),
                    "exchange": exchange,
                    "score": quote.get('score', 1.0),
                })
        
        return {"results": results}
    except Exception as e:
        return {"error": str(e), "results": []}


def main():
    parser = argparse.ArgumentParser(description='yfinance Bridge Script')
    parser.add_argument('action', choices=['get_price', 'get_prices', 'search'])
    parser.add_argument('--ticker', help='Single ticker symbol')
    parser.add_argument('--tickers', help='Comma-separated ticker symbols')
    parser.add_argument('--query', help='Search query')
    parser.add_argument('--market', default='', help='Market filter: US, HK, CN')
    
    args = parser.parse_args()
    
    if args.action == 'get_price':
        if not args.ticker:
            print(json.dumps({"error": "Missing --ticker argument"}))
            sys.exit(1)
        result = get_price(args.ticker)
    
    elif args.action == 'get_prices':
        if not args.tickers:
            print(json.dumps({"error": "Missing --tickers argument"}))
            sys.exit(1)
        result = get_prices(args.tickers)
    
    elif args.action == 'search':
        if not args.query:
            print(json.dumps({"error": "Missing --query argument"}))
            sys.exit(1)
        result = search_asset(args.query, args.market)
    
    else:
        result = {"error": f"Unknown action: {args.action}"}
    
    print(json.dumps(result))


if __name__ == '__main__':
    main()

