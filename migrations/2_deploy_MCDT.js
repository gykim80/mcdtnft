const MCDToken = artifacts.require('./MCDToken.sol')
const fs = require('fs')

module.exports = function (deployer) {
  var name = "MCD Token";
  var symbol = "MCD";

  deployer.deploy(MCDToken, name, symbol)
    .then(() => {
      if (MCDToken._json) {
        fs.writeFile(
          'deployedABI',
          JSON.stringify(MCDToken._json.abi),
          (err) => {
            if (err) throw err
            console.log("파일에 ABI 입력 성공");
          })
      }

      fs.writeFile(
        'deployedAddress',
        MCDToken.address,
        (err) => {
          if (err) throw err
          console.log("파일에 주소 입력 성공");
        })
    })
}