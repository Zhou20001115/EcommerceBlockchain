import axios from "axios";
import { encryptOrder } from "../utils/encryption";
import { useWeb3 } from "../context/web3/Web3Context";

function BuyProduct({ productId }) {
  const { signer, account } = useWeb3();

  async function handleBuy() {
    try {
      // 阶段1：生成会话密钥
      const sessionKey = generateKey();
      
      // 阶段2：加密敏感数据
      const orderData = {
        userId: account,
        address: "0x...",
        phone: "138-1234-5678"
      };
      const { iv, ciphertext: encryptedData } = encryptOrder(
        JSON.stringify(orderData),
        sessionKey
      );

      // 阶段3：加密会话密钥
      const publicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey', 
        params: [account]
      });
      const encryptedKey = ethers.encrypt(publicKey, sessionKey);

      // 阶段4：生成请求签名
      const message = JSON.stringify({ productId, encryptedData, iv });
      const signature = await signer.signMessage(message);

      // 阶段5：发送请求
      const response = await axios.post("http://localhost:5000/placeOrder", {
        productId,
        encryptedData,
        iv,
        encryptedKey,
        signature,
        publicAddress: account
      });

      console.log("交易哈希:", response.data.txHash);
    } catch (error) {
      console.error("购买失败:", error.message);
    }
  }

  return <button onClick={handleBuy}>购买</button>;
}