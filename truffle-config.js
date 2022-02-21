const HDWalletProvider = require("truffle-hdwallet-provider-klaytn");
const NETWORK_ID = '1001'
const GASLIMIT = '9000000'
const URL = `https://api.baobab.klaytn.net:8651`
const PRIVATE_KEY = '0xfd4bfae0230261f642b2c432ecef138bb772825575c76545532520792b827ec0'

module.exports = {
  networks: {  
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id 
    },

    klaytn: {
      provider: new HDWalletProvider(PRIVATE_KEY, URL),
      network_id: NETWORK_ID,
      gas: GASLIMIT,
      gasPrice: null,
    }  
  }
}