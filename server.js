const mongoose = require('mongoose');
const dotenv = require('dotenv');

// UNCAUGHT EXCEPTION: handles the sync errors
// this has to be placed before all the other code
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1); // 0 is success and 1 is failure
});
// console.log(x);

// this has to be placed before the app file. If not, the app file will not be able to access the env variables
dotenv.config({ path: './config.env' });
const app = require('./app');

// we have to change the connection string to include the password.
// because we don't want to explicitly write the password in the config file
const DB = process.env.DATABASE.replace(
  '<db_password>',
  process.env.DATABASE_PASSWORD,
);

// connect to database
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    // (con) => {
    // console.log(con.connections); }
    console.log('DB connection successful!');
  });

// express environment
console.log(process.env.NODE_ENV);

// START SERVER
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// UNHANDLED REJECTION
// this handles the exception that we didn't handle in our code
// handles the async errors
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1); // 0 is success and 1 is failure
  });
});
