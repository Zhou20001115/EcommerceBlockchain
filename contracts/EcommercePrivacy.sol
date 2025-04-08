// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 导入OpenZeppelin权限管理合约
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract EcommercePrivacy is Ownable, AccessControl {
    // 角色权限定义
    bytes32 public constant SELLER_ROLE = keccak256("SELLER");  // 卖家角色哈希
    bytes32 public constant BUYER_ROLE = keccak256("BUYER");   // 买家角色哈希

    // 商品数据结构（包含加密元数据）
    struct Product {
        uint256 id;                // 商品唯一标识
        string name;               // 商品名称（明文）
        uint256 price;             // 商品价格
        address seller;            // 卖家地址
        string encryptedDetails;  // 加密的商品详情
        string iv;                 // 加密初始向量（用于AES等算法解密）
    }

    // 订单数据结构（包含加密交易数据）
    struct Order {
        uint256 id;               // 订单唯一标识
        uint256 productId;        // 关联商品ID
        address buyer;            // 买家地址
        uint256 timestamp;        // 下单时间戳
        bool fulfilled;           // 订单完成状态
        string encryptedData;     // 加密的订单数据
        string iv;                // 加密初始向量
    }

    // 状态变量
    uint256 private productCounter;  // 商品ID自增计数器
    uint256 private orderCounter;    // 订单ID自增计数器
    mapping(uint256 => Product) public products;  // 商品ID到数据的映射
    mapping(uint256 => Order) public orders;      // 订单ID到数据的映射

    // 事件定义
    event ProductAdded(uint256 productId, address seller, string iv); // 商品添加事件
    event OrderPlaced(uint256 orderId, address buyer, string iv);      // 订单创建事件

    // 构造函数（初始化角色权限）
    constructor() Ownable(msg.sender) {
        // 部署者获得默认管理员权限
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // 部署者同时拥有卖家和买家角色（示例配置）
        _grantRole(SELLER_ROLE, msg.sender);
        _grantRole(BUYER_ROLE, msg.sender);
    }

    // 商品添加函数（仅限卖家）
    function addProduct(
        string memory name,
        uint256 price,
        string memory encryptedDetails,
        string memory iv  // 加密初始向量参数
    ) external onlyRole(SELLER_ROLE) {
        productCounter++;
        products[productCounter] = Product(
            productCounter,
            name,
            price,
            msg.sender,
            encryptedDetails,
            iv  // 存储初始向量
        );
        emit ProductAdded(productCounter, msg.sender, iv);
    }

    // 下单函数（仅限买家）
    function placeOrder(
        uint256 productId,
        string memory encryptedData,
        string memory iv  // 加密初始向量参数
    ) external onlyRole(BUYER_ROLE) {
        orderCounter++;
        orders[orderCounter] = Order(
            orderCounter,
            productId,
            msg.sender,
            block.timestamp,
            false,  // 初始状态未完成
            encryptedData,
            iv  // 存储初始向量
        );
        emit OrderPlaced(orderCounter, msg.sender, iv);
    }

    // 订单完成函数（仅限卖家）
    function fulfillOrder(uint256 orderId) external onlyRole(SELLER_ROLE) {
        require(orders[orderId].buyer != address(0), "Order not found");
        orders[orderId].fulfilled = true;
    }

    // 辅助函数：查询商品加密IV
    function getProductIV(uint256 productId) public view returns (string memory) {
        return products[productId].iv;
    }

    // 辅助函数：查询订单加密IV
    function getOrderIV(uint256 orderId) public view returns (string memory) {
        return orders[orderId].iv;
    }
}