const HDWalletProvider = require("truffle-hdwallet-provider-klaytn");
const NETWORK_ID = '1001'
const GASLIMIT = '9000000'
const URL = `https://api.baobab.klaytn.net:8651`
// baobab
const PRIVATE_KEY_testnet = '0xfd4bfae0230261f642b2c432ecef138bb772825575c76545532520792b827ec0'
const PRIVATE_KEY_mainnet = '0xc11d77744b5be9aae6dbaf7ad657ae78f82ebddd2b595ba29a8c3df521684f03'

module.exports = {
  networks: {  
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id 
    },

    klaytn: {
      provider: new HDWalletProvider(PRIVATE_KEY_testnet, URL),
      network_id: NETWORK_ID,
      gas: GASLIMIT,
      gasPrice: null,
    },

    mainnet: {
      provider: () => new HDWalletProvider(PRIVATE_KEY_mainnet, "https://public-node-api.klaytnapi.com/v1/cypress"),
      network_id: '8217', //Klaytn mainnet's network id
      gas: '1000000',
      gasPrice: null
    }
  }
}