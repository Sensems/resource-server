# resource-server

一个使用`nodejs` 的 `fs模块` 和 `express` 来进行搭建资源管理的后端服务 (已有前端页面), 因为 `nodejs` 的跨平台，默认兼容了`linux`和`window`


[前端工程 resource-server-web](https://github.com/Sensems/resource-server-web)

```js
通过修改 `.env` 文件来修改基础配置
DOMAIN="http://localhost:3000" // 服务端域名
ROOTPATH="C:\\Users\\sensems\\Downloads" // 资源文件夹的绝对路径
PORT="3000" // 运行端口
```

## 运行项目
```js
yarn install // 下载依赖

yarn dev // 开发调试

yarn start // 正式运行
```

## nginx配置

```js
server {
  listen 80;
  server_name xx.xxx.com; // 对应.env的服务端域名
  root /data/pic; // 对应.env的ROOTPATH的资源文件夹的绝对路径

  location / {
      proxy_pass http://localhost:3000; //运行的本地服务端口
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
  }

  error_page 500 502 503 504 /50x.html;
  location = /50x.html {
      root /usr/share/nginx/html;
  }
}
```