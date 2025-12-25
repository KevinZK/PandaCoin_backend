import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // 如果指定了属性名（如 'id'），返回该属性
    // 否则返回整个用户对象
    return data ? user?.[data] : user;
  },
);
