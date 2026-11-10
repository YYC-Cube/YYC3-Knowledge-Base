//! Authentication and authorization module

pub mod api_key;
pub mod jwt;
pub mod middleware;
pub mod password;

pub use api_key::ApiKeyGenerator;
pub use jwt::{Claims, JwtService, TokenPair};
pub use middleware::{
    extract_token, get_auth_context, jwt_auth_middleware, optional_auth_middleware, AuthContext,
};
pub use password::PasswordHasher;
