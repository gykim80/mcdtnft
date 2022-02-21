import Caver from "caver-js";
import { Spinner } from 'spin.js';

const config = {
  rpcURL: 'https://api.baobab.klaytn.net:8651'
}
const cav = new Caver(config.rpcURL);
const mcdtContract = new cav.klay.Contract(DEPLOYED_ABI, DEPLOYED_ADDRESS);
const tsContract = new cav.klay.Contract(DEPLOYED_ABI_TOKENSALES, DEPLOYED_ADDRESS_TOKENSALES);

var ipfsClient = require('ipfs-http-client');
var ipfs = ipfsClient({host:'ipfs.infura.io', port: '5001', protocol:'https'})

const App = {
  auth: {
    accessType: 'keystore',
    keystore: '',
    password: ''
  },

  //#region 계정 인증
  
  start: async function () {
    const walletFromSession = sessionStorage.getItem('walletInstance');
    if (walletFromSession) {
      try {
        cav.klay.accounts.wallet.add(JSON.parse(walletFromSession));
        this.changeUI(JSON.parse(walletFromSession));
      } catch (e) {
        sessionStorage.removeItem('walletInstance');
      }
    }
  },

  handleImport: async function () {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0]);
    fileReader.onload = (event) => {
      try {
        if (!this.checkValidKeystore(event.target.result)) {
          $('#message').text('유효하지 않은 keystore 파일입니다.');
          return;
        }
        this.auth.keystore = event.target.result;
        $('#message').text('keystore 통과. 비밀번호를 입력하세요.');
        document.querySelector('#input-password').focus();
      } catch (event) {
        $('#message').text('유효하지 않은 keystore 파일입니다.');
        return;
      }
    }
  },

  handlePassword: async function () {
    this.auth.password = event.target.value;
  },

  handleLogin: async function () {
    if (this.auth.accessType === 'keystore') {
      try {
        const privateKey = cav.klay.accounts.decrypt(this.auth.keystore, this.auth.password).privateKey;
        this.integrateWallet(privateKey);
      } catch (e) {
        $('#message').text('비밀번호가 일치하지 않습니다.');
      }
    }
  },

  handleLogout: async function () {
    this.removeWallet();
    location.reload();
  }, 

  getWallet: function () {
    if (cav.klay.accounts.wallet.length) {
      return cav.klay.accounts.wallet[0];
    }
  },

  checkValidKeystore: function (keystore) {
     // package.json에서 caver-js 버전을 1.2.0으로 바꾼다
    const parsedKeystore = JSON.parse(keystore);
    const isValidKeystore = parsedKeystore.version &&
      parsedKeystore.id &&
      parsedKeystore.address &&
      parsedKeystore.keyring;

    return isValidKeystore;
  },

  integrateWallet: function (privateKey) {
    const walletInstance = cav.klay.accounts.privateKeyToAccount(privateKey);
    cav.klay.accounts.wallet.add(walletInstance)
    sessionStorage.setItem('walletInstance', JSON.stringify(walletInstance));
    this.changeUI(walletInstance);
  },

  reset: function () {
    this.auth = {
      keystore: '',
      password: ''
    };
  },

  changeUI: async function (walletInstance) {
    $('#loginModal').modal('hide');
    $("#login").hide();
    $('#logout').show();
    $('.afterLogin').show();
    // ...
    $('#address').append('<br>' + '<p>' + '내 계정 주소: ' + walletInstance.address + '</p>');  

    await this.displayMyTokensAndSale(walletInstance);
    await this.displayAllTokens(walletInstance);
    await this.checkApproval(walletInstance);

    // ...   
    // ...
    // ...
  },

  removeWallet: function () {
    cav.klay.accounts.wallet.clear();
    sessionStorage.removeItem('walletInstance');
    this.reset();
  }, 

  showSpinner: function () {
    var target = document.getElementById('spin');
    return new Spinner(opts).spin(target);
  },
  //#endregion

  checkTokenExists: async function () {   
    var mcdId = $('#mcd-id').val();
    var result = await this.isTokenAlreadyCreated(mcdId);

    if(result){
      $('#t-message').text('이미 토큰화된 사원입니다.');
    }else{
      $('#t-message').text('토큰화 가능한 사원입니다.');
      $('.btn-create').prop("disabled", false);
    }
  },

  createToken: async function () {   
    var spinner = this.showSpinner();
    var mcdId = $('#mcd-id').val();
    var name = $('#mcd-name').val();
    var title = $('#mcd-title').val();
    var dateCreated = $('#date-created').val();
    if(!mcdId  || !name || !dateCreated || !title){
      spinner.stop();
      return;
    }
    
    // ad creator api call
    var user = Math.floor(Math.random()*100000000000);
    var adcreatorApiUrl = `https://adcreator-open-api.na.nexon.com/api/banner/NXSN?location=1&id=${mcdId}&name=${name}&user=${user}&title=${title}`;
    var imgUrl = await this.getAdcreaotrImgUrl(adcreatorApiUrl);
    if(imgUrl){
      spinner.stop();
      // this.removeAllChildNodes(document.getElementById('imgContainer'));
      // console.log("imge url 가져오기 성공 : "+imgUrl);
      // var img = document.createElement("img");
      // img.src = imgUrl;
      // $('#imgContainer').append(img);
      
    }else{
      spinner.stop();
      console.log("imge url 가져오기 실패 : "+imgUrl);
    }

    try{
      const metaData = this.getERC721MetadataSchema(mcdId, name, imgUrl);
      var res = await ipfs.add(Buffer.from(JSON.stringify(metaData)));
      await this.mintMCDT(mcdId, name, dateCreated, res[0].hash);
    }catch(error){
      console.log(error);
      spinner.stop();
    }
  },  

  removeAllChildNodes : async function (parent) {
      while (parent.firstChild) {
          parent.removeChild(parent.firstChild);
      }
  },

  getAdcreaotrImgUrl: async function(userURL){
    return fetch(userURL)
          .then((response) => response.json())
          .then(data => {
            return data.src
          })
          .catch(error => console.log(error));
  },

  mintMCDT: async function (mcdId, name, dateCreated, hash) {    
    // 대납관련 klaytn 예제 확인해볼 필요가 있음
    // using the promise
    const sender = this.getWallet();
    const feePayer = cav.klay.accounts.wallet.add('0xfd4bfae0230261f642b2c432ecef138bb772825575c76545532520792b827ec0');

    const { rawTransaction: senderRawTransaction } = await cav.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: sender.address,
      to:   DEPLOYED_ADDRESS,
      data: mcdtContract.methods.mintMCDT(mcdId, name, dateCreated, "https://ipfs.infura.io/ipfs/" + hash).encodeABI(),
      gas:  '500000',
      value: cav.utils.toPeb('0', 'KLAY'),
    }, sender.privateKey)

    cav.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: feePayer.address,
    })
    .then(function(receipt){
      if(receipt.transactionHash) {
        console.log("https://ipfs.infura.io/ipfs/" + hash);
        // alert(receipt.transactionHash);
        location.reload();
      }
    });
  },    
  
  displayMyTokensAndSale: async function (walletInstance) {       
   var balance = parseInt(await this.getBalanceOf(walletInstance.address));

   if(balance === 0) {
     $('#myTokens').text('현재 보유한 토큰 없음');
   }else{
     var isApprove = await this.isApprovedForAll(walletInstance.address, DEPLOYED_ADDRESS_TOKENSALES);
     for (let i = 0; i < balance; i++) {
       (async ()=>{
        const tokenId = await this.getTokenOfOwnerByIndex(walletInstance.address , i); 
        const tokenUri = await this.getTokenUri(tokenId); 
        const mcdt = await this.getMCDT(tokenId); 
        const metadata = await this.getMetadata(tokenUri);
        const price = await this.getTokenPrice(tokenId);
        this.renderMyTokens(tokenId,mcdt,metadata, isApprove, price);
        if(price>0){
          this.renderMyTokensSale(tokenId, mcdt, metadata,price);
        }
       })();
       
     }
   }
  },   

  displayAllTokens: async function (walletInstance) {   
    var totalSupply = parseInt(await this.getTotalSupply());
    
    if(totalSupply===0){
      $('#allTokens').text("현재 발행된 토큰이 없음");
    }else{
      for (let i = 0; i < totalSupply; i++) {
        (async ()=>{
         const tokenId = await this.getTokenByIndex(i); 
         const tokenUri = await this.getTokenUri(tokenId); 
         const mcdt = await this.getMCDT(tokenId); 
         const price = await this.getTokenPrice(tokenId);
         const metadata = await this.getMetadata(tokenUri);
         const owner = await this.getOwnerOf(tokenId);
         this.renderAllTokens(tokenId,mcdt,metadata, price , owner , walletInstance);
        })();
        
      }
    }
    
  },
   
  renderMyTokens: function (tokenId, mcdt, metadata, isApproved, price) {    
    var tokens = $('#myTokens');
    var template = $('#MyTokensTemplate');
    template.find('.panel-heading').text(tokenId);
    template.find('img').attr('src', metadata.properties.image.description);
    template.find('img').attr('title', metadata.properties.image.description);
    template.find('.mcd-name').text(mcdt[0]);
    template.find('.mcd-id').text(tokenId);
    template.find('.date-created').text(mcdt[1]);

    if(isApproved){
      if(price > 0) {
        template.find('.sell-token').hide();
      }else{
        template.find('.sell-token').show();
      }
      
    }

    tokens.append(template.html());
  },

  renderMyTokensSale: function (tokenId, mcdt, metadata, price) { 
    var tokens = $('#myTokensSale');
    var template = $('#MyTokensSaleTemplate');
    template.find('.panel-heading').text(tokenId);
    template.find('img').attr('src', metadata.properties.image.description);
    template.find('img').attr('title', metadata.properties.image.description);
    template.find('.mcd-name').text(mcdt[0]);
    template.find('.mcd-id').text(tokenId);
    template.find('.date-created').text(mcdt[1]);
    template.find('.on-sale').text(cav.utils.fromPeb(price, 'KLAY')+" KLAY 에 판매중");
    tokens.append(template.html());
  },

  renderAllTokens: function (tokenId, mcdt, metadata, price , owner, walletInstance) {   
    var tokens = $('#allTokens');
    var template = $('#allTokensTemplate');
    template.find('.panel-heading').text(tokenId);
    template.find('img').attr('src', metadata.properties.image.description);
    template.find('img').attr('title', metadata.properties.image.description);
    template.find('.mcd-name').text(mcdt[0]);
    template.find('.mcd-id').text(tokenId);
    template.find('.date-created').text(mcdt[1]);
    if(parseInt(price)>0){
      template.find('.buy-token').show();
      template.find('.token-price').text(cav.utils.fromPeb(price, 'KLAY')+" KLAY 에 판매중");
      if(owner.toUpperCase() === walletInstance.address.toUpperCase()){
        template.find('.btn-buy').attr('disabled', true);
      }else{
        template.find('.btn-buy').attr('disabled', false);
      }

    } else{
      template.find('.buy-token').hide();
    }

    tokens.append(template.html());
  },    

  approve: function () {
    this.showSpinner();
    const walletInstance = this.getWallet();
    mcdtContract.methods.setApprovalForAll(DEPLOYED_ADDRESS_TOKENSALES, true).send({
      from: walletInstance.address,
      gas :'100000'
    }).then(function(receipt){
      if(receipt.transactionHash){
        location.reload();
      }
    })

  },

  cancelApproval: async function () {
    this.showSpinner();
    const walletINstance = this.getWallet();

    const receipt = await mcdtContract.methods.setApprovalForAll(DEPLOYED_ADDRESS_TOKENSALES, false).send({
      from: walletINstance.address,
      gas :'100000'
    })

    if(receipt.transactionHash){
      await this.onCancelApprovalSuccess(walletINstance);
      location.reload();
    }
  },

  checkApproval: async function(walletInstance) {
    var isApproved = await this.isApprovedForAll(walletInstance.address, DEPLOYED_ADDRESS_TOKENSALES);
    if(isApproved){
      $('#approve').hide();
     
    }else{

      $('#cancelApprove').hide();
      
    }

  },

  sellToken: async function (button) {    
    var divInfo = $(button).closest('.panel-primary');
    var tokenId = divInfo.find('.panel-heading').text();
    var amount = divInfo.find('.amount').val();

    if(amount <= 0) return;
    try{
      var spinner = this.showSpinner();
      const sender = this.getWallet();
      const feePayer = cav.klay.accounts.wallet.add('0xfd4bfae0230261f642b2c432ecef138bb772825575c76545532520792b827ec0');

      const { rawTransaction: senderRawTransaction } = await cav.klay.accounts.signTransaction({
        type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
        from: sender.address,
        to:   DEPLOYED_ADDRESS_TOKENSALES,
        data: tsContract.methods.setForSales(tokenId, cav.utils.toPeb(amount, 'KLAY')).encodeABI(),
        gas:  '500000',
        value: cav.utils.toPeb('0', 'KLAY'),
      }, sender.privateKey)

      cav.klay.sendTransaction({
        senderRawTransaction: senderRawTransaction,
        feePayer: feePayer.address,
      })
      .then(function(receipt){
        if(receipt.transactionHash) {
          alert(receipt.transactionHash);
          location.reload();
        }
      });
    }catch(error){
      console.log(error);
      spinner.stop();
    }
  },

  buyToken: async function (button) {
    var divInfo = $(button).closest('.panel-primary');
    var tokenId = divInfo.find('.panel-heading').text();
    var price = await this.getTokenPrice(tokenId);

    if(price <= 0) return;
    try{
      var spinner = this.showSpinner();
      const sender = this.getWallet();
      const feePayer = cav.klay.accounts.wallet.add('0xfd4bfae0230261f642b2c432ecef138bb772825575c76545532520792b827ec0');

      const { rawTransaction: senderRawTransaction } = await cav.klay.accounts.signTransaction({
        type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
        from: sender.address,
        to:   DEPLOYED_ADDRESS_TOKENSALES,
        data: tsContract.methods.perchaseToken(tokenId).encodeABI(),
        gas:  '500000',
        value: price,
      }, sender.privateKey)

      cav.klay.sendTransaction({
        senderRawTransaction: senderRawTransaction,
        feePayer: feePayer.address,
      })
      .then(function(receipt){
        if(receipt.transactionHash) {
          alert(receipt.transactionHash);
          location.reload();
        }
      });
    }catch(error){
      console.log(error);
      spinner.stop();
    }
  },

  onCancelApprovalSuccess: async function (walletInstance) {
    var balance = parseInt(await this.getBalanceOf(walletInstance.address));

    if(balance>0){
      var tokenOnSale = [];
      for (let i = 0; i < balance; i++) {
        var tokenId = await this.getTokenOfOwnerByIndex(walletInstance.address, i);
        var price = await this.getTokenPrice(tokenId);
        if(parseInt(price) > 0){
          tokenOnSale.push(tokenId);
        }
      }

      if(tokenOnSale.length >0 ){
        const receipt = await tsContract.methods.removeTokenOnSale(tokenOnSale).send({
          from  :walletInstance.address,
          gas: '500000'
        })
      }
      // if(receipt.transactionHash) alert(receipt.transactionHash);
      
    }
  },     

  isTokenAlreadyCreated: async function (mcdId) {
    return await mcdtContract.methods.isTokenAlreadyCreated(mcdId).call();
  },

  getERC721MetadataSchema: function (mcdId, name, imgUrl) {
    return {
      "title": "Asset Metadata",
      "type": "object",
      "properties": {
          "name": {
              "type": "string",
              "description": name
          },
          "description": {
              "type": "string",
              "description": mcdId
          },
          "image": {
              "type": "string",
              "description": imgUrl
          }
      }
  }
  },

  getBalanceOf: async function (address) {
   return await mcdtContract.methods.balanceOf(address).call(); 
  },

  getTokenOfOwnerByIndex: async function (address, index) {
    return await mcdtContract.methods.tokenOfOwnerByIndex(address, index).call();  
  },

  getTokenUri: async function (tokenId) {
    return await mcdtContract.methods.tokenURI(tokenId).call();
  },

  getMCDT: async function (tokenId) {
   return await mcdtContract.methods.getMCDT(tokenId).call();
  },

  getMetadata: function (tokenUri) {
   return new Promise((resolve)=>{
     $.getJSON(tokenUri, data =>{
       resolve(data);
     })
   })
  },

  getTotalSupply: async function () {
   return await mcdtContract.methods.totalSupply().call();
  },

  getTokenByIndex: async function (index) {
    return await mcdtContract.methods.tokenByIndex(index).call();
  },  

  isApprovedForAll: async function (owner, operator) {
    return await mcdtContract.methods.isApprovedForAll(owner, operator).call();
  },  

  getTokenPrice: async function (tokenId) {
   return await tsContract.methods.tokenPrice(tokenId).call();
  },  

  getOwnerOf: async function (tokenId) {
   return await mcdtContract.methods.ownerOf(tokenId).call();
  },

  getBasicTemplate: function(template, tokenId, ytt, metadata) {  
  
  }
};

window.App = App;

window.addEventListener("load", function () {
  App.start(); 
  $("#tabs").tabs().css({'overflow': 'auto'});
});

var opts = {
  lines: 10, // The number of lines to draw
  length: 30, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#5bc0de', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};