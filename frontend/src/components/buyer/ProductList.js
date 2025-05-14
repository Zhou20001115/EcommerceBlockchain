// components/buyer/ProductList.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../../context/web3/Web3Context";
import BuyProduct from "./BuyProduct";

export default function ProductList() {
    const { contract } = useWeb3();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                if (!contract) return;

                // 获取商品总数
                const count = await contract.getProductsCount();

                // 将返回值转为数字（两种安全的方式任选其一）
                const productCount = parseInt(count.toString()); // 方式1：先转字符串再转数字
                // const productCount = Number(count);        // 方式2：直接转数字
                console.log("商品总数:", productCount);

                // 生成从1到productCount的ID数组
                const ids = Array.from({ length: productCount }, (_, i) => i + 1);

                const items = await Promise.all(
                    ids.map(async (id) => {
                        const p = await contract.products(id);
                        return {
                            id: p.id.toString(),
                            name: p.name,
                            price: ethers.formatEther(p.price)
                        };
                    })
                );
                setProducts(items.filter(p => p.id !== "0"));
            } catch (error) {
                console.error("获取商品列表失败:", error);
            }
        };

        fetchProducts();
    }, [contract]);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">🛒 所有商品</h2>
            {products.length > 0 ? (
                products.map((p) => (
                    <div key={p.id} className="p-4 bg-gray-100 rounded shadow">
                        <p><strong>商品:</strong> {p.name}</p>
                        <p><strong>价格:</strong> {p.price} ETH</p>
                        <BuyProduct productId={p.id} />
                    </div>
                ))
            ) : (
                <p className="text-gray-500">暂无商品</p>
            )}
        </div>
    );
}
