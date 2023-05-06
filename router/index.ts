import express from 'express';
const router = express.Router();
import { constants, promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';
import { auth } from '../middleware/auth.middleware';

interface ItemDetail {
  name: string;
  path: string;
  type?: string | null;
  url?: string | null;
  modified_at?: Date;
  // children?: ItemDetail[];
  extname?: string | null;
  basename?: string | null;
  category?: string | null;
}

export default (rootFolder: string) => {

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const { dir } = req.body;
      let folderPath = path.join(rootFolder, dir as string);
      cb(null, path.join(rootFolder, dir as string));
    },
    filename: (req, file, cb) => {
      cb(null, Buffer.from(file.originalname, "latin1").toString("utf8"));
    },
  });

  const upload = multer({
    storage,
    fileFilter: async (req, file, cb) => {
      const { dir } = req.body;
      const filePath = path.join(rootFolder, dir as string, file.originalname);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      if (fileExists) {
        cb(new Error(`文件 ${file.originalname} 已存在`));
      } else {
        cb(null, true);
      }
    },
  });

  async function getItems(folderPath: string, dir: string): Promise<ItemDetail[]> {
    const items: string[] = await fs.readdir(folderPath);
    const itemDetails: ItemDetail[] = [];
    console.log('rootFolder', rootFolder)
    console.log('dir', dir)
    for (const item of items) {
      const itemPath: string = path.join(folderPath, item);
      const stats: any = await fs.stat(itemPath);
      const itemDetail: ItemDetail = {
        name: item,
        path: itemPath,
        url: null,
        modified_at: stats.mtime,
        category: null, // 添加用于存储项目类型的属性
        type: null,
        extname: null,
        basename: null,
      };

      if (stats.isDirectory()) {
        // const childItems: ItemDetail[] = await getItems(itemPath);

        itemDetail.type = "folder";
        itemDetail.category = "Folder";
        // itemDetail.children = childItems;
      } else if (stats.isFile()) {
        const extname: string = path.extname(item);
        const basename: string = path.basename(item, extname);

        itemDetail.type = "file";
        itemDetail.extname = extname;
        itemDetail.basename = basename;
        itemDetail.url = `${process.env.DOMAIN}${dir}/${item}`

        // 根据文件扩展名设置项目类型
        if (extname === ".pdf" || extname === ".doc" || extname === ".docx" || extname === '.xls' || extname === '.xlsx' || extname === '.ppt') {
          itemDetail.category = "Documents";
        } else if (extname === ".jpg" || extname === ".jpeg" || extname === ".png" || extname === ".gif") {
          itemDetail.category = "Images";
        } else if (extname === ".mp3" || extname === ".wav" || extname === ".ogg") {
          itemDetail.category = "Audio";
        } else if (extname === ".mp4" || extname === ".mkv" || extname === ".avi") {
          itemDetail.category = "Video";
        } else {
          itemDetail.category = "Other";
        }
      }

      itemDetails.push(itemDetail);
    }

    // 按项目类型进行排序
    const categoryOrder: string[] = ["Folder", "Documents", "Images", "Video", "Audio", "Other"];
    itemDetails.sort((a, b) => {
      return categoryOrder.indexOf(a.category as string) - categoryOrder.indexOf(b.category as string) || a.name.localeCompare(b.name)
    });

    return itemDetails;
  }

  router.post('/systemInfo', (req, res) => {
    res.json({
      data: {
        rootFolder,
        host: process.env.DOMAIN,
      },
      msg: '获取系统信息成功',
    });
  })

  router.post('/resources', auth(['admin', 'user']), async (req, res, next) => {
    const page = parseInt(req.body.page as string) || 1;
    const limit = parseInt(req.body.limit as string) || 10;
    const search = req.body.search?.toString().toLowerCase();
    const dir = req.body?.dir || '/';
    const folderPath = path.join(rootFolder, dir);
    try {
      let items = await getItems(folderPath, dir);

      if (search) {
        items = items.filter(item => {
          const name = item.name.toLowerCase();

          return name.includes(search);
        });
      }

      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedItems = items.slice(startIndex, endIndex);
      const response = {
        items: paginatedItems,
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
      };

      res.json({
        data: response,
        msg: '获取资源成功',
      });
    } catch (error) {
      next(new Error(error as string));
    }
  });

  router.post('/upload', auth(['admin', 'user']), upload.array('files', 10), (req, res) => {
    res.json({
      msg: '上传成功',
      data: {}
    });
  });

  router.post('/deleteFile', auth(['admin']), async (req, res, next) => {
    const files: string = req.body.files.split(',');
    let hasError = false;

    try {
      for (const file of files) {
        const r_file = file.split(rootFolder)[1]
        const filePath = path.join(rootFolder, r_file);
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
          hasError = true;
          continue;
        }

        await fs.unlink(filePath);
      }

      if (hasError) {
        return new Error("有些项目不是文件");
      } else {
        res.statusCode = 200;
        res.json({
          msg: '文件删除成功',
          data: {}
        });
      }
    } catch (error) {
      next(new Error(error as string));
    }
  });

  router.post('/renameFolder', auth(['admin']), async (req, res, next) => {
    const { old_name, new_name } = req.body;
    const oldPath = path.join(rootFolder, old_name);
    const newPath = path.join(rootFolder, new_name);

    try {
      console.log('newPath', newPath)
      const newFolderAccess = await fs.access(newPath).then(() => true).catch(() => false);
      console.log('newFolderAccess', newFolderAccess)
      if (newFolderAccess) {
        next(new Error("文件夹已存在"));
      }
      const stats = await fs.stat(oldPath);
      if (!stats.isDirectory()) {
        next(new Error("不是一个文件夹"));
      }

      await fs.rename(oldPath, newPath);

      res.json({
        msg: '文件夹重命名成功',
        data: {}
      });
    } catch (error) {
      next(new Error(error as string));
    }
  });

  router.post('/createFolder', auth(['admin', 'user']), async (req, res, next) => {
    const { name } = req.body;
    const dirPath = path.join(rootFolder, name);

    try {
      await fs.mkdir(dirPath);
      res.json({
        msg: `文件夹${name}创建成功`,
        data: {}
      });
    } catch (error) {
      next(new Error(error as string));
    }
  });

  router.post('/deleteFolder', auth(['admin']), async (req, res, next) => {
    const { name } = req.body
    // const folderPath = path.join(rootFolder, name);

    try {
      // 检查文件夹是否存在
      await fs.access(name);

      // 删除文件夹
      await fs.rm(name, { recursive: true });

      res.json({
        msg: `文件夹${name}删除成功`,
        data: {}
      });
    } catch (error) {
      next(new Error(error as string));
    }
  });

  router.post('/renameFile', auth(['admin']), async (req, res, next) => {
    try {
      const { old_name, new_name } = req.body;
      const oldPath = path.join(rootFolder, old_name);
      const newPath = path.join(rootFolder, new_name);

      await fs.rename(oldPath, newPath);

      res.statusCode = 200;
      res.json({
        msg: '文件重命名成功',
        data: {}
      });
    } catch (error) {
      next(new Error(error as string));
    }
  });

  router.post('/moveFile', auth(['admin']), async (req, res, next) => {
    const { files, dest_dir } = req.body;
    const destDirPath = path.join(rootFolder, dest_dir);

    try {
      const filesArray = files.split(',');
      let allFiles = true;
      for (const file of filesArray) {
        const filePath = path.join(rootFolder, file);
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          allFiles = false;
          break;
        }
      }

      if (!allFiles) {
        return new Error("有些项目不是文件");
      }

      await fs.mkdir(destDirPath, { recursive: true });
      for (const file of filesArray) {
        await fs.rename(path.join(rootFolder, file), path.join(destDirPath, file));
      }

      res.sendStatus(200).json({
        msg: '文件移动成功',
        data: {}
      });
    } catch (error) {
      next(new Error(error as string));
    }
  });
  return router;
}

