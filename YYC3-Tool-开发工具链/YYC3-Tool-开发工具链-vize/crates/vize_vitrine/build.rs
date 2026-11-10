fn main() {
    #[cfg(all(feature = "napi", not(target_arch = "wasm32")))]
    napi_build::setup();
}
