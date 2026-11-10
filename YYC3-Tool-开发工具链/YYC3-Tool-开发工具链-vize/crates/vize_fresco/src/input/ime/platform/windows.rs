//! Windows-specific IME handling.
//!
//! On Windows, console apps can use:
//! - IMM32 (Input Method Manager)
//! - TSF (Text Services Framework)
//!
//! Windows Terminal has better IME support than legacy cmd.exe.

// TODO: Implement Windows-specific IME features
// - ImmGetContext / ImmReleaseContext
// - ImmSetCompositionWindow for positioning
// - ImmGetCompositionString for preedit
