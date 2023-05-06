import { Request, Response, NextFunction } from 'express'

export enum ROLE {
  ADMIN = 'admin',
  USER = 'user'
}

export function auth(role: Array<string>) {
  return function (req: Request, res: Response, next: NextFunction) {
    const { user } = req.session as any;
    if (user == undefined) {
      return next(new Error('请先登录'));
    }
    if (role.includes(user.role)) {
      next();
    } else {
      res.json({
        code: 'INTERNAL_SERVER_ERROR',
        message: '权限不足',
      });
    }
  }
}