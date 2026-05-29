const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`CROWDPASS backend ejecutandose en el puerto ${env.port}`);
});
