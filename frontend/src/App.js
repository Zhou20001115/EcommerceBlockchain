import ConnectWallet from "./components/ConnectWallet";
import BuyProduct from "./components/BuyProduct";
import { useState } from "react";

function App() {
    const [account, setAccount] = useState(null);

    return (
        <div>
            <h1>基于区块链的电商平台</h1>
            
            {/* 连接钱包组件 */}
            <ConnectWallet setAccount={setAccount} />
            
            {/* 显示已连接的钱包地址 */}
            {account && <p>已连接钱包地址: {account}</p>}

            {/* 商品购买组件（测试时手动传入 productId 和加密 key） */}
            <BuyProduct productId={1} key={"your-encryption-key"} />
        </div>
    );
}

export default App;
