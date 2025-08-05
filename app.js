const express = require('express'); // node.js frame work.
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
// const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const userRouter = require('./routes/userRoutes');
const postRouter = require('./routes/postRoutes');
// const commentRouter = require('./routes/commentRoutes');

// Creating the express app
const app = express();

// GLOBAL MIDDLEWARE

// Set security HTTP headers
// Put this before all the global middlewares
// this is a middleware to set security headers
app.use(helmet());

// it shows the which path coming and show details about it with different parameters.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from the same API
// this is a middleware to limit the number of requests
const limiter = rateLimit({
  max: 100, // 100 request per windowMs
  windowsMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
// this is a middleware to modify the request
// the data in the body is added to req.body
// if we don't use this. we can't access the req.body. it will be undefined
// the body will only be 10kb. if the body is bigger, it will be not accepted
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
// this middleware looks at the request.body, the request query string, and request.params
// and then will basically filter the $ and . from the query
// example: {"$gt": ""}
app.use(mongoSanitize());

// Data sanitization against XSS
// this will clean any user input from malicious HTML code
// example: "name": "<div id='bad-code'>Name</div>"
app.use(xss());

// HTTP parameter pollution
// this will remove duplicate query parameters from the url
// example: "name=John&name=John", "price=100&price=200", "sort=price&sort=-price"
// app.use(
//   hpp({
//     whitelist: [
//       'duration',
//       'ratingsAverage',
//       'ratingsQuantity',
//       'maxGroupSize',
//       'difficulty',
//       'price',
//     ],
//   }),
// );

// Serving static files
app.use(express.static(`${__dirname}/public`));

app.use('/api/v1/users', userRouter);
app.use('/api/v1/posts', postRouter);
// app.use('/api/v1/comments', commentRouter);

// this is a wildcard route. it will match any route
// this should be the last route
// Because after all the routes are matched, if no route is matched, this will be executed
// if we put before any route, it will be executed first, and the other routes will not be executed
// this will be the only response we get
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;
