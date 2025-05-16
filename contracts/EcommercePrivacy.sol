// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract EcommercePrivacy is AccessControl, EIP712 {
    using ECDSA for bytes32;

    // 角色定义
    bytes32 public constant SELLER_ROLE = keccak256("SELLER");
    bytes32 public constant BUYER_ROLE = keccak256("BUYER");

    // EIP-712 类型哈希
    bytes32 private constant PLACE_ORDER_TYPEHASH =
        keccak256(
            "PlaceOrder(uint256 productId,bytes32 dataHash,uint256 timestamp,uint256 nonce)"
        );

    // 数据结构
    struct Product {
        uint256 id;
        string name;
        uint256 price;
        address seller;
        string encryptedDetails;
        string iv;
        bytes encryptedKey;
    }

    struct Order {
        uint256 id;
        uint256 productId;
        address buyer;
        uint256 timestamp;
        bool fulfilled;
        string encryptedData;
        string iv;
        bytes32 dataHash;
        bytes encryptedKey;
    }

    // 状态变量
    uint256 private productCounter;
    uint256 private orderCounter;
    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256) public nonces;

    // 事件
    event ProductAdded(uint256 productId, address seller);
    event OrderPlaced(uint256 orderId, address buyer, bytes32 dataHash);

    constructor() EIP712("EcommercePrivacy", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SELLER_ROLE, msg.sender);
    }

    function addProduct(
        string memory name,
        uint256 price,
        string memory encryptedDetails,
        string memory iv,
        bytes memory encryptedKey
    ) external onlyRole(SELLER_ROLE) {
        productCounter++;
        products[productCounter] = Product(
            productCounter,
            name,
            price,
            msg.sender,
            encryptedDetails,
            iv,
            encryptedKey
        );
        emit ProductAdded(productCounter, msg.sender);
    }

    // 新增的 verifySignature 函数（独立于placeOrder）
    function verifySignature(
        address signer,
        uint256 productId,
        bytes32 dataHash,
        uint256 timestamp,
        uint256 nonce,
        bytes memory signature
    ) external view returns (bool) {
        if (!hasRole(BUYER_ROLE, signer)) {
            return false;
        }

        if (nonces[signer] != nonce) {
            return false;
        }

        bytes32 structHash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    PLACE_ORDER_TYPEHASH,
                    productId,
                    dataHash,
                    timestamp,
                    nonce
                )
            )
        );

        return structHash.recover(signature) == signer;
    }

    function placeOrder(
        uint256 productId,
        string memory encryptedData,
        string memory iv,
        bytes32 dataHash,
        uint256 timestamp,
        bytes memory encryptedKey,
        bytes memory signature
    ) external {
        // 1. 基础验证
        require(products[productId].id != 0, "Invalid product");
        require(
            dataHash == keccak256(abi.encodePacked(encryptedData, iv)),
            "Data hash mismatch"
        );

        // 2. 使用verifySignature验证签名
        require(
            this.verifySignature(
                msg.sender,
                productId,
                dataHash,
                timestamp,
                nonces[msg.sender],
                signature
            ),
            "Invalid signature"
        );

        nonces[msg.sender]++;

        // 3. 创建订单
        orderCounter++;
        orders[orderCounter] = Order(
            orderCounter,
            productId,
            msg.sender,
            block.timestamp,
            false,
            encryptedData,
            iv,
            dataHash,
            encryptedKey
        );

        emit OrderPlaced(orderCounter, msg.sender, dataHash);
    }

    function fulfillOrder(uint256 orderId) external onlyRole(SELLER_ROLE) {
        require(orders[orderId].id != 0, "Invalid order");
        require(!orders[orderId].fulfilled, "Already fulfilled");
        orders[orderId].fulfilled = true;
    }

    function getProductsCount() external view returns (uint256) {
        return productCounter;
    }

    function grantBuyerRole(
        address user
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BUYER_ROLE, user);
    }
}
