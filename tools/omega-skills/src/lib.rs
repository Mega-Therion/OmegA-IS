#[link(wasm_import_module = "omega")]
unsafe extern "C" {
    fn get_input(ptr: *mut u8, len: u32);
    fn set_output(ptr: *const u8, len: u32);
    fn log(ptr: *const u8, len: u32);
    fn ark_bus_command(id_ptr: *const u8, id_len: u32, cmd_ptr: *const u8, cmd_len: u32);
    fn ark_read_sensor(id_ptr: *const u8, id_len: u32, metric_ptr: *const u8, metric_len: u32, out_ptr: *mut u8, out_len: u32) -> i32;
    fn ui_broadcast(ptr: *const u8, len: u32);
}

fn host_log(msg: &str) {
    unsafe { log(msg.as_ptr(), msg.len() as u32) };
}

fn host_ui_broadcast(msg: &str) {
    unsafe { ui_broadcast(msg.as_ptr(), msg.len() as u32) };
}

fn host_ark_command(id: &str, cmd: &str) {
    unsafe { ark_bus_command(id.as_ptr(), id.len() as u32, cmd.as_ptr(), cmd.len() as u32) };
}

#[unsafe(no_mangle)]
pub extern "C" fn run() {
    host_log("Sovereign Thermal Guard: Initiating scan...");

    let id = "ARK-SENSOR-01";
    let metric = "temperature";
    let mut out_buf = [0u8; 64];

    let bytes_read = unsafe {
        ark_read_sensor(
            id.as_ptr(), id.len() as u32,
            metric.as_ptr(), metric.len() as u32,
            out_buf.as_mut_ptr(), out_buf.len() as u32
        )
    };

    if bytes_read > 0 {
        let reading = String::from_utf8_lossy(&out_buf[..bytes_read as usize]);
        host_log(&format!("Current Reading: {}", reading));

        // Parse temperature (Format: "22.5 °C")
        if let Some(val_str) = reading.split_whitespace().next() {
            if let Ok(temp) = val_str.parse::<f32>() {
                if temp > 30.0 {
                    host_log("CRITICAL: High Temperature Detected! Triggering Cooling Protocol.");
                    host_ui_broadcast("⚠️ CRITICAL: High Temperature Detected! Activating Cooling Grid.");
                    host_ark_command("ARK-01", "ACTIVATE");
                } else {
                    host_log("Thermal levels within nominal range.");
                }
            }
        }
    } else {
        host_log("Error reading sensor data.");
    }

    let result = "Thermal scan complete.";
    unsafe { set_output(result.as_ptr(), result.len() as u32) };
}
