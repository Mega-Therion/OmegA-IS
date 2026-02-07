use colored::*;
use indicatif::{ProgressBar, ProgressStyle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

// Miami Vice / Synthwave Color Palette
pub struct ViceColors;

impl ViceColors {
    pub fn hot_pink(text: &str) -> ColoredString {
        text.truecolor(244, 114, 182) // Cyber Magenta
    }

    pub fn cyan(text: &str) -> ColoredString {
        text.truecolor(138, 180, 248) // Gemini Blue
    }

    pub fn purple(text: &str) -> ColoredString {
        text.truecolor(168, 85, 247) // Modern Purple
    }

    pub fn yellow(text: &str) -> ColoredString {
        text.truecolor(253, 224, 71) // Soft Pastel Yellow
    }

    pub fn magenta(text: &str) -> ColoredString {
        text.truecolor(217, 70, 239) // Electric Fuchsia
    }

    pub fn neon_green(text: &str) -> ColoredString {
        text.truecolor(52, 211, 153) // Soft Emerald
    }

    pub fn orange(text: &str) -> ColoredString {
        text.truecolor(251, 146, 60) // Cyber Orange
    }
}

fn shimmer_text(text: &str) -> String {
    let palette = [
        (255, 0, 255),   // Hot pink
        (0, 255, 255),   // Electric cyan
        (150, 0, 255),   // Deep purple
        (50, 255, 180),  // Neon mint
        (255, 200, 0),   // Neon amber
    ];
    let offset = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| (d.as_millis() / 120) as usize)
        .unwrap_or(0);
    let mut out = String::new();
    for (i, ch) in text.chars().enumerate() {
        let (r, g, b) = palette[(i + offset) % palette.len()];
        out.push_str(&ch.to_string().truecolor(r, g, b).bold().to_string());
    }
    out
}

pub fn print_banner() {
    println!();
    let width = 78;
    let border = format!("+{}+", "-".repeat(width));
    let line = |text: &str| format!("|{:^width$}|", text, width = width);

    println!("{}", ViceColors::cyan(&border));
    println!("{}", ViceColors::cyan(&line("")));
    println!("{}", ViceColors::magenta(&line("OMEGA MULTI-AGENT AI SYSTEM")));
    println!("{}", ViceColors::cyan(&line("")));
    println!("{}", ViceColors::yellow(&line("CLI MODE")));
    println!("{}", ViceColors::cyan(&line("")));
    println!("{}", ViceColors::purple(&line("[ VERSION 1.0.0 ]  [ POWERED BY OLLAMA ]")));
    println!("{}", ViceColors::cyan(&line("")));
    println!("{}", ViceColors::cyan(&border));
    println!();
}

pub fn print_interactive_header() {
    println!();
    println!("{}", ViceColors::magenta("╔═══════════════════════════════════════════════════════════════════════════╗").bold());
    println!("{}", ViceColors::magenta("║                                                                           ║"));
    println!("{}{}{}",
        ViceColors::magenta("║                  "),
        shimmer_text("◢◤◢◤ I N T E R A C T I V E  M O D E ◢◤◢◤"),
        ViceColors::magenta("                 ║")
    );
    println!("{}", ViceColors::magenta("║                                                                           ║"));
    println!("{}", ViceColors::magenta("╚═══════════════════════════════════════════════════════════════════════════╝"));
    println!();

    // Commands with cyberpunk styling
    println!("  {}  {}", ViceColors::hot_pink("▸").bold(), ViceColors::cyan("Type your mission and press ENTER"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("agents"), ViceColors::cyan("- Show agent roster"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("status"), ViceColors::cyan("- Check system health"));
    println!("  {}  {} {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("stream on/off"), ViceColors::cyan("-"), ViceColors::neon_green("Watch agents think!"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("help"), ViceColors::cyan("- Show all commands"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("exit"), ViceColors::cyan("- Shutdown Omega"));
    println!();

    // Cyber grid separator
    println!("{}", ViceColors::purple("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    println!();
}

pub fn print_mission_header(mission: &str) {
    println!();
    println!("{}", ViceColors::magenta("═══════════════════════════════════════════════════════════════════════════"));
    println!();
    println!("{}  {}",
        ViceColors::hot_pink("◆ MISSION ◆").bold(),
        ViceColors::cyan(mission)
    );
    println!();
    println!("{}", ViceColors::magenta("═══════════════════════════════════════════════════════════════════════════"));
    println!();
}

pub fn print_mission_complete() {
    println!();
    println!("{}", ViceColors::neon_green("═══════════════════════════════════════════════════════════════════════════"));
    println!();
    println!("{}  {}",
        ViceColors::neon_green("⚡").bold(),
        ViceColors::hot_pink("M I S S I O N   C O M P L E T E").bold()
    );
    println!();
    println!("{}", ViceColors::neon_green("═══════════════════════════════════════════════════════════════════════════"));
    println!();
}

pub fn print_orchestrator_planning() {
    println!("{}  {}",
        ViceColors::purple("▸").bold(),
        ViceColors::cyan("[ ORCHESTRATOR ] Analyzing mission and creating plan...").bold()
    );
    println!();
}

pub fn print_orchestrator_plan(plan: &str) {
    println!("{}  {}",
        ViceColors::yellow("◆").bold(),
        ViceColors::purple("[ MISSION PLAN ]").bold()
    );
    println!();
    println!("{}", ViceColors::cyan(plan));
    println!();
}

pub fn print_agent_start(name: &str, role: &str) {
    println!("{}  {} {} {} {}",
        ViceColors::hot_pink("►").bold(),
        ViceColors::yellow(&format!("[ AGENT: {} ]", name)).bold(),
        ViceColors::cyan("//"),
        ViceColors::magenta(role),
        ViceColors::cyan("// INITIATED")
    );
}

pub fn print_agent_complete(name: &str) {
    println!("{}  {} {}",
        ViceColors::neon_green("✓").bold(),
        ViceColors::yellow(&format!("[ AGENT: {} ]", name)).bold(),
        ViceColors::neon_green("COMPLETE")
    );
    println!();
}

pub fn print_synthesizing() {
    println!("{}  {}",
        ViceColors::magenta("◇").bold(),
        ViceColors::cyan("[ ORCHESTRATOR ] Synthesizing final result...").bold()
    );
    println!();
}

pub fn print_status_box(model: &str, url: &str, online: bool) {
    println!();
    println!("{}", ViceColors::cyan("╔═══════════════════════════════════════════════════════════════════════════╗"));
    println!("{}", ViceColors::cyan("║                                                                           ║"));
    println!("{}{}{}",
        ViceColors::cyan("║                        "),
        ViceColors::hot_pink("◆ S Y S T E M  S T A T U S ◆").bold(),
        ViceColors::cyan("                       ║")
    );
    println!("{}", ViceColors::cyan("║                                                                           ║"));
    println!("{}", ViceColors::cyan("╠═══════════════════════════════════════════════════════════════════════════╣"));
    println!("{}", ViceColors::cyan("║                                                                           ║"));

    // Model
    println!("{}  {}  {}{}",
        ViceColors::cyan("║    "),
        ViceColors::yellow("▸ MODEL").bold(),
        ViceColors::magenta(model),
        ViceColors::cyan("                                                      ║")
    );

    // URL
    let url_display = if url.len() > 45 {
        format!("{}...", &url[..42])
    } else {
        url.to_string()
    };

    let padding = 60 - url_display.len();
    println!("{}  {}  {}{}{}",
        ViceColors::cyan("║    "),
        ViceColors::yellow("▸ ENDPOINT").bold(),
        ViceColors::magenta(&url_display),
        " ".repeat(padding),
        ViceColors::cyan("║")
    );

    // Connection status
    let (_status_icon, status_text, status_color) = if online {
        ("✓", "ONLINE", ViceColors::neon_green("ONLINE"))
    } else {
        ("✗", "OFFLINE", ViceColors::hot_pink("OFFLINE"))
    };

    let padding = 58 - status_text.len();
    println!("{}  {}  {}{}{}",
        ViceColors::cyan("║    "),
        ViceColors::yellow("▸ CONNECTION").bold(),
        status_color.bold(),
        " ".repeat(padding),
        ViceColors::cyan("║")
    );

    println!("{}", ViceColors::cyan("║                                                                           ║"));
    println!("{}", ViceColors::cyan("╚═══════════════════════════════════════════════════════════════════════════╝"));
    println!();
}

pub fn print_help() {
    println!();
    println!("{}", ViceColors::magenta("╔═══════════════════════════════════════════════════════════════════════════╗"));
    println!("{}", ViceColors::magenta("║                                                                           ║"));
    println!("{}{}{}",
        ViceColors::magenta("║                          "),
        ViceColors::cyan("◆ C O M M A N D S ◆").bold(),
        ViceColors::magenta("                          ║")
    );
    println!("{}", ViceColors::magenta("║                                                                           ║"));
    println!("{}", ViceColors::magenta("╚═══════════════════════════════════════════════════════════════════════════╝"));
    println!();

    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("agents / rollcall").bold(), ViceColors::cyan("- Show all available agents"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("status").bold(), ViceColors::cyan("- Check system health and connection"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("stream on/off").bold(), ViceColors::cyan("- Toggle live thinking display"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("help").bold(), ViceColors::cyan("- Display this help message"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("exit / quit").bold(), ViceColors::cyan("- Exit interactive mode"));
    println!("  {}  {} {}", ViceColors::hot_pink("▸").bold(), ViceColors::yellow("<mission>").bold(), ViceColors::cyan("- Type any mission to execute"));
    println!();
}

pub fn print_agents_roster(agents: &[(String, String, String)]) {
    println!();
    println!("{}", ViceColors::cyan("╔═══════════════════════════════════════════════════════════════════════════╗"));
    println!("{}", ViceColors::cyan("║                                                                           ║"));
    println!("{}{}{}",
        ViceColors::cyan("║                       "),
        ViceColors::hot_pink("◆ A G E N T  R O S T E R ◆").bold(),
        ViceColors::cyan("                      ║")
    );
    println!("{}", ViceColors::cyan("║                                                                           ║"));
    println!("{}", ViceColors::cyan("╠═══════════════════════════════════════════════════════════════════════════╣"));
    println!("{}", ViceColors::cyan("║                                                                           ║"));

    for (name, role, _) in agents {
        let display_line = format!("║      ►  {} // {}", name, role);
        let padding = 75 - display_line.len();
        println!("{}  {} {} {}{}{}",
            ViceColors::cyan("║      "),
            ViceColors::hot_pink("►").bold(),
            ViceColors::yellow(name).bold(),
            ViceColors::cyan("//"),
            ViceColors::magenta(role),
            ViceColors::cyan(&format!("{}║", " ".repeat(padding)))
        );
    }

    println!("{}", ViceColors::cyan("║                                                                           ║"));
    println!("{}{}{}",
        ViceColors::cyan("║                    "),
        ViceColors::neon_green(&format!("[ {} AGENTS ACTIVE ]", agents.len())).bold(),
        ViceColors::cyan("                    ║")
    );
    println!("{}", ViceColors::cyan("║                                                                           ║"));
    println!("{}", ViceColors::cyan("╚═══════════════════════════════════════════════════════════════════════════╝"));
    println!();
}

pub fn print_shutdown() {
    println!();
    println!("{}", ViceColors::magenta("═══════════════════════════════════════════════════════════════════════════"));
    println!();
    println!("{}  {}",
        ViceColors::hot_pink("◆").bold(),
        ViceColors::cyan("S H U T T I N G  D O W N  O M E G A . . .").bold()
    );
    println!();
    println!("{}", ViceColors::magenta("═══════════════════════════════════════════════════════════════════════════"));
    println!();
}

pub fn get_prompt() -> String {
    format!("{} ", shimmer_text("omega▸"))
}

pub fn print_error(message: &str) {
    println!("{}  {} {}",
        ViceColors::hot_pink("✗").bold(),
        ViceColors::yellow("[ ERROR ]").bold(),
        ViceColors::cyan(message)
    );
}

pub fn print_success(message: &str) {
    println!("{}  {} {}",
        ViceColors::neon_green("✓").bold(),
        ViceColors::yellow("[ SUCCESS ]").bold(),
        ViceColors::cyan(message)
    );
}

// Thinking/Loading Spinners
pub fn create_thinking_spinner(message: &str) -> ProgressBar {
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .tick_strings(&[
                "⚡", "◆", "◇", "◆", "⚡", "►", "▸", "►"
            ])
            .template("{spinner:.magenta.bold} {msg:.cyan}")
            .unwrap()
    );
    pb.set_message(message.to_string());
    pb.enable_steady_tick(Duration::from_millis(100));
    pb
}

pub fn create_agent_spinner(agent_name: &str, action: &str) -> ProgressBar {
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .tick_strings(&[
                "◐", "◓", "◑", "◒"
            ])
            .template(&format!("{} {} {{spinner:.hot_pink.bold}} {{msg:.cyan}}",
                ViceColors::yellow(&format!("[ {} ]", agent_name)).bold(),
                ViceColors::cyan("//").to_string()
            ))
            .unwrap()
    );
    pb.set_message(action.to_string());
    pb.enable_steady_tick(Duration::from_millis(80));
    pb
}

pub fn create_orchestrator_spinner(message: &str) -> ProgressBar {
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .tick_strings(&[
                "▹▹▹▹▹", "▸▹▹▹▹", "▹▸▹▹▹", "▹▹▸▹▹", "▹▹▹▸▹", "▹▹▹▹▸"
            ])
            .template(&format!("{} {{spinner:.purple.bold}} {{msg:.cyan}}",
                ViceColors::magenta("[ ORCHESTRATOR ]").bold().to_string()
            ))
            .unwrap()
    );
    pb.set_message(message.to_string());
    pb.enable_steady_tick(Duration::from_millis(120));
    pb
}

pub fn print_streaming_start(source: &str) {
    println!("\n{}  {} {}",
        ViceColors::hot_pink("►").bold(),
        ViceColors::yellow(&format!("[ {} ]", source)).bold(),
        ViceColors::cyan("STREAMING RESPONSE...")
    );
    print!("{}", ViceColors::cyan(""));
}

pub fn print_streaming_chunk(chunk: &str) {
    print!("{}", chunk);
    use std::io::{self, Write};
    io::stdout().flush().unwrap();
}

pub fn print_streaming_complete() {
    println!("\n");
}
