const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    req.isAuth = false;
    console.log('Auth header:1 ', authHeader, req.isAuth);
    return next();
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secret');
  } catch (err) {
    req.isAuth = false;
    console.log('Auth header:2 ', authHeader, req.isAuth);

    return next();
  }
  if (!decodedToken) {
    req.isAuth = false;
    console.log('Auth header:3 ', authHeader, req.isAuth);

    return next();
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  console.log('Auth header:4 ', authHeader, req.isAuth);

  next();
};
