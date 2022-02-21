pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";

contract MCDToken is ERC721Full {

  struct MCD{
      string name;
      string dateCreated;
  }

  mapping(uint256 => MCD) mcds;
  mapping(string => uint256) mcdIdCreated;


  constructor(string memory name, string memory symbol) public ERC721Full(name, symbol){}

// web3.eth.getAccounts() 를 하니 되었다 
// mint 도 await 비동기로 from accounts 를 불러와서 배포하니 되었다
  function mintMCDT(
      string memory _MCDId,
      string memory _name,
      string memory _dateCreated,
      string memory _tokenURI
  )
  public{
      require(mcdIdCreated[_MCDId]==0 , "MCD ID has aleady been created");
      uint256 tokenId = totalSupply().add(1);
      mcds[tokenId] = MCD(_MCDId , _dateCreated);
      mcdIdCreated[_MCDId] = tokenId;

      _mint(msg.sender, tokenId);
      _setTokenURI(tokenId, _tokenURI);
  }

  function getMCDT(uint256 _tokenId) public view returns(string memory, string memory){
      return (mcds[_tokenId].name, mcds[_tokenId].dateCreated);
  }

  function isTokenAlreadyCreated(string memory _MCDId) public view returns (bool){
      return mcdIdCreated[_MCDId] != 0 ? true : false;
  }
}