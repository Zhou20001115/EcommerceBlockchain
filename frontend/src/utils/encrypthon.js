import crypto from "crypto";
import eccrypto from "eccrypto";

/**
 * 生成 32 字节随机 session key（用于 AES 加密）
 */
export function generateKey() {
    return crypto.randomBytes(32).toString("hex"); // 64 字符 hex 字符串
}

/**
 * 使用 AES-GCM 加密数据
 * @param {string|object} data - 要加密的明文数据（支持对象会自动序列化）
 * @param {string} keyHex - hex 格式的 AES 密钥（64 字符）
 * @returns {Promise<{iv: string, ciphertext: string}>}
 */
export async function encryptOrder(data, keyHex) {
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const jsonData = typeof data === "string" ? data : JSON.stringify(data);
    let encrypted = cipher.update(jsonData, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
        iv: iv.toString("hex"),
        ciphertext: encrypted,
    };
}

/**
 * 使用 ECIES 加密 AES 会话密钥
 * @param {string} publicKeyHex - 后端提供的公钥（uncompressed, 0x04 开头）
 * @param {string} sessionKeyHex - 要加密的会话密钥（hex 字符串）
 * @returns {Promise<string>} - 返回加密结果的 hex 字符串（合约可接收）
 */
export async function encryptSessionKeyWithECIES(publicKeyHex, sessionKeyHex) {
    const publicKeyBuffer = Buffer.from(publicKeyHex.slice(2), "hex"); // 去掉 0x
    const sessionKeyBuffer = Buffer.from(sessionKeyHex, "hex");

    const encrypted = await eccrypto.encrypt(publicKeyBuffer, sessionKeyBuffer);
    const concatenated = Buffer.concat([
        encrypted.iv,
        encrypted.ephemPublicKey,
        encrypted.mac,
        encrypted.ciphertext,
    ]);

    return concatenated.toString("hex"); // 返回拼接后的 hex 字符串
}
