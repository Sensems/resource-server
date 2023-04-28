import express from 'express';
import * as dotenv from 'dotenv'
import path from 'path';
import bodyParser from 'body-parser';
import ejs from 'ejs';
import errorHandler from './middleware/errorHandler';
import index from './router/index';

dotenv.config()
const app = express();
const port = process.env.PORT || 3000;
const rootFolder = path.join(process.env.ROOTPATH as string);




app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', express.static(rootFolder));
app.use('/view', express.static(path.join(__dirname, './view')));

app.get('/*', (req, res) => {
  res.render(path.join(__dirname, './view/index.html'))
})

app.use(index(rootFolder))
app.use(errorHandler)



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});