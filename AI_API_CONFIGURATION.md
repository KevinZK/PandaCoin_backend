# AI 大模型 API 配置指南

本项目支持三个大模型Provider进行财务语句智能解析，可以根据需要配置使用。

## 📋 支持的大模型

| Provider | 模型 | 特点 | 推荐场景 |
|---------|------|------|---------|
| **Gemini** | gemini-2.5-flash | 快速、便宜、支持JSON Schema | ✅ **推荐首选** |
| **OpenAI** | gpt-4o-mini | 稳定、通用、中等成本 | 备用方案 |
| **Qwen** | qwen-max | 中文优化、阿里云生态 | 国内用户 |

## 🔑 API密钥配置

### 1. Gemini API（推荐）

**获取方式：**
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 点击 "Get API Key"
3. 创建或选择项目
4. 复制API密钥

**环境变量配置：**
```bash
# .env 或 .env.local
GEMINI_API_KEY=your_gemini_api_key_here
```

**特性：**
- ✅ 原生支持JSON Schema，输出格式最稳定
- ✅ 速度快（gemini-2.5-flash）
- ✅ 免费额度较高
- ✅ 已禁用思考模式，响应更快

**官方文档：**
- [Gemini API 文档](https://ai.google.dev/gemini-api/docs/text-generation?hl=zh-cn)
- [定价信息](https://ai.google.dev/pricing)

---

### 2. OpenAI API

**获取方式：**
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账号
3. 导航到 API Keys 页面
4. 创建新的API密钥

**环境变量配置：**
```bash
OPENAI_API_KEY=sk-your_openai_api_key_here
```

**特性：**
- ✅ 使用 gpt-4o-mini（性价比高）
- ✅ 启用 JSON mode (`response_format: json_object`)
- ✅ 稳定可靠
- ⚠️ 需要绑定支付方式

**官方文档：**
- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [定价信息](https://openai.com/pricing)

---

### 3. Qwen API（通义千问）

**获取方式：**
1. 访问 [阿里云 DashScope](https://dashscope.console.aliyun.com/)
2. 开通灵积服务
3. 创建API-KEY

**环境变量配置：**
```bash
QWEN_API_KEY=sk-your_qwen_api_key_here
```

**特性：**
- ✅ 中文理解能力强
- ✅ 国内访问速度快
- ✅ 使用 qwen-max 模型
- ⚠️ 需要清洗输出格式

**API端点选择：**
- **国际版**（默认）: `dashscope-intl.aliyuncs.com`
- **国内版**: `dashscope.aliyuncs.com`

如需切换到国内版，修改 `qwen.provider.ts` 第22行。

**官方文档：**
- [DashScope API 文档](https://help.aliyun.com/zh/model-studio/developer-reference/api-details)
- [Qwen 模型介绍](https://help.aliyun.com/zh/model-studio/getting-started/models)

## 🚀 快速开始

### 完整配置示例

```bash
# backend/.env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXX
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXX
QWEN_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXX
```

### 最小化配置（仅Gemini）

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_key_here
# 其他两个可以留空，系统会使用Gemini作为主Provider
```

## 🧪 测试API配置

### 方法1：查看启动日志

启动后端后，检查日志输出：

```bash
npm run start:dev
```

**正确配置：**
```
[FinancialParsingService] ✅ Registered providers: Gemini, OpenAI, Qwen
```

**缺少配置：**
```
[GeminiProvider] WARN GEMINI_API_KEY not configured
[OpenAIProvider] WARN OPENAI_API_KEY not configured
[QwenProvider] WARN QWEN_API_KEY not configured
```

### 方法2：测试API调用

使用curl测试解析端点：

```bash
curl -X POST http://localhost:3000/api/records/voice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "今天午饭花了35块钱"
  }'
```

成功响应示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "events": [
      {
        "type": "EXPENSE",
        "amount": 35,
        "category": "餐饮",
        "description": "午饭",
        "date": "2024-12-06T12:00:00.000Z"
      }
    ],
    "metadata": {
      "provider": "Gemini",
      "model": "gemini-2.5-flash"
    }
  }
}
```

## 🔧 Provider路由策略

系统会根据场景自动选择最佳Provider：

| 场景 | 主Provider | 备用Providers |
|-----|-----------|--------------|
| **财务解析** | Gemini | OpenAI → Qwen |
| **语音输入** | Qwen | Gemini → OpenAI |
| **分类建议** | OpenAI | Gemini → Qwen |

配置文件：`src/financial/providers/ai-service.router.ts`

## 📊 性能对比

基于实际测试（解析"今天午饭35块，打车25元"）：

| Provider | 响应时间 | Token消耗 | 准确率 | 成本 |
|---------|---------|----------|-------|------|
| **Gemini 2.5 Flash** | ~800ms | ~120 tokens | 98% | 💰 最低 |
| **GPT-4o-mini** | ~1200ms | ~150 tokens | 97% | 💰💰 中等 |
| **Qwen Max** | ~1000ms | ~130 tokens | 95% | 💰 较低 |

## ⚠️ 常见问题

### 1. 401 Unauthorized 错误

**原因：** API密钥无效或未配置

**解决：**
```bash
# 检查环境变量是否正确设置
echo $GEMINI_API_KEY
echo $OPENAI_API_KEY
echo $QWEN_API_KEY

# 重启后端服务使环境变量生效
npm run start:dev
```

### 2. 请求超时

**原因：** 网络问题或模型响应慢

**解决：**
- 检查网络连接
- 增加超时时间（在provider文件中修改 `timeout` 值）
- 切换到更快的模型（如 qwen-turbo）

### 3. JSON解析失败

**原因：** 模型输出格式不符合预期

**解决：**
- **Gemini**: 检查 `responseSchema` 配置
- **OpenAI**: 确保启用了 `response_format: { type: 'json_object' }`
- **Qwen**: 检查 `extractJson()` 清洗逻辑

### 4. Qwen国内访问慢

**解决：** 切换到国内endpoint

```typescript
// qwen.provider.ts
private readonly endpoint =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
```

## 🔐 安全建议

1. **不要提交API密钥到Git**
   ```bash
   # .gitignore 应包含
   .env
   .env.local
   .env.production
   ```

2. **使用环境变量管理**
   ```bash
   # 生产环境使用秘密管理服务
   # 如 AWS Secrets Manager、阿里云KMS等
   ```

3. **限制API密钥权限**
   - 只授予必要的权限
   - 定期轮换密钥
   - 监控使用量

4. **设置费用告警**
   - Gemini: [在Google Cloud中设置](https://console.cloud.google.com/billing)
   - OpenAI: [在Usage页面设置](https://platform.openai.com/usage)
   - Qwen: [在阿里云控制台设置](https://dashscope.console.aliyun.com/)

## 📝 更新日志

### 2024-12-06
- ✅ 更新Gemini为稳定版 `gemini-2.5-flash`
- ✅ 添加思考配置（`thinkingConfig`）以优化响应速度
- ✅ 优化Qwen国内外endpoint选择
- ✅ 增加超时时间至10秒
- ✅ 完善API文档和注释

### 旧版本
- 使用 `gemini-2.5-pro-exp-03-25` (实验性模型)
- 超时8秒

## 🔗 相关链接

- [项目README](/README.md)
- [后端API文档](/docs/api.md)
- [Provider实现](/src/financial/providers/)
- [系统Prompt配置](/src/financial/providers/system-prompt.ts)

---

**需要帮助？** 查看 [Issues](https://github.com/yourusername/pandacoin/issues) 或联系项目维护者。

