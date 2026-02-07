//! Rendering functions for ΩmegΑ's TUI (Sovereign Orchestrator Edition).
use crate::tui::app::{App, Mode, UiLayout};
use crate::events::{StatusState, TaskStatus};
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Paragraph, Wrap, List, ListItem, Gauge, Sparkline, BarChart, Table, Row, Cell, Scrollbar, ScrollbarOrientation, ScrollbarState};

// --- COLOR PALETTE ---
const NEON_CYAN: Color = Color::Rgb(0, 255, 255);
const NEON_PINK: Color = Color::Rgb(255, 0, 255);
const TERMINAL_GREEN: Color = Color::Rgb(50, 205, 50);
const WARNING_ORANGE: Color = Color::Rgb(255, 165, 0);
const SLATE_GRAY: Color = Color::Rgb(112, 128, 144);
const DARK_BG: Color = Color::Rgb(10, 10, 15);
const GLASS_BG: Color = Color::Rgb(8, 12, 20);

fn agent_symbol(name: &str) -> &'static str {
    match name {
        "Alpha" => "α",
        "Beta" => "β",
        "Gamma" => "γ",
        "Delta" => "δ",
        "Epsilon" => "ε",
        "Zeta" => "ζ",
        "Eta" => "η",
        "Theta" => "θ",
        "Iota" => "ι",
        "Kappa" => "κ",
        "Lambda" => "λ",
        "Mu" => "μ",
        "Nu" => "ν",
        "Xi" => "ξ",
        "Omicron" => "ο",
        "Pi" => "π",
        "Rho" => "ρ",
        "Sigma" => "σ",
        "Tau" => "τ",
        "Upsilon" => "υ",
        "Phi" => "φ",
        "Chi" => "χ",
        "Psi" => "ψ",
        "Omega" => "ω",
        _ => "•",
    }
}

fn pulse_color(step: usize, base: Color) -> Color {
    let (r, g, b) = match base {
        Color::Rgb(r, g, b) => (r as i32, g as i32, b as i32),
        _ => (180, 180, 180),
    };
    let phase = (step % 24) as i32;
    let wave = if phase <= 12 { phase } else { 24 - phase };
    let boost = wave * 4;
    let nr = (r + boost).clamp(0, 255) as u8;
    let ng = (g + boost).clamp(0, 255) as u8;
    let nb = (b + boost).clamp(0, 255) as u8;
    Color::Rgb(nr, ng, nb)
}

fn shimmer_spans(text: &str, step: usize, base: Color, glow: Color) -> Vec<Span<'_>> {
    let chars: Vec<char> = text.chars().collect();
    if chars.is_empty() {
        return vec![];
    }
    let len = chars.len() as i32;
    let pos = (step as i32) % len.max(1);
    let mut spans = Vec::with_capacity(chars.len());
    for (i, ch) in chars.iter().enumerate() {
        let dist = (i as i32 - pos).abs();
        let style = if dist == 0 {
            Style::default().fg(glow).add_modifier(Modifier::BOLD)
        } else if dist == 1 {
            Style::default().fg(glow)
        } else {
            Style::default().fg(base)
        };
        spans.push(Span::styled(ch.to_string(), style));
    }
    spans
}

fn spinner_glyph(step: usize) -> &'static str {
    if step % 2 == 0 { "α" } else { "ω" }
}

fn wrap_text(text: &str, width: usize) -> Vec<String> {
    if width == 0 {
        return vec![text.to_string()];
    }
    let mut out = Vec::new();
    let mut line = String::new();
    for word in text.split_whitespace() {
        if line.is_empty() {
            line.push_str(word);
            continue;
        }
        if line.len() + 1 + word.len() <= width {
            line.push(' ');
            line.push_str(word);
        } else {
            out.push(line);
            line = word.to_string();
        }
    }
    if !line.is_empty() {
        out.push(line);
    }
    if out.is_empty() {
        out.push(String::new());
    }
    out
}

pub fn ui(f: &mut Frame, app: &mut App) {
    let size = f.area();
    let background = Block::default().bg(DARK_BG);
    f.render_widget(background, size);

    match app.layout {
        UiLayout::Tui => {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(3),  // Header
                    Constraint::Min(3),     // Main Body
                    Constraint::Length(3),  // Footer
                ])
                .split(size);

            draw_header(f, app, chunks[0]);
            draw_body(f, app, chunks[1]);
            draw_input(f, app, chunks[2]);
        }
        UiLayout::Cli => {
            draw_cli_layout(f, app, size);
        }
    }
}

fn draw_cli_layout(f: &mut Frame, app: &mut App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Header
            Constraint::Length(5),  // HUD
            Constraint::Min(6),     // Chat
            Constraint::Length(3),  // Agents strip
            Constraint::Length(3),  // Input
        ])
        .split(area);

    draw_header(f, app, chunks[0]);
    draw_hud(f, app, chunks[1]);
    draw_output(f, app, chunks[2]);
    draw_agents_strip(f, app, chunks[3]);
    draw_input(f, app, chunks[4]);
    draw_task_overlay(f, app, area);
}

fn draw_header(f: &mut Frame, app: &App, area: Rect) {
    let layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(25),
            Constraint::Percentage(50),
            Constraint::Percentage(25),
        ])
        .split(area);

    let brand_color = if app.status == StatusState::Working { NEON_PINK } else { NEON_CYAN };
    let branding = Line::from(vec![
        Span::styled(" ⌬ ", Style::default().fg(brand_color).add_modifier(Modifier::BOLD)),
        Span::styled(format!("{}", app.profile.assistant_name), Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
        Span::styled(" SYSTEM", Style::default().fg(SLATE_GRAY)),
    ]);
    f.render_widget(
        Paragraph::new(branding).block(
            Block::default()
                .borders(Borders::BOTTOM)
                .border_style(Style::default().fg(SLATE_GRAY))
        ),
        layout[0],
    );

    let sparkline = Sparkline::default()
        .block(
            Block::default()
                .title(" NEURAL PULSE ")
                .title_style(Style::default().fg(SLATE_GRAY))
                .borders(Borders::BOTTOM)
                .border_style(Style::default().fg(SLATE_GRAY))
        )
        .data(&app.metrics.load)
        .style(Style::default().fg(brand_color));
    f.render_widget(sparkline, layout[1]);

    let right_text = Line::from(vec![
        Span::styled(format!(" MODE: {} ", app.mode), Style::default().fg(brand_color).add_modifier(Modifier::BOLD)),
        Span::styled(format!(" {} ", spinner_glyph(app.spinner_index)), Style::default().fg(NEON_CYAN)),
    ]);
    f.render_widget(
        Paragraph::new(right_text)
            .alignment(Alignment::Right)
            .block(
                Block::default()
                    .borders(Borders::BOTTOM)
                    .border_style(Style::default().fg(SLATE_GRAY))
            ),
        layout[2],
    );
}

fn draw_hud(f: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(pulse_color(app.spinner_index, NEON_CYAN)))
        .title(Span::styled(" STATUS HUD ", Style::default().fg(NEON_CYAN)))
        .style(Style::default().bg(GLASS_BG));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(35), Constraint::Percentage(30)])
        .split(inner);

    let sparkline = Sparkline::default()
        .data(&app.metrics.load)
        .style(Style::default().fg(NEON_CYAN))
        .block(Block::default().title(" CPU PULSE ").borders(Borders::NONE));
    f.render_widget(sparkline, cols[0]);

    let mem = (app.metrics.memory_used * 100.0).round() as u16;
    let gauge = Gauge::default()
        .block(Block::default().title(" MEMORY ").borders(Borders::NONE))
        .gauge_style(Style::default().fg(NEON_PINK))
        .ratio(app.metrics.memory_used as f64)
        .label(format!("{}%", mem));
    f.render_widget(gauge, cols[1]);

    let status = Line::from(vec![
        Span::styled("LINK ", Style::default().fg(SLATE_GRAY)),
        Span::styled("OK ", Style::default().fg(TERMINAL_GREEN)),
        Span::styled("· ", Style::default().fg(SLATE_GRAY)),
        Span::styled("TOOLS ", Style::default().fg(SLATE_GRAY)),
        Span::styled("ARMED ", Style::default().fg(NEON_CYAN)),
        Span::styled("· ", Style::default().fg(SLATE_GRAY)),
        Span::styled("SYNC ", Style::default().fg(SLATE_GRAY)),
        Span::styled("LIVE", Style::default().fg(NEON_PINK)),
    ]);
    let paragraph = Paragraph::new(status)
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::NONE));
    f.render_widget(paragraph, cols[2]);
}

fn draw_body(f: &mut Frame, app: &mut App, area: Rect) {
    let constraints = match app.mode {
        Mode::Focus => vec![Constraint::Percentage(20), Constraint::Percentage(80)],
        Mode::Ops => vec![Constraint::Percentage(20), Constraint::Percentage(50), Constraint::Percentage(30)],
        Mode::Showcase => vec![Constraint::Percentage(30), Constraint::Percentage(70)],
    };

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints(constraints)
        .split(area);

    draw_agents(f, app, chunks[0]);
    draw_output(f, app, chunks[1]);
    
    if app.mode == Mode::Ops && chunks.len() > 2 {
        draw_satellite_feed(f, app, chunks[2]);
    } else if app.mode != Mode::Focus && chunks.len() > 2 {
        draw_diagnostics_panel(f, app, chunks[2]);
    }
}

fn draw_agents(f: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(SLATE_GRAY))
        .title(Span::styled(" SWARM NODES ", Style::default().fg(NEON_CYAN)));
    
    let mut items: Vec<ListItem> = Vec::new();
    for agent in &app.agents {
        let symbol = agent_symbol(&agent.name);
        let is_active = agent.status != StatusState::Ready;
        let glow = if is_active {
            pulse_color(app.spinner_index, NEON_CYAN)
        } else {
            SLATE_GRAY
        };
        let name_color = if is_active {
            pulse_color(app.spinner_index + 6, NEON_PINK)
        } else {
            Color::White
        };

        items.push(ListItem::new(vec![
            Line::from(vec![
                Span::styled(
                    format!("{} ", symbol),
                    Style::default()
                        .fg(glow)
                        .bg(if is_active { Color::Rgb(15, 10, 20) } else { DARK_BG })
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    format!("{}~", agent.name),
                    Style::default()
                        .fg(name_color)
                        .bg(if is_active { Color::Rgb(15, 10, 20) } else { DARK_BG })
                        .add_modifier(Modifier::BOLD),
                ),
            ]),
            Line::from(vec![
                Span::raw("  "),
                Span::styled(
                    format!("{} · {}", agent.role, agent.status),
                    Style::default().fg(SLATE_GRAY).add_modifier(Modifier::ITALIC),
                ),
            ]),
            Line::raw(""),
        ]));
    }

    f.render_widget(List::new(items).block(block), area);
}

fn draw_output(f: &mut Frame, app: &mut App, area: Rect) {
    let border_color = if app.status == StatusState::Working { NEON_PINK } else { SLATE_GRAY };
    let scroll_indicator = if app.auto_scroll { " AUTO " } else { " MANUAL " };
    
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(border_color))
        .title(vec![
            Span::styled(" CHAT ", Style::default().fg(Color::White)),
            Span::styled(scroll_indicator, Style::default().fg(WARNING_ORANGE).add_modifier(Modifier::BOLD)),
        ]);
    let block = block.style(Style::default().bg(GLASS_BG));
    
    let inner_area = block.inner(area);
    f.render_widget(block, area);
    let output_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(1), Constraint::Length(1)])
        .split(inner_area);
    let content_area = output_chunks[0];
    let scrollbar_area = output_chunks[1];

    let mut lines: Vec<Line> = Vec::new();
    for msg in &app.messages {
        let label = if msg.from_user { "YOU" } else { &app.profile.assistant_name };
        let accent = if msg.from_user { NEON_PINK } else { NEON_CYAN };
        let text_color = if msg.from_user { Color::White } else { Color::Rgb(200, 200, 200) };
        let width = content_area.width.saturating_sub(4) as usize;
        let wrapped = wrap_text(&msg.text, width.max(1));

        lines.push(Line::from(vec![
            Span::styled("╭─ ", Style::default().fg(SLATE_GRAY)),
            Span::styled(format!("{} ", label), Style::default().fg(accent).add_modifier(Modifier::BOLD)),
            Span::styled(format!("{} ", spinner_glyph(app.spinner_index)), Style::default().fg(accent)),
        ]));
        for line in wrapped {
            lines.push(Line::from(vec![
                Span::styled("│ ", Style::default().fg(SLATE_GRAY)),
                Span::styled(line, Style::default().fg(text_color)),
            ]));
        }
        lines.push(Line::from(vec![
            Span::styled("╰────────────────────────────────────────", Style::default().fg(SLATE_GRAY)),
        ]));
        lines.push(Line::raw(""));
    }

    // Dispatch prompt (confirmation)
    if let Some(prompt) = &app.dispatch_prompt {
        lines.push(Line::from(vec![
            Span::styled("⟡ ", Style::default().fg(NEON_CYAN).add_modifier(Modifier::BOLD)),
            Span::styled("Dispatch request pending", Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
        ]));
        lines.push(Line::from(Span::styled(
            format!("Proposed: {}. Reply 'yes' or 'no'.", prompt.summary),
            Style::default().fg(SLATE_GRAY),
        )));
        lines.push(Line::raw(""));
    }

    // Task cards (ASCII box style) embedded in chat feed
    if !app.tasks.is_empty() {
        lines.push(Line::from(Span::styled(
            "— Active Operations —",
            Style::default().fg(SLATE_GRAY).add_modifier(Modifier::ITALIC),
        )));
        lines.push(Line::raw(""));
        for task in &app.tasks {
            let symbol = agent_symbol(&task.name);
            let status = match task.status {
                TaskStatus::Pending => ("PENDING", WARNING_ORANGE),
                TaskStatus::Running => ("RUNNING", NEON_PINK),
                TaskStatus::Done => ("DONE", TERMINAL_GREEN),
                TaskStatus::Failed => ("FAILED", NEON_PINK),
            };
            lines.push(Line::from(vec![
                Span::styled("┌─ ", Style::default().fg(SLATE_GRAY)),
                Span::styled(format!("{} {}~ ", symbol, task.name), Style::default().fg(NEON_CYAN).add_modifier(Modifier::BOLD)),
                Span::styled(format!("[{}]", status.0), Style::default().fg(status.1).add_modifier(Modifier::BOLD)),
            ]));
            lines.push(Line::from(vec![
                Span::styled("│ ", Style::default().fg(SLATE_GRAY)),
                Span::styled("Task: ", Style::default().fg(SLATE_GRAY)),
                Span::styled(&task.detail, Style::default().fg(Color::Rgb(200, 200, 200))),
            ]));
            lines.push(Line::from(vec![
                Span::styled("└────────────────────────────────────────", Style::default().fg(SLATE_GRAY)),
            ]));
            lines.push(Line::raw(""));
        }
    }

    if app.status != StatusState::Ready {
        let shimmer = Line::from(shimmer_spans(
            " α ω synthesizing … ",
            app.spinner_index / 2,
            SLATE_GRAY,
            NEON_CYAN,
        ));
        lines.push(Line::raw(""));
        lines.push(shimmer);
    }

    // Wrap height estimation (simple but effective for scrolling)
    let mut total_rendered_lines = 0;
    for line in &lines {
        let width = line.width() as u16;
        if width == 0 {
            total_rendered_lines += 1;
        } else {
            total_rendered_lines += (width + content_area.width - 1) / content_area.width.max(1);
        }
    }

    let visible_height = content_area.height;
    
    if app.auto_scroll && total_rendered_lines > visible_height {
        app.scroll = total_rendered_lines - visible_height;
    }

    // Clamp scroll to valid range
    app.scroll = app.scroll.min(total_rendered_lines.saturating_sub(visible_height));

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((app.scroll, 0));

    f.render_widget(paragraph, content_area);

    // Render scrollbar
    if total_rendered_lines > visible_height {
        let scrollbar = Scrollbar::default()
            .orientation(ScrollbarOrientation::VerticalRight)
            .begin_symbol(Some("▲"))
            .end_symbol(Some("▼"))
            .track_symbol(Some("│"))
            .thumb_symbol("┃");
        
        let mut scrollbar_state = ScrollbarState::new(total_rendered_lines as usize)
            .position(app.scroll as usize);

        f.render_stateful_widget(scrollbar, scrollbar_area, &mut scrollbar_state);
    }
}

fn draw_agents_strip(f: &mut Frame, app: &mut App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(SLATE_GRAY))
        .title(Span::styled(" CREW ", Style::default().fg(NEON_CYAN)));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let count = app.agents.len().max(1);
    let window = 8usize.min(count);
    let start = (app.spinner_index / 10) % count;
    let mut spans: Vec<Span> = Vec::new();
    for i in 0..window {
        let idx = (start + i) % count;
        let agent = &app.agents[idx];
        let symbol = agent_symbol(&agent.name);
        let is_active = agent.status != StatusState::Ready;
        let glow = if is_active {
            pulse_color(app.spinner_index + i, NEON_CYAN)
        } else {
            SLATE_GRAY
        };
        let name_color = if is_active {
            pulse_color(app.spinner_index + i + 6, NEON_PINK)
        } else {
            Color::White
        };
        spans.push(Span::styled(
            format!("{} {}~", symbol, agent.name),
            Style::default().fg(name_color).add_modifier(Modifier::BOLD),
        ));
        spans.push(Span::styled("  •  ", Style::default().fg(glow)));
    }
    if spans.is_empty() {
        spans.push(Span::styled("No crew loaded.", Style::default().fg(SLATE_GRAY)));
    }
    let line = Line::from(spans);
    let paragraph = Paragraph::new(line).alignment(Alignment::Center);
    f.render_widget(paragraph, inner);
}

fn draw_task_overlay(f: &mut Frame, app: &mut App, area: Rect) {
    let running_tasks: Vec<&crate::tui::app::TaskCard> = app
        .tasks
        .iter()
        .filter(|t| t.status == TaskStatus::Running)
        .collect();
    if running_tasks.is_empty() {
        return;
    }

    let max_shells = 3usize.min(running_tasks.len());
    let popup_width = area.width.saturating_sub(6).min(72);
    let popup_height = 9u16.min(area.height.saturating_sub(4));
    let total_height = popup_height * max_shells as u16 + (max_shells.saturating_sub(1) as u16 * 1);
    let top = area.y + (area.height.saturating_sub(total_height)) / 2;

    for (i, task) in running_tasks.iter().take(max_shells).enumerate() {
        let popup = Rect {
            x: area.x + (area.width.saturating_sub(popup_width)) / 2,
            y: top + i as u16 * (popup_height + 1),
            width: popup_width,
            height: popup_height,
        };

        // Soft glow frame behind the main shell
        let glow = Rect {
            x: popup.x.saturating_sub(1),
            y: popup.y.saturating_sub(1),
            width: (popup.width + 2).min(area.width.saturating_sub(popup.x.saturating_sub(area.x))),
            height: (popup.height + 2).min(area.height.saturating_sub(popup.y.saturating_sub(area.y))),
        };
        let glow_block = Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(pulse_color(app.spinner_index, NEON_CYAN)))
            .style(Style::default().bg(Color::Rgb(6, 8, 16)));
        f.render_widget(glow_block, glow);

        let block = Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(NEON_PINK))
            .title(Span::styled(" TASK SHELL ", Style::default().fg(Color::White)))
            .style(Style::default().bg(Color::Rgb(8, 8, 14)));
        let inner = block.inner(popup);
        f.render_widget(block, popup);

        let mut lines: Vec<Line> = Vec::new();
        lines.push(Line::from(vec![
            Span::styled(format!("{} {}~", agent_symbol(&task.name), task.name), Style::default().fg(NEON_CYAN).add_modifier(Modifier::BOLD)),
            Span::styled("  RUNNING", Style::default().fg(NEON_PINK).add_modifier(Modifier::BOLD)),
        ]));
        lines.push(Line::from(Span::styled(&task.detail, Style::default().fg(Color::Rgb(200, 200, 200)))));
        lines.push(Line::from(shimmer_spans(
            " ▸ streaming output … ",
            app.spinner_index / 2,
            SLATE_GRAY,
            NEON_CYAN,
        )));

        let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false });
        f.render_widget(paragraph, inner);
    }
}

fn draw_satellite_feed(f: &mut Frame, app: &App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(10), 
            Constraint::Min(3),    
        ])
        .split(area);

    let header_cells = ["ID", "ENTITY", "SIG", "STATUS"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(NEON_CYAN).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).bottom_margin(1);

    let rows: Vec<Row> = app.entities.iter().map(|e| {
        let sig_color = if e.signal_strength > 80 { TERMINAL_GREEN } else if e.signal_strength > 40 { WARNING_ORANGE } else { NEON_PINK };
        Row::new(vec![
            Cell::from(e.id.clone()),
            Cell::from(e.name.clone()),
            Cell::from(format!("{}%", e.signal_strength)).style(Style::default().fg(sig_color)),
            Cell::from(e.status.clone()).style(Style::default().fg(if e.status == "ONLINE" || e.status == "STABLE" { TERMINAL_GREEN } else { WARNING_ORANGE })),
        ]).style(Style::default().fg(SLATE_GRAY))
    }).collect();

    let table = Table::new(rows, [
        Constraint::Length(8),
        Constraint::Min(15),
        Constraint::Length(5),
        Constraint::Length(10),
    ])
    .header(header)
    .block(Block::default().borders(Borders::ALL).title(" SATELLITE FEED "));
    f.render_widget(table, chunks[0]);

    let mut signal_symbols = String::new();
    for e in &app.entities {
        if e.signal_strength > 50 { signal_symbols.push_str("⧉ "); }
        else { signal_symbols.push_str("⧈ "); }
    }

    let signal_map = vec![
        Line::from(vec![
            Span::styled(" SIGNAL MAP: ", Style::default().fg(NEON_PINK)),
            Span::styled(signal_symbols, Style::default().fg(TERMINAL_GREEN)),
        ]),
        Line::from(format!(" UPLINK: {}", if app.entities.is_empty() { "Searching..." } else { "Synchronized" })),
        Line::from(format!(" NODES: {}", app.entities.len())),
    ];
    f.render_widget(Paragraph::new(signal_map).block(Block::default().borders(Borders::ALL)), chunks[1]);
}

fn draw_diagnostics_panel(f: &mut Frame, app: &App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), 
            Constraint::Length(10), 
            Constraint::Min(3),    
        ])
        .split(area);

    let gauge = Gauge::default()
        .block(Block::default().title(" CONTEXT SYNAPSE ").title_style(Style::default().fg(NEON_CYAN)))
        .gauge_style(Style::default().fg(NEON_CYAN).bg(DARK_BG).add_modifier(Modifier::ITALIC))
        .percent((app.metrics.memory_used * 100.0) as u16)
        .label(format!("{:.1}%", app.metrics.memory_used * 100.0));
    f.render_widget(gauge, chunks[0]);

    let bar_data = [("ALPHA", 65), ("BETA", 42), ("GAMMA", 15)];
    let barchart = BarChart::default()
        .block(Block::default().title(" TRAJECTORIES ").borders(Borders::ALL).border_style(Style::default().fg(SLATE_GRAY)))
        .data(&bar_data)
        .bar_width(5)
        .bar_style(Style::default().fg(NEON_PINK))
        .value_style(Style::default().fg(Color::Black).bg(NEON_PINK).add_modifier(Modifier::BOLD));
    f.render_widget(barchart, chunks[1]);

    let vitals = vec![
        Line::from(vec![Span::styled(" CORE: ", Style::default().fg(SLATE_GRAY)), Span::styled("STABLE", Style::default().fg(TERMINAL_GREEN))]),
        Line::from(vec![Span::styled(" VEC: ", Style::default().fg(SLATE_GRAY)), Span::styled("INDEXED", Style::default().fg(NEON_CYAN))]),
        Line::from(vec![Span::styled(" WASM: ", Style::default().fg(SLATE_GRAY)), Span::styled("READY", Style::default().fg(NEON_PINK))]),
    ];
    f.render_widget(Paragraph::new(vitals).block(Block::default().borders(Borders::ALL).title(" VITALS ")), chunks[2]);
}

fn draw_input(f: &mut Frame, app: &App, area: Rect) {
    let border_color = if app.input.starts_with('/') { WARNING_ORANGE } else { NEON_CYAN };
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(border_color))
        .title(Span::styled(" COMMAND ", Style::default().fg(Color::White)));
    
    let inner = block.inner(area);
    f.render_widget(block, area);

    let status_symbol = match app.status {
        StatusState::Working | StatusState::Synthesising => "ω",
        _ => "α",
    };
    let prefix_text = if app.input.starts_with('/') {
        format!("{} /", status_symbol)
    } else {
        format!("{} > ", status_symbol)
    };
    let input_line = Line::from(vec![
        Span::styled(prefix_text, Style::default().fg(NEON_PINK).add_modifier(Modifier::BOLD)),
        Span::styled(&app.input, Style::default().fg(Color::White)),
        Span::styled("█", Style::default().fg(NEON_CYAN).add_modifier(Modifier::RAPID_BLINK)),
    ]);

    f.render_widget(Paragraph::new(input_line), inner);
}
