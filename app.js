const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const {createHandler}  = require('graphql-http/lib/use/express');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolver');
const {clearImage} = require('./util/file');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);



app.use(auth);

app.put('/post-image', (req,res,next) => {
  console.log('IS AUTH: ',req.isAuth);
  if(!req.isAuth) throw new Error('You are not authenticated');
  if(!req.file) return res.status(200).json({message: 'No file provided!'});

  if(req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res.status(201).json({message: 'File Stored', filePath: req.file.path});
});
app.all("/graphql", (req, res) =>
  createHandler({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occurred.";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
    context: { req, res },
  })(req, res)
);
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    ''
  )
  .then(result => {
    const server = app.listen(8080);
    const io = require('./socket').init(server);
    io.on('connection', socket => {
      console.log('Client connected');
    });
  })
  .catch(err => console.log(err));
