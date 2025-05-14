import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { getContractInstance } from "../../utils/contracts";
import { useWeb3 } from "../../context/web3/Web3Context";
import { generateKey, encryptOrder, encryptSessionKeyWithECIES } from "../../utils/encrypthon";

function AddProduct() {
    const { signer } = useWeb3();
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [details, setDetails] = useState("");
    const [status, setStatus] = useState("");

    const validateInputs = () => {
        if (!name || !price || !details) {
            throw new Error("所有字段均为必填项");
        }
        if (isNaN(price) || Number(price) <= 0) {
            throw new Error("价格必须为有效正数");
        }
    };

    const handleAddProduct = async () => {
        try {
            setStatus("上架中...");
            validateInputs();

            const contract = getContractInstance(signer);
            const address = await signer.getAddress();

            // 1. 获取后端公钥
            const response = await axios.get("http://localhost:5000/public-key");
            const publicKey = response.data.publicKey;
            if (!publicKey.startsWith('0x04')) {
                throw new Error("无效的公钥格式");
            }

            // 2. 生成加密密钥并加密数据
            const sessionKey = generateKey();
            let encryptedDetails, iv;
            try {
                const result = await encryptOrder(details, sessionKey);
                encryptedDetails = result.ciphertext;
                iv = result.iv;
            } catch (error) {
                throw new Error(`数据加密失败: ${error.message}`);
            }

            // 3. 加密会话密钥
            const encryptedKey = await encryptSessionKeyWithECIES(publicKey, sessionKey);


            // 4. 将加密后的密钥转换为十六进制格式（BytesLike）
            // const encryptedKeyBytes = ethers.getBytes(encryptedKey);
            const encryptedKeyHex = '0x' + encryptedKey; // encryptedKey 是 hex 字符串

            console.log("🔐 Encrypted key (hex):", encryptedKey);
            // 5. 提交上链
            const tx = await contract.addProduct(
                name,
                ethers.parseEther(price),
                encryptedDetails,
                iv,
                encryptedKeyHex, // 使用转换后的字节数组
                { gasLimit: 500000 }
            );

            await tx.wait(2);
            setStatus(`✅ 上架成功，TxHash: ${tx.hash}`);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.reason || err.message;
            setStatus(`❌ 上架失败: ${errorMessage}`);
            console.error("完整错误信息:", err);
        }
    };

    return (
        <div className="p-6 bg-white shadow rounded space-y-4 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-800">🛍️ 添加商品</h2>
            <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="商品名称"
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
                type="number"
                step="0.0001"
                value={price}
                onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="价格（单位: ETH）"
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
            />
            <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="商品描述（需包含敏感信息）"
                className="border p-2 w-full rounded h-32 focus:ring-2 focus:ring-blue-500"
            />
            <button
                onClick={handleAddProduct}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded w-full transition-colors"
            >
                上架商品
            </button>
            <div className={`text-sm p-3 rounded ${status.includes("✅") ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {status}
            </div>
        </div>
    );
}

export default AddProduct;