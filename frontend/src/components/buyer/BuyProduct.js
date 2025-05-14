import axios from "axios";
import { useWeb3 } from "../../context/web3/Web3Context";
import {
    generateKey,
    encryptOrder,
    encryptSessionKeyWithECIES,
} from "../../utils/encrypthon";
import { getContractInstance } from "../../utils/contracts";
import { ethers } from "ethers";
import React, { useState, useRef, useEffect } from "react";
import { getBytes } from "ethers";
export default function BuyProduct({ productId }) {
    const { signer } = useWeb3();
    const [logMessages, setLogMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ address: "", phone: "" });
    const [successMessage, setSuccessMessage] = useState(null);
    const logEndRef = useRef(null);

    const log = (msg) => {
        console.log(msg);
        setLogMessages((prev) => [...prev, msg]);
    };

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logMessages]);

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    async function handleBuy() {
        if (!form.address || !form.phone) {
            alert("请填写完整的地址和手机号");
            return;
        }

        setLoading(true);
        setSuccessMessage(null);
        console.group("🏁 开始购买流程");
        log("🏁 开始购买流程");
        try {
            // 1. 获取必要信息
            const address = await signer.getAddress();
            log(`✅ 钱包地址: ${address}`);
            const contract = getContractInstance(signer);
            const contractAddress = await contract.getAddress(); // 获取合约地址
            // 1.5 确保用户有 BUYER_ROLE
            log("🔑 检查用户角色...");
            const hasRole = await contract.hasRole(contract.BUYER_ROLE(), address);
            if (!hasRole) {
                log("⚠️ 用户没有 BUYER_ROLE，尝试授予...");
                const tx = await contract.grantBuyerRole(address);
                await tx.wait();
                log("✅ 角色授予成功");
            }

            // 2. 生成并加密会话密钥
            const sessionKey = generateKey();
            log(`🔑 SessionKey (前8位): ${sessionKey.slice(0, 8)}`);

            // 3. 加密订单数据
            const orderData = { userId: address, ...form };
            const { iv, ciphertext: encryptedData } = await encryptOrder(orderData, sessionKey);
            log(`🛡️ 加密结果: {iv: '${iv?.slice(0, 12)}...', ciphertext: '${encryptedData?.slice(0, 12)}...'}`);

            // 4. 获取后端公钥并加密会话密钥
            const response = await axios.get("http://localhost:5000/public-key");
            const publicKey = response.data.publicKey;
            const encryptedKey = await encryptSessionKeyWithECIES(publicKey, sessionKey);
            const encryptedKeyHex = '0x' + encryptedKey; // encryptedKey 是 hex 字符串
            console.log("🔐 Encrypted key (hex):", encryptedKey);
            const encryptedKeyBytes = getBytes(encryptedKeyHex); // 🔁 转成 bytes 类型


            // 5. 生成哈希和签名
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes(encryptedData + iv));
            log(`🔏 数据哈希: ${dataHash.slice(0, 16)}...`);

            const timestamp = Math.floor(Date.now() / 1000);
            log(`⏱️ 时间戳: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);

            const domain = {
                name: "EcommercePrivacy",
                version: "1",
                chainId: 11155111,
                verifyingContract: contractAddress
            };
            console.log("Domain separator:", {
                ...domain,
                verifyingContract: domain.verifyingContract
            });
            const types = {
                PlaceOrder: [
                    { name: "productId", type: "uint256" },
                    { name: "dataHash", type: "bytes32" },
                    { name: "timestamp", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                ],
            };
            const currentNonce = await contract.nonces(address);
            log(`🔢 当前 nonce: ${currentNonce}`);

            const value = { productId, dataHash, timestamp, nonce: currentNonce };

            // 调试：打印完整签名数据
            console.log("签名数据:", { domain, types, value });

            const signature = await signer.signTypedData(domain, types, value);
            const recovered = ethers.verifyTypedData(domain, types, value, signature);
            log(`👤 恢复地址: ${recovered}`);
            log(`👤 钱包地址: ${address}`);

            if (recovered.toLowerCase() !== address.toLowerCase()) {
                log("❌ 本地验证失败，签名地址不一致！");
            }
            log(`🖋️ 签名完成: ${signature.slice(0, 12)}...`);
            // 👇 verifySignature 验证 on-chain 签名是否有效
            log("🔍 验证合约端签名...");
            const isValid = await contract.verifySignature(
                address,
                productId,
                dataHash,
                timestamp,
                currentNonce,
                signature
            );
            log(`🔐 verifySignature 合约验证: ${isValid ? "✅ 成功" : "❌ 失败"}`);

            // 6. 调用合约（需新增encryptedKey参数）
            log("🚀 调用合约下单...");
            const tx = await contract.placeOrder(
                productId,
                encryptedData,
                iv,
                dataHash,
                timestamp,
                encryptedKeyBytes, // 新增参数
                signature
            );

            log("⏳ 等待交易确认...");
            const receipt = await tx.wait(2);
            log(`📨 交易确认: 区块 ${receipt.blockNumber}`);

            // 7. 验证链上数据
            const orderId = receipt.logs[0].args.orderId;
            const onChainData = await contract.orders(orderId);
            if (onChainData.dataHash !== dataHash) throw new Error("链上数据哈希不匹配");
            log(`✅ 数据验证通过，订单ID: ${orderId}`);

            // 8. 更新状态
            setForm({ address: "", phone: "" });
            setSuccessMessage(`🎉 购买成功！订单 ID: ${orderId}`);
        } catch (err) {
            const errorMessage = err.reason?.replace("execution reverted: ", "") || err.message;
            log(`❌ 错误: ${errorMessage}`);

            if (errorMessage.includes("Invalid nonce")) {
                log("⚠️ 检测到nonce过期，请重新发起交易");
            }
        } finally {
            log("🏁 流程结束");
            console.groupEnd();
            setLoading(false);
        }
    }

    return (
        <div className="p-4 bg-white border rounded shadow mt-6">
            <div className="flex flex-col gap-4 mb-4">
                <h2 className="text-lg font-semibold">🛍️ 商品 #{productId}</h2>

                {successMessage && (
                    <div className="p-2 text-green-800 bg-green-100 border border-green-300 rounded">
                        {successMessage}
                    </div>
                )}

                <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    placeholder="请输入收货地址"
                    className="border rounded px-3 py-2"
                />

                <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="请输入手机号"
                    className="border rounded px-3 py-2"
                />

                <button
                    onClick={handleBuy}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                    {loading ? '下单中...' : '立即购买'}
                </button>
            </div>

            <div className="bg-gray-50 p-3 rounded text-sm font-mono max-h-60 overflow-y-auto">
                <h3 className="font-bold mb-2">📋 操作日志</h3>
                <ul className="space-y-1">
                    {logMessages.map((msg, i) => (
                        <li key={i} className={msg.includes("❌") ? "text-red-500" : ""}>
                            {msg}
                        </li>
                    ))}
                    <div ref={logEndRef} />
                </ul>
            </div>
        </div>
    );
}
