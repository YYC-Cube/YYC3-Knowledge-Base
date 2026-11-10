//! API key generation and validation for service accounts

use rand::distr::{Alphanumeric, SampleString};
use sha2::{Digest, Sha256};

/// API key generator
pub struct ApiKeyGenerator;

impl ApiKeyGenerator {
    /// Generate a new API key
    /// Format: ops_ak_<32-char-random>
    pub fn generate() -> String {
        let random = Alphanumeric.sample_string(&mut rand::rng(), 32);

        format!("ops_ak_{}", random)
    }

    /// Generate key ID (public identifier)
    /// Format: ak_<8-char-prefix>
    pub fn generate_key_id(key: &str) -> String {
        // Extract 8 chars after prefix
        let prefix_chars = key.chars().skip(7).take(8).collect::<String>();
        format!("ak_{}", prefix_chars)
    }

    /// Hash API key for storage using SHA-256
    pub fn hash(key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_api_key() {
        let key = ApiKeyGenerator::generate();
        assert!(key.starts_with("ops_ak_"));
        assert_eq!(key.len(), 39); // "ops_ak_" (7 chars) + 32 chars
    }

    #[test]
    fn test_generate_key_id() {
        let key = "ops_ak_abcdefghijklmnopqrstuvwxyz";
        let key_id = ApiKeyGenerator::generate_key_id(&key);
        assert!(key_id.starts_with("ak_"));
        assert_eq!(key_id.len(), 11); // "ak_" (3 chars) + 8 chars
    }

    #[test]
    fn test_hash_is_deterministic() {
        let key = "test_key_123456789012345678901234567890";
        let hash1 = ApiKeyGenerator::hash(key);
        let hash2 = ApiKeyGenerator::hash(key);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_is_different_for_different_keys() {
        let key1 = "test_key_123456789012345678901234567890";
        let key2 = "test_key_987654321098765432109876543210";
        let hash1 = ApiKeyGenerator::hash(key1);
        let hash2 = ApiKeyGenerator::hash(key2);
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hash_length() {
        let key = "test_key";
        let hash = ApiKeyGenerator::hash(key);
        // SHA-256 produces 64 hex characters
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_full_workflow() {
        // Generate a key
        let key = ApiKeyGenerator::generate();

        // Generate key_id
        let key_id = ApiKeyGenerator::generate_key_id(&key);
        assert!(key_id.starts_with("ak_"));

        // Hash the key
        let hash = ApiKeyGenerator::hash(&key);
        assert_eq!(hash.len(), 64);

        // Verify the hash is consistent
        let hash2 = ApiKeyGenerator::hash(&key);
        assert_eq!(hash, hash2);
    }
}
