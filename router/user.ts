import express from 'express';
import type { JsonDB } from 'node-json-db';
import { auth } from '../middleware/auth.middleware';

const router = express.Router();

interface User {
  username: string;
  password?: string;
  role: string;
}

export default function userRouter(db: JsonDB) {
  router.post('/login', async (req, res, next) => {
    const { username, password } = req.body;
    const user = await db.find<User>(`/user`, value => value.username === username);
    console.log('user', user)
    if (user && user.password === password) {
      (req.session as any).user = user;
      res.json({
        msg: '登录成功',
        data: {
          username: user.username,
          role: user.role
        }
      });
    } else {
      next(new Error('用户名或密码错误'));
    }
  })

  router.post('/logout', auth(['admin', 'user']), (req, res) => {
    (req.session as any).user = null;
    res.json({
      msg: '退出登录成功',
      data: {}
    });
  })

  router.post('/list', auth(['admin']), async (req, res) => {
    const userList = await db.getData(`/user`);
    res.json({
      msg: '用户列表获取成功',
      data: userList
    });
  })

  router.post('/addUser', auth(['admin']), async (req, res, next) => {
    const { username, password, role } = req.body;
    try {
      const user = await db.find<User>(`/user`, value => value.username === username);
      if (user) {
        next(new Error('用户名已存在'));
      } else {
        await db.push(`/user[]`, { username, password, role });
        res.json({
          msg: '用户添加成功',
          data: { username, password, role }
        });
      }
    } catch (error) {
      next(new Error(error as string));
    }
  })

  router.post('/deleteUser', auth(['admin']), async (req, res) => {
    const { username } = req.body;
    const index = await db.getIndex(`/user`, username, 'username');
    await db.delete(`/user[${index}]`);
    res.json({
      msg: '用户删除成功',
      data: {}
    });
  })

  router.post('/checkLogin', (req, res) => {
    const { user } = req.session as any;
    if (user) {
      res.json({
        msg: '已登录',
        data: true
      });
    } else {
      res.json({
        msg: '未登录',
        data: false
      });
    }

  })
  return router
}