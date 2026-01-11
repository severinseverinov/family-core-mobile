// Basit bir encryption/decryption implementasyonu
// NOT: Bu implementasyon production için yeterli değildir.
// Gerçek bir uygulama için AES-256 gibi güvenli bir şifreleme kullanılmalıdır.

const ENCRYPTION_KEY = "hrrmumznuNArIgc8TzvfyhQShJaQNB4A"; // Production'da güvenli bir key kullanılmalı

// Base64 encoding/decoding for React Native
const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function base64Encode(input: string): string {
  let output = "";
  let i = 0;
  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = i < input.length ? input.charCodeAt(i++) : 0;
    const c = i < input.length ? input.charCodeAt(i++) : 0;

    const bitmap = (a << 16) | (b << 8) | c;
    output += chars.charAt((bitmap >> 18) & 63);
    output += chars.charAt((bitmap >> 12) & 63);
    output += i - 2 < input.length ? chars.charAt((bitmap >> 6) & 63) : "=";
    output += i - 1 < input.length ? chars.charAt(bitmap & 63) : "=";
  }
  return output;
}

function base64Decode(input: string): string {
  let output = "";
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
  let i = 0;
  while (i < input.length) {
    const enc1 = chars.indexOf(input.charAt(i++));
    const enc2 = chars.indexOf(input.charAt(i++));
    const enc3 = chars.indexOf(input.charAt(i++));
    const enc4 = chars.indexOf(input.charAt(i++));

    const bitmap = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;
    output += String.fromCharCode((bitmap >> 16) & 255);
    if (enc3 !== 64) output += String.fromCharCode((bitmap >> 8) & 255);
    if (enc4 !== 64) output += String.fromCharCode(bitmap & 255);
  }
  return output;
}

/**
 * Basit bir şifreleme fonksiyonu
 * @param text Şifrelenecek metin
 * @returns Şifrelenmiş metin (base64 formatında)
 */
export function encrypt(text: string): string {
  try {
    // Basit XOR şifreleme (production için yeterli değil)
    // Gerçek uygulamada AES-256 gibi güvenli bir yöntem kullanılmalı
    const key = ENCRYPTION_KEY;
    let encrypted = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    // Base64 encoding
    return base64Encode(encrypted);
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Şifreleme hatası");
  }
}

/**
 * Basit bir şifre çözme fonksiyonu
 * @param encryptedText Şifrelenmiş metin (base64 formatında)
 * @returns Çözülmüş metin
 */
export function decrypt(encryptedText: string): string {
  try {
    // Base64 decoding
    const encrypted = base64Decode(encryptedText);
    const key = ENCRYPTION_KEY;
    let decrypted = "";
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Şifre çözme hatası");
  }
}
