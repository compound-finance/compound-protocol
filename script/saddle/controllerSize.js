const fs = require('fs');

(async () => {
  fs.readFile('.build/contracts-trace.json', (err, data) => {
    if (err) throw err;
    let contracts = JSON.parse(data);
    contracts = contracts["contracts"];
    controller = contracts["contracts/Controller.sol:Controller"];
    bin = controller["bin-runtime"]
    const digits = bin.length;
    const bytes = digits / 2;
    console.log("Current Controller compiles to", bytes, "bytes.");
    const limit = 24576;
    console.log("The EIP-170 limit is", limit);
    if (bytes <= limit) {
      console.log("You are fine by", limit - bytes, "bytes.");
    } else {
      console.log("Contract too big. You should reduce by", bytes - limit, "bytes");
    }
  });
})();
