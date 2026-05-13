const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");
const { globalRateLimit } = require("./middlewares/rateLimit.middleware");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(globalRateLimit);

app.use("/api", routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
