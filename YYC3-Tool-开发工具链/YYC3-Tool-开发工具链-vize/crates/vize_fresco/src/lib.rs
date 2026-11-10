//! Fresco - Vue TUI Framework
//!
//! A high-performance Terminal User Interface framework for Vue.js,
//! similar to React Ink but built with Rust for performance.
//!
//! # Features
//!
//! - **Terminal Control**: Cross-platform terminal handling via crossterm
//! - **Flexbox Layout**: Layout engine powered by taffy
//! - **CJK Support**: Full Unicode text handling including Japanese IME
//! - **Efficient Rendering**: Double-buffered differential rendering
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────┐
//! │                    Vue Components                        │
//! │                  (Box, Text, Input)                       │
//! └─────────────────────────────────────────────────────────┘
//!                           │
//!                           ▼
//! ┌─────────────────────────────────────────────────────────┐
//! │                  Vue Custom Renderer                     │
//! │                    (TypeScript)                          │
//! └─────────────────────────────────────────────────────────┘
//!                           │
//!                           ▼
//! ┌─────────────────────────────────────────────────────────┐
//! │                   NAPI Bindings                          │
//! │             (Rust <-> Node.js bridge)                    │
//! └─────────────────────────────────────────────────────────┘
//!                           │
//!         ┌─────────────────┼─────────────────┐
//!         ▼                 ▼                 ▼
//! ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
//! │   Terminal    │ │    Layout     │ │    Render     │
//! │   (backend,   │ │   (taffy,     │ │   (tree,      │
//! │    buffer)    │ │    flex)      │ │    diff)      │
//! └───────────────┘ └───────────────┘ └───────────────┘
//!         │                                   │
//!         ▼                                   ▼
//! ┌───────────────┐                 ┌───────────────┐
//! │     Input     │                 │     Text      │
//! │  (keyboard,   │                 │   (width,     │
//! │   mouse, ime) │                 │    segment)   │
//! └───────────────┘                 └───────────────┘
//! ```

pub mod component;
pub mod input;
pub mod layout;
pub mod render;
pub mod terminal;
pub mod text;

#[cfg(feature = "napi")]
pub mod napi;

// Re-exports for convenience
pub use component::{BoxNode, InputNode, TextNode};
pub use input::{Event, ImeState, KeyEvent, MouseEvent};
pub use layout::{FlexStyle, LayoutEngine, Rect};
pub use render::{RenderNode, RenderTree};
pub use terminal::{Backend, Buffer, Cell, Cursor};
pub use text::{TextSegment, TextWidth, TextWrap};

/// Fresco version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
