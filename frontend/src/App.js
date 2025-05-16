import { useState, useEffect } from 'react';
import ConnectWallet from './components/ConnectWallet';
import ProductList from './components/buyer/ProductList';
import AddProduct from './components/seller/AddProduct';
import { getContractAddress, getContractInstance } from './utils/contracts';

function App() {
    const [account, setAccount] = useState(null);
    const [contractAddress, setContractAddress] = useState(null);
    const [signer, setSigner] = useState(null); // 新增签名者状态
    const [products, setProducts] = useState([]); // 新增商品数据状态

    useEffect(() => {
        try {
            const addr = getContractAddress();
            setContractAddress(addr);
        } catch (error) {
            console.error('合约地址加载失败:', error);
        }
    }, []);

    useEffect(() => {
        const verifyProduct = async (productId) => {
            const contract = getContractInstance(signer);
            const [product, orders] = await Promise.all([
                contract.products(productId),
                contract.productOrders(productId)
            ]);

            console.log(`商品 #${productId} 关联订单:`, {
                name: product.name,
                orderCount: orders.length
            });
        };

        products.forEach(p => verifyProduct(p.id));
    }, [products]);

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
            <div className="max-w-6xl mx-auto bg-white shadow-md rounded-lg p-6">
                <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">🛒 基于区块链的电商平台</h1>

                <ConnectWallet setAccount={setAccount} />

                {account && (
                    <>
                        <div className="bg-blue-50 p-4 rounded shadow mb-6">
                            <p><strong>✅ 已连接钱包:</strong> {account}</p>
                            <p><strong>📦 合约地址:</strong> {contractAddress || '未加载'}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h2 className="text-lg font-semibold text-green-700 mb-2">🔧 卖家功能区</h2>
                                <AddProduct />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-indigo-700 mb-2">🛍️ 买家功能区</h2>
                                <ProductList />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;
