//! Rendering functions for ΩmegΑ's TUI (Sovereign Orchestrator Edition).
use crate::tui::app::{App, Mode};
use crate::events::StatusState;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Paragraph, Wrap, List, ListItem, Gauge, Sparkline, BarChart, Table, Row, Cell, Scrollbar, ScrollbarOrientation, ScrollbarState};

// --- COLOR PALETTE ---
const NEON_CYAN: Color = Color::Rgb(0, 255, 255);
const NEON_PINK: Color = Color::Rgb(255, 0, 255);
const TERMINAL_GREEN: Color = Color::Rgb(50, 205, 50);
const WARNING_ORANGE: Color = Color::Rgb(255, 165, 0);
const SLATE_GRAY: Color = Color::Rgb(112, 128, 144);
const DARK_BG: Color = Color::Rgb(10, 10, 15);

pub fn ui(f: &mut Frame, app: &mut App) {
    let size = f.area();
    let background = Block::default().bg(DARK_BG);
    f.render_widget(background, size);

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
    f.render_widget(Paragraph::new(branding).block(Block::default().borders(Borders::BOTTOM)), layout[0]);

    let sparkline = Sparkline::default()
        .block(Block::default().title(" NEURAL PULSE ").title_style(Style::default().fg(SLATE_GRAY)))
        .data(&app.metrics.load)
        .style(Style::default().fg(brand_color));
    f.render_widget(sparkline, layout[1]);

    let right_text = Line::from(vec![
        Span::styled(format!(" MODE: {} ", app.mode), Style::default().fg(brand_color).add_modifier(Modifier::BOLD)),
    ]);
    f.render_widget(Paragraph::new(right_text).alignment(Alignment::Right).block(Block::default().borders(Borders::BOTTOM)), layout[2]);
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
        let (status_char, color) = match agent.status {
            StatusState::Ready => ("●", SLATE_GRAY),
            StatusState::Working => ("⚡", NEON_PINK),
            StatusState::Synthesising => ("⌬", NEON_CYAN),
        };

        items.push(ListItem::new(vec![
            Line::from(vec![
                Span::styled(format!("{} ", status_char), Style::default().fg(color)),
                Span::styled(&agent.name, Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
            ]),
            Line::from(vec![
                Span::raw("  "),
                Span::styled(&agent.role, Style::default().fg(SLATE_GRAY).add_modifier(Modifier::ITALIC)),
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
            Span::styled(" MISSION LOG ", Style::default().fg(Color::White)),
            Span::styled(scroll_indicator, Style::default().fg(WARNING_ORANGE).add_modifier(Modifier::BOLD)),
        ]);
    
    let inner_area = block.inner(area);
    f.render_widget(block, area);

    let mut lines: Vec<Line> = Vec::new();
    for msg in &app.messages {
        if msg.from_user {
            lines.push(Line::from(vec![
                Span::styled(format!("❯ {}: ", app.profile.pilot_name.to_uppercase()), Style::default().fg(NEON_PINK).add_modifier(Modifier::BOLD)),
                Span::styled(&msg.text, Style::default().fg(Color::White)),
            ]));
        } else {
            lines.push(Line::from(vec![
                Span::styled("Ω ", Style::default().fg(NEON_CYAN).add_modifier(Modifier::BOLD)),
            ]));
            for line in msg.text.lines() {
                lines.push(Line::from(Span::styled(format!("  {}", line), Style::default().fg(Color::Rgb(200, 200, 200)))));
            }
        }
        lines.push(Line::raw(""));
    }

    // Wrap height estimation (simple but effective for scrolling)
    let mut total_rendered_lines = 0;
    for line in &lines {
        let width = line.width() as u16;
        if width == 0 {
            total_rendered_lines += 1;
        } else {
            total_rendered_lines += (width + inner_area.width - 1) / inner_area.width.max(1);
        }
    }

    let visible_height = inner_area.height;
    
    if app.auto_scroll && total_rendered_lines > visible_height {
        app.scroll = total_rendered_lines - visible_height;
    }

    // Clamp scroll to valid range
    app.scroll = app.scroll.min(total_rendered_lines.saturating_sub(visible_height));

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((app.scroll, 0));

    f.render_widget(paragraph, inner_area);

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

        f.render_stateful_widget(
            scrollbar,
            area.inner(Margin { vertical: 1, horizontal: 0 }),
            &mut scrollbar_state,
        );
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

    let prefix_text = if app.input.starts_with('/') { "CMD > ".to_string() } else { format!("{} > ", app.profile.pilot_name.to_uppercase()) };
    let input_line = Line::from(vec![
        Span::styled(prefix_text, Style::default().fg(NEON_PINK).add_modifier(Modifier::BOLD)),
        Span::styled(&app.input, Style::default().fg(Color::White)),
        Span::styled("█", Style::default().fg(NEON_CYAN).add_modifier(Modifier::RAPID_BLINK)),
    ]);

    f.render_widget(Paragraph::new(input_line), inner);
}
