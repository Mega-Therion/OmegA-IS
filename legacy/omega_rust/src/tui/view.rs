//! Rendering functions for ΩmegΑ's TUI (Miami Vice Neon Edition).
use crate::tui::app::{App, Mode, Tab};
use crate::events::StatusState;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, BorderType, Paragraph, Wrap, List, ListItem, Gauge, BarChart, Table, Row, Cell, Scrollbar, ScrollbarOrientation, ScrollbarState, Tabs, canvas::{Canvas, Line as CanvasLine, Map, MapResolution, Circle}};
use serde::Deserialize;
use std::collections::HashMap;

// --- TRON / MIAMI VICE NEON COLOR PALETTE ---
const HOT_PINK: Color = Color::Rgb(255, 20, 147); // Sharper Pink
const ELECTRIC_CYAN: Color = Color::Rgb(0, 255, 255);
const DEEP_PURPLE: Color = Color::Rgb(130, 0, 255);
const NEON_MINT: Color = Color::Rgb(0, 255, 150);
const NEON_AMBER: Color = Color::Rgb(255, 170, 0);
const TRON_BLUE: Color = Color::Rgb(0, 100, 255);
const SOFT_BLUE: Color = Color::Rgb(30, 144, 255);
const LIME_GREEN: Color = Color::Rgb(0, 255, 0);
const SLATE_GRAY: Color = Color::Rgb(40, 50, 70);
const DARK_BG: Color = Color::Rgb(2, 2, 10); // Smoky Obsidian Transparency Feel
const GRID_LINE: Color = Color::Rgb(15, 20, 35); // Subtle Tron Grid

fn pulse_color(app: &App, a: Color, b: Color) -> Color {
    if app.spinner_index % 12 < 6 { a } else { b }
}

fn shimmer_line<'a>(text: &'a str, app: &App) -> Line<'a> {
    let palette = [HOT_PINK, ELECTRIC_CYAN, DEEP_PURPLE, NEON_MINT, NEON_AMBER];
    let offset = app.spinner_index % palette.len();
    let spans: Vec<Span<'a>> = text
        .chars()
        .enumerate()
        .map(|(i, ch)| {
            let color = palette[(i + offset) % palette.len()];
            Span::styled(ch.to_string(), Style::default().fg(color).add_modifier(Modifier::BOLD))
        })
        .collect();
    Line::from(spans)
}

#[derive(Debug, Clone, Deserialize)]
struct GeoNode {
    name: String,
    lat: f64,
    lon: f64,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum LinkConfig {
    Pair([String; 2]),
    Obj { from: String, to: String, label: Option<String>, latency_ms: Option<f64> },
}

#[derive(Debug, Deserialize)]
struct NetworkConfig {
    nodes: Vec<GeoNode>,
    links: Option<Vec<LinkConfig>>,
}

#[derive(Debug, Clone)]
struct Link {
    a: usize,
    b: usize,
    label: Option<String>,
    latency_ms: Option<f64>,
}

fn known_nodes() -> Vec<GeoNode> {
    vec![
        GeoNode { name: "ARK".to_string(), lat: 34.7465, lon: -92.2896 },
        GeoNode { name: "SFO".to_string(), lat: 37.7749, lon: -122.4194 },
        GeoNode { name: "LAX".to_string(), lat: 34.0522, lon: -118.2437 },
        GeoNode { name: "NYC".to_string(), lat: 40.7128, lon: -74.0060 },
        GeoNode { name: "CHI".to_string(), lat: 41.8781, lon: -87.6298 },
        GeoNode { name: "LON".to_string(), lat: 51.5074, lon: -0.1278 },
        GeoNode { name: "PAR".to_string(), lat: 48.8566, lon: 2.3522 },
        GeoNode { name: "AMS".to_string(), lat: 52.3676, lon: 4.9041 },
        GeoNode { name: "FRA".to_string(), lat: 50.1109, lon: 8.6821 },
        GeoNode { name: "ZRH".to_string(), lat: 47.3769, lon: 8.5417 },
        GeoNode { name: "DXB".to_string(), lat: 25.2048, lon: 55.2708 },
        GeoNode { name: "SIN".to_string(), lat: 1.3521, lon: 103.8198 },
        GeoNode { name: "TKY".to_string(), lat: 35.6895, lon: 139.6917 },
        GeoNode { name: "SYD".to_string(), lat: -33.8688, lon: 151.2093 },
        GeoNode { name: "SAO".to_string(), lat: -23.5505, lon: -46.6333 },
    ]
}

fn map_host_to_node(host: &str, nodes: &[GeoNode]) -> Option<usize> {
    let h = host.to_lowercase();
    let mut aliases = vec![
        ("ark", "ARK"), ("littlerock", "ARK"), ("arkansas", "ARK"),
        ("sfo", "SFO"), ("sf", "SFO"), ("sanfran", "SFO"),
        ("lax", "LAX"), ("la", "LAX"), ("losangeles", "LAX"),
        ("nyc", "NYC"), ("newyork", "NYC"),
        ("chi", "CHI"), ("chicago", "CHI"),
        ("lon", "LON"), ("london", "LON"),
        ("par", "PAR"), ("paris", "PAR"),
        ("ams", "AMS"), ("amsterdam", "AMS"),
        ("fra", "FRA"), ("frankfurt", "FRA"),
        ("zrh", "ZRH"), ("zurich", "ZRH"), ("swiss", "ZRH"),
        ("dxb", "DXB"), ("dubai", "DXB"),
        ("sin", "SIN"), ("singapore", "SIN"), ("sg", "SIN"),
        ("tky", "TKY"), ("tokyo", "TKY"),
        ("syd", "SYD"), ("sydney", "SYD"),
        ("sao", "SAO"), ("saopaulo", "SAO"), ("brazil", "SAO"),
    ];
    for (needle, code) in aliases.drain(..) {
        if h.contains(needle) {
            return nodes.iter().position(|n| n.name == code);
        }
    }
    None
}

fn parse_ssh_hosts() -> Vec<String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let path = std::path::PathBuf::from(format!("{}/.ssh/config", home));
    let Ok(raw) = std::fs::read_to_string(path) else { return vec![] };
    let mut hosts = Vec::new();
    for line in raw.lines() {
        let l = line.trim();
        if l.starts_with("Host ") {
            for h in l.trim_start_matches("Host ").split_whitespace() {
                if !h.contains('*') { hosts.push(h.to_string()); }
            }
        }
        if l.starts_with("HostName ") {
            let h = l.trim_start_matches("HostName ").trim();
            hosts.push(h.to_string());
        }
    }
    hosts
}

fn load_network_config() -> (Vec<GeoNode>, Vec<Link>) {
    let default_nodes = vec![
        GeoNode { name: "ARK".to_string(), lat: 34.7465, lon: -92.2896 },   // Arkansas
        GeoNode { name: "ZRH".to_string(), lat: 47.3769, lon: 8.5417 },     // Zurich
        GeoNode { name: "SIN".to_string(), lat: 1.3521, lon: 103.8198 },    // Singapore
        GeoNode { name: "NYC".to_string(), lat: 40.7128, lon: -74.0060 },   // New York
        GeoNode { name: "LON".to_string(), lat: 51.5074, lon: -0.1278 },    // London
        GeoNode { name: "TKY".to_string(), lat: 35.6895, lon: 139.6917 },   // Tokyo
        GeoNode { name: "SYD".to_string(), lat: -33.8688, lon: 151.2093 },  // Sydney
        GeoNode { name: "SFO".to_string(), lat: 37.7749, lon: -122.4194 },  // San Francisco
        GeoNode { name: "SAO".to_string(), lat: -23.5505, lon: -46.6333 },  // São Paulo
    ];

    let default_links = vec![
        Link { a: 0, b: 1, label: Some("VPN".to_string()), latency_ms: Some(72.0) },
        Link { a: 1, b: 2, label: Some("SSH".to_string()), latency_ms: Some(210.0) },
        Link { a: 0, b: 2, label: None, latency_ms: Some(160.0) },
        Link { a: 3, b: 4, label: None, latency_ms: Some(55.0) },
        Link { a: 4, b: 5, label: None, latency_ms: Some(180.0) },
        Link { a: 5, b: 6, label: None, latency_ms: Some(260.0) },
        Link { a: 7, b: 3, label: None, latency_ms: Some(35.0) },
        Link { a: 7, b: 4, label: None, latency_ms: Some(95.0) },
        Link { a: 8, b: 3, label: None, latency_ms: Some(120.0) },
        Link { a: 8, b: 4, label: None, latency_ms: Some(140.0) },
        Link { a: 2, b: 5, label: None, latency_ms: Some(80.0) },
    ];

    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let path = std::path::PathBuf::from(format!("{}/.omega_network_nodes.json", home));
    if let Ok(raw) = std::fs::read_to_string(path) {
        if let Ok(cfg) = serde_json::from_str::<NetworkConfig>(&raw) {
            let nodes = if cfg.nodes.is_empty() { default_nodes.clone() } else { cfg.nodes };
            let mut index = HashMap::new();
            for (i, n) in nodes.iter().enumerate() {
                index.insert(n.name.to_uppercase(), i);
            }
            let mut links: Vec<Link> = Vec::new();
            if let Some(pairs) = cfg.links {
                for pair in pairs {
                    match pair {
                        LinkConfig::Pair(p) => {
                            if let (Some(a), Some(b)) = (index.get(&p[0].to_uppercase()), index.get(&p[1].to_uppercase())) {
                                links.push(Link { a: *a, b: *b, label: None, latency_ms: None });
                            }
                        }
                        LinkConfig::Obj { from, to, label, latency_ms } => {
                            if let (Some(a), Some(b)) = (index.get(&from.to_uppercase()), index.get(&to.to_uppercase())) {
                                links.push(Link { a: *a, b: *b, label, latency_ms });
                            }
                        }
                    }
                }
            }
            if links.is_empty() { links = default_links; }
            return (nodes, links);
        }
    }

    // Auto-generate from environment hints and SSH config (best-effort)
    let all_nodes = known_nodes();
    let mut nodes = vec![all_nodes[0].clone()]; // ARK as local anchor
    let mut links: Vec<Link> = Vec::new();

    if let Ok(path_hint) = std::env::var("OMEGA_NET_PATH") {
        let mut last = None;
        for part in path_hint.split("->") {
            let code = part.trim().to_uppercase();
            if let Some(idx) = all_nodes.iter().position(|n| n.name == code) {
                if !nodes.iter().any(|n| n.name == all_nodes[idx].name) {
                    nodes.push(all_nodes[idx].clone());
                }
                if let Some(prev) = last {
                    let a = nodes.iter().position(|n| n.name == prev).unwrap_or(0);
                    let b = nodes.iter().position(|n| n.name == all_nodes[idx].name).unwrap_or(0);
                    if a != b { links.push(Link { a, b, label: Some("VPN".to_string()), latency_ms: None }); }
                }
                last = Some(all_nodes[idx].name.clone());
            }
        }
    }

    let ssh_hosts = parse_ssh_hosts();
    for host in ssh_hosts {
        if let Some(idx) = map_host_to_node(&host, &all_nodes) {
            let code = all_nodes[idx].name.clone();
            if !nodes.iter().any(|n| n.name == code) {
                nodes.push(all_nodes[idx].clone());
            }
        }
    }

    if nodes.len() < 3 {
        return (default_nodes, default_links);
    }
    // Build a spiderweb from the local anchor to all others
    for i in 1..nodes.len() {
        links.push(Link { a: 0, b: i, label: None, latency_ms: None });
        if i > 1 { links.push(Link { a: i - 1, b: i, label: None, latency_ms: None }); }
    }
    (nodes, links)
}

pub fn ui(f: &mut Frame, app: &mut App) {
    let size = f.area();
    // Smoky Obsidian Background
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
    
    match app.active_tab {
        Tab::Cockpit => draw_cockpit(f, app, chunks[1]),
        Tab::Nexus => draw_nexus(f, app, chunks[1]),
    }
    
    draw_input(f, app, chunks[2]);
}

fn draw_header(f: &mut Frame, app: &App, area: Rect) {
    let layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(30),
            Constraint::Percentage(40),
            Constraint::Percentage(30),
        ])
        .split(area);

    let brand_color = if app.status == StatusState::Working {
        pulse_color(app, HOT_PINK, DEEP_PURPLE)
    } else {
        pulse_color(app, ELECTRIC_CYAN, TRON_BLUE)
    };
    
    let titles = vec![" [1] COCKPIT ", " [2] NEXUS "];
    let tabs = Tabs::new(titles)
        .block(Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Double) // Sharper Tron Edge
            .border_style(Style::default().fg(GRID_LINE)))
        .select(match app.active_tab { Tab::Cockpit => 0, Tab::Nexus => 1 })
        .style(Style::default().fg(SLATE_GRAY))
        .highlight_style(Style::default().fg(brand_color).add_modifier(Modifier::BOLD));
    f.render_widget(tabs, layout[0]);

    let branding = Line::from(vec![
        Span::styled(" ⌬ ", Style::default().fg(brand_color).add_modifier(Modifier::BOLD)),
        Span::styled(" ", Style::default()),
        Span::styled(
            app.profile.assistant_name.to_uppercase(),
            Style::default().fg(brand_color).add_modifier(Modifier::BOLD)
        ),
        Span::styled(" // SOVEREIGN ENGINE ", Style::default().fg(SLATE_GRAY).add_modifier(Modifier::ITALIC)),
    ]);
    f.render_widget(Paragraph::new(branding).alignment(Alignment::Center).block(Block::default().borders(Borders::ALL).border_type(BorderType::Rounded).border_style(Style::default().fg(GRID_LINE))), layout[1]);

    let mode_label = format!(" {} ", app.mode);
    let mode_text = shimmer_line(&mode_label, app);
    f.render_widget(Paragraph::new(mode_text).alignment(Alignment::Right).block(Block::default().borders(Borders::ALL).border_type(BorderType::Rounded).border_style(Style::default().fg(GRID_LINE))), layout[2]);
}

fn draw_cockpit(f: &mut Frame, app: &mut App, area: Rect) {
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
    
    if chunks.len() > 2 {
        if app.mode == Mode::Ops {
            draw_satellite_feed(f, app, chunks[2]);
        } else {
            draw_combined_diagnostics(f, app, chunks[2]);
        }
    }
}

fn draw_nexus(f: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(SLATE_GRAY))
        .title(Span::styled(" GLOBAL NEXUS SURVEILLANCE ", Style::default().fg(HOT_PINK)));
    
    let inner = block.inner(area);
    f.render_widget(block, area);

    // Helper: draw a gentle arc between two points using a quadratic bezier
    fn draw_arc(ctx: &mut ratatui::widgets::canvas::Context, x1: f64, y1: f64, x2: f64, y2: f64, lift: f64, color: Color) {
        let mx = (x1 + x2) / 2.0;
        let my = (y1 + y2) / 2.0 + lift;
        let steps = 18;
        let mut last_x = x1;
        let mut last_y = y1;
        for i in 1..=steps {
            let t = i as f64 / steps as f64;
            let a = (1.0 - t) * (1.0 - t);
            let b = 2.0 * (1.0 - t) * t;
            let c = t * t;
            let x = a * x1 + b * mx + c * x2;
            let y = a * y1 + b * my + c * y2;
            ctx.draw(&CanvasLine { x1: last_x, y1: last_y, x2: x, y2: y, color });
            last_x = x;
            last_y = y;
        }
    }

    let (nodes, links) = load_network_config();

    let canvas = Canvas::default()
        .block(Block::default())
        .x_bounds([-180.0, 180.0])
        .y_bounds([-90.0, 90.0])
        .paint(|ctx| {
            ctx.draw(&Map {
                resolution: MapResolution::High,
                color: Color::Rgb(90, 100, 120),
            });

            // Subtle graticule to make the map legible
            for lon in (-150..=150).step_by(30) {
                ctx.draw(&CanvasLine { x1: lon as f64, y1: -80.0, x2: lon as f64, y2: 80.0, color: SLATE_GRAY });
            }
            for lat in (-60..=60).step_by(20) {
                ctx.draw(&CanvasLine { x1: -170.0, y1: lat as f64, x2: 170.0, y2: lat as f64, color: SLATE_GRAY });
            }

            for (i, n) in nodes.iter().enumerate() {
                let glow = if i == 0 { ELECTRIC_CYAN } else { NEON_MINT };
                ctx.draw(&Circle { x: n.lon, y: n.lat, radius: 2.0, color: glow });
                ctx.draw(&Circle { x: n.lon, y: n.lat, radius: 1.0, color: glow });
                ctx.print(n.lon, n.lat, n.name.clone().bold().fg(glow));
            }

            // Multi-thread spiderweb lines (subtle, varied colors)
            let thread_colors = [TRON_BLUE, SOFT_BLUE, DEEP_PURPLE, ELECTRIC_CYAN, HOT_PINK, NEON_MINT];
            for (i, link) in links.iter().enumerate() {
                if let (Some(n1), Some(n2)) = (nodes.get(link.a), nodes.get(link.b)) {
                    let mut color = thread_colors[(i + app.spinner_index) % thread_colors.len()];
                    let lift = if i % 2 == 0 { 10.0 } else { -8.0 };
                    if let Some(lat) = link.latency_ms {
                        // lower latency => brighter/cyan; higher latency => warmer/purple
                        if lat < 80.0 { color = ELECTRIC_CYAN; }
                        else if lat < 160.0 { color = TRON_BLUE; }
                        else { color = DEEP_PURPLE; }
                    }
                    draw_arc(ctx, n1.lon, n1.lat, n2.lon, n2.lat, lift, color);
                    // intensity overlay (subtle glow pulse)
                    if (app.animation_tick + i as u64) % 20 < 6 {
                        draw_arc(ctx, n1.lon, n1.lat, n2.lon, n2.lat, lift * 0.6, SOFT_BLUE);
                    }
                    // label at midpoint
                    if let Some(label) = &link.label {
                        let mx = (n1.lon + n2.lon) / 2.0;
                        let my = (n1.lat + n2.lat) / 2.0 + (lift * 0.15);
                        ctx.print(mx, my, label.clone().bold().fg(NEON_AMBER));
                    }
                }
            }

            // Moving packet along the first path (subtle, rounded glyph)
            if let Some(link) = links.first() {
                if let (Some(n1), Some(n2)) = (nodes.get(link.a), nodes.get(link.b)) {
                    let progress = (app.animation_tick % 140) as f64 / 140.0;
                    let x = n1.lon + (n2.lon - n1.lon) * progress;
                    let y = n1.lat + (n2.lat - n1.lat) * progress;
                    ctx.print(x, y, "•".fg(ELECTRIC_CYAN));
                }
            }
        });

    f.render_widget(canvas, inner);
}

fn draw_agents(f: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Thick) // Tron Panel Style
        .border_style(Style::default().fg(GRID_LINE))
        .title(Span::styled(" SWARM NODES ", Style::default().fg(ELECTRIC_CYAN)));
    
    let mut items: Vec<ListItem> = Vec::new();
    for agent in &app.agents {
        let (status_char, color) = match agent.status {
            StatusState::Ready => ("●", SLATE_GRAY),
            StatusState::Working => ("⚡", HOT_PINK),
            StatusState::Synthesising => ("⌬", DEEP_PURPLE),
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
    let border_color = if app.status == StatusState::Working {
        pulse_color(app, HOT_PINK, DEEP_PURPLE)
    } else {
        GRID_LINE
    };
    let scroll_mode_color = if app.auto_scroll { NEON_MINT } else { DEEP_PURPLE };
    let scroll_indicator = if app.auto_scroll { " [SYNC_ON] " } else { " [SYNC_OFF] " };
    
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Double) // Inner Data Panel
        .border_style(Style::default().fg(border_color))
        .title(vec![
            Span::styled(" NEURAL DATA FEED ", Style::default().fg(Color::White)),
            Span::styled(scroll_indicator, Style::default().fg(scroll_mode_color).add_modifier(Modifier::BOLD)),
        ]);
    
    let inner_area = block.inner(area);
    f.render_widget(block, area);

    let mut lines: Vec<Line> = Vec::new();
    for msg in &app.messages {
        if msg.from_user {
            lines.push(Line::from(vec![
                Span::styled("❯ ", Style::default().fg(HOT_PINK).add_modifier(Modifier::BOLD)),
                Span::styled(&msg.text, Style::default().fg(Color::White)),
            ]));
        } else {
            let omega_color = pulse_color(app, ELECTRIC_CYAN, NEON_MINT);
            lines.push(Line::from(vec![
                Span::styled("Ω ", Style::default().fg(omega_color).add_modifier(Modifier::BOLD)),
            ]));
            for line in msg.text.lines() {
                lines.push(Line::from(Span::styled(format!("  {}", line), Style::default().fg(Color::Rgb(200, 200, 220)))));
            }
        }
        lines.push(Line::raw(""));
    }

    let mut total_rendered_lines = 0;
    for line in &lines {
        let width = line.width() as u16;
        if width == 0 { total_rendered_lines += 1; }
        else { total_rendered_lines += (width + inner_area.width - 1).checked_div(inner_area.width).unwrap_or(1).max(1); }
    }

    let visible_height = inner_area.height;
    if app.auto_scroll { app.target_scroll = total_rendered_lines.saturating_sub(visible_height); }
    else { app.target_scroll = app.target_scroll.min(total_rendered_lines.saturating_sub(visible_height)); }
    app.scroll = app.scroll.min(total_rendered_lines.saturating_sub(visible_height));

    let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false }).scroll((app.scroll, 0));
    f.render_widget(paragraph, inner_area);

    if total_rendered_lines > visible_height {
        let scrollbar = Scrollbar::default().orientation(ScrollbarOrientation::VerticalRight).thumb_symbol("┃").style(Style::default().fg(DEEP_PURPLE));
        let mut scrollbar_state = ScrollbarState::new(total_rendered_lines as usize).position(app.scroll as usize);
        f.render_stateful_widget(scrollbar, area.inner(Margin { vertical: 1, horizontal: 0 }), &mut scrollbar_state);
    }
}

fn draw_combined_diagnostics(f: &mut Frame, app: &App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Percentage(40),
            Constraint::Min(5),
        ])
        .split(area);

    let gauge = Gauge::default()
        .block(Block::default().title(" CONTEXT SYNAPSE ").title_style(Style::default().fg(ELECTRIC_CYAN)).borders(Borders::ALL).border_type(BorderType::Rounded).border_style(Style::default().fg(SLATE_GRAY)))
        .gauge_style(Style::default().fg(ELECTRIC_CYAN).bg(DARK_BG).add_modifier(Modifier::ITALIC))
        .percent((app.metrics.memory_used * 100.0) as u16)
        .label(format!("{:.1}%", app.metrics.memory_used * 100.0));
    f.render_widget(gauge, chunks[0]);

    let bar_data = [("ALPHA", 65), ("BETA", 42), ("GAMMA", 15)];
    let barchart = BarChart::default()
        .block(Block::default().title(" TRAJECTORIES ").borders(Borders::ALL).border_type(BorderType::Rounded).border_style(Style::default().fg(SLATE_GRAY)))
        .data(&bar_data)
        .bar_width(5)
        .bar_style(Style::default().fg(HOT_PINK))
        .value_style(Style::default().fg(Color::Black).bg(HOT_PINK).add_modifier(Modifier::BOLD));
    f.render_widget(barchart, chunks[1]);

    let trace_items: Vec<ListItem> = app.trace.iter().map(|t| {
        ListItem::new(Line::from(vec![
            Span::styled(" ✧ ", Style::default().fg(LIME_GREEN)),
            Span::styled(t, Style::default().fg(SLATE_GRAY)),
        ]))
    }).collect();

    let trace_list = List::new(trace_items)
        .block(Block::default().borders(Borders::ALL).border_type(BorderType::Rounded).border_style(Style::default().fg(SLATE_GRAY)).title(Span::styled(" COGNITIVE FLOW ", Style::default().fg(DEEP_PURPLE))));
    f.render_widget(trace_list, chunks[2]);
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
        .map(|h| Cell::from(*h).style(Style::default().fg(ELECTRIC_CYAN).add_modifier(Modifier::BOLD)));
    let header = Row::new(header_cells).bottom_margin(1);

    let rows: Vec<Row> = app.entities.iter().map(|e| {
        let sig_color = if e.signal_strength > 80 { LIME_GREEN } else if e.signal_strength > 40 { DEEP_PURPLE } else { HOT_PINK };
        Row::new(vec![
            Cell::from(e.id.clone()),
            Cell::from(e.name.clone()),
            Cell::from(format!("{}%", e.signal_strength)).style(Style::default().fg(sig_color)),
            Cell::from(e.status.clone()).style(Style::default().fg(if e.status == "ONLINE" || e.status == "STABLE" { LIME_GREEN } else { HOT_PINK })),
        ]).style(Style::default().fg(SLATE_GRAY))
    }).collect();

    let table = Table::new(rows, [
        Constraint::Length(8),
        Constraint::Min(15),
        Constraint::Length(5),
        Constraint::Length(10),
    ])
    .header(header)
    .block(Block::default().borders(Borders::ALL).border_type(BorderType::Rounded).border_style(Style::default().fg(SLATE_GRAY)).title(" SATELLITE FEED "));
    f.render_widget(table, chunks[0]);

    let mut signal_symbols = String::new();
    for e in &app.entities {
        if e.signal_strength > 50 { signal_symbols.push_str("⧉ "); }
        else { signal_symbols.push_str("⧈ "); }
    }

    let signal_map = vec![
        Line::from(vec![
            Span::styled(" SIGNAL MAP: ", Style::default().fg(HOT_PINK)),
            Span::styled(signal_symbols, Style::default().fg(LIME_GREEN)),
        ]),
        Line::from(format!(" UPLINK: {}", if app.entities.is_empty() { "Scanning..." } else { "Synchronized" })),
    ];
    f.render_widget(Paragraph::new(signal_map).wrap(Wrap { trim: true }).block(Block::default().borders(Borders::ALL).border_type(BorderType::Rounded).border_style(Style::default().fg(SLATE_GRAY))), chunks[1]);
}

fn draw_input(f: &mut Frame, app: &App, area: Rect) {
    let border_color = if app.input.starts_with('/') { DEEP_PURPLE } else { ELECTRIC_CYAN };
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(border_color))
        .title(Span::styled(" SOVEREIGN COMMAND ", Style::default().fg(Color::White)));
    
    let inner = block.inner(area);
    f.render_widget(block, area);

    let symbol = match app.status {
        StatusState::Ready => "α",
        _ => "ω",
    };
    
    let prefix_text = format!("{} > ", symbol);
    let input_str = &app.input;
    let mut spans = vec![
        Span::styled(prefix_text, Style::default().fg(HOT_PINK).add_modifier(Modifier::BOLD))
    ];

    // --- SLOW LETTER ILLUMINATION EFFECT ---
    // The pulse moves across the text, lighting up letters and then they fade.
    let pulse_pos = app.pulse_pos; // 0 to 100
    let text_len = input_str.len().max(1);
    
    for (i, c) in input_str.chars().enumerate() {
        let char_pos = (i as f64 / text_len as f64) * 100.0;
        let distance = (char_pos - pulse_pos).abs();
        
        let style = if distance < 5.0 {
            // Bright center
            Style::default().fg(ELECTRIC_CYAN).add_modifier(Modifier::BOLD)
        } else if distance < 15.0 {
            // Fading trail
            Style::default().fg(HOT_PINK)
        } else if distance < 25.0 {
            // Distant glow
            Style::default().fg(DEEP_PURPLE)
        } else {
            // Normal state
            Style::default().fg(Color::White)
        };
        
        spans.push(Span::styled(c.to_string(), style));
    }

    spans.push(Span::styled("█", Style::default().fg(ELECTRIC_CYAN).add_modifier(Modifier::RAPID_BLINK)));
    f.render_widget(Paragraph::new(Line::from(spans)).wrap(Wrap { trim: false }), inner);
}
