//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NiceErc721 is ERC721URIStorage{

    uint256 public tokenCount;

    constructor() ERC721("NiceFT721", "NiFT") {}

    function mint(string memory tokenUrl) public returns (uint256 tokenId){
        tokenId = tokenCount;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenUrl);
        tokenCount++;
    }
}


contract NiceErc1155 is ERC1155 {

    string public name = "Nice Erc 1155";
    string public symbol = "NiFT1155";
    uint256 public tokenCount;
    mapping(uint256 => string) private uris;

    constructor() ERC1155("") { }

    function mint(uint256 amount, string memory metadataUrl) public returns (uint256 tokenId) {
        tokenId = tokenCount;
        _mint(msg.sender, tokenId, amount, "");
        uris[tokenId] = metadataUrl;
        tokenCount++;
    }

    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return uris[tokenId];
    }
}

