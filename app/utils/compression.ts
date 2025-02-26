import { Buffer } from 'buffer';
import { gzip, ungzip } from 'react-native-gzip';

/**
 * Compresses a string using gzip
 */
export async function compress(data: string): Promise<string> {
  try {
    const compressed = await gzip(data);
    return Buffer.from(compressed).toString('base64');
  } catch (error) {
    console.error('Compression failed:', error);
    return data; // Fallback to uncompressed
  }
}

/**
 * Decompresses a gzipped base64 string
 */
export async function decompress(data: string): Promise<string> {
  try {
    const compressed = Buffer.from(data, 'base64');
    const decompressed = await ungzip(compressed);
    return decompressed.toString();
  } catch (error) {
    console.error('Decompression failed:', error);
    return data; // Fallback to compressed data
  }
}