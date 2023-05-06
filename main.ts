import express from 'express';
import session from 'express-session';
import * as dotenv from 'dotenv'
import path from 'path';
import bodyParser from 'body-parser';
import ejs from 'ejs';
import { JsonDB, Config } from 'node-json-db';

import errorHandler from './middleware/errorHandler';
import index from './router/index';
import user from './router/user';

dotenv.config()
const app = express();
const port = process.env.PORT || 3000;
const rootFolder = path.join(process.env.ROOTPATH as string);
const db = new JsonDB(new Config("myDataBase", true, false, '/'));
// const db = new JsonDB(new Config("/db/db.json", true, false, '/'));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.use(session({
  secret: 'sensems',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', express.static(rootFolder));
app.use('/view', express.static(path.join(__dirname, './view')));

app.get('/', (req, res) => {
  res.redirect('/view')
})

app.get('/view*', (req, res) => {
  res.render(path.join(__dirname, './view/index.html'))
})


app.use(index(rootFolder))
app.use('/user', user(db))
app.use(errorHandler)



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});