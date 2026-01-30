use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use crate::engine::OmegaEngine;
use crate::config::{OmegaConfig, Capabilities, UserProfile};
use tokio::sync::mpsc;
use crate::events::UiEvent;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[derive(Deserialize, Serialize, utoipa::ToSchema)]
pub struct ChatRequest {
    /// The mission or message for ΩmegΑ
    pub message: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct ChatResponse {
    /// The processed response from ΩmegΑ
    pub response: String,
    /// Time taken in milliseconds
    pub latency_ms: u128,
}

#[utoipa::path(
    post,
    path = "/api/chat",
    request_body = ChatRequest,
    responses(
        (status = 200, description = "Success", body = ChatResponse)
    )
)]
async fn chat_handler(
    data: web::Data<OmegaEngine>,
    req: web::Json<ChatRequest>,
) -> impl Responder {
    let (tx, mut rx) = mpsc::unbounded_channel();
    let engine = data.get_ref().clone();
    let prompt = req.message.clone();

    engine.process_input(prompt, false, tx);

    let mut final_response = String::new();
    let mut latency = 0;

    while let Some(event) = rx.recv().await {
        match event {
            UiEvent::Output(text) => final_response = text,
            UiEvent::Summary { latency_ms, .. } => latency = latency_ms,
            _ => {},
        }
    }

    HttpResponse::Ok().json(ChatResponse {
        response: final_response,
        latency_ms: latency,
    })
}

#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "System is healthy")
    )
)]
async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"status": "active", "system": "ΩmegΑ"}))
}

#[derive(OpenApi)]
#[openapi(
    paths(chat_handler, health_check),
    components(schemas(ChatRequest, ChatResponse))
)]
struct ApiDoc;

pub async fn run_server(port: u16) -> std::io::Result<()> {
    let config = OmegaConfig {
        capabilities: Capabilities {
            allow_network: true,
            allow_filesystem: true,
            max_parallel_agents: 5,
        },
        profile: UserProfile {
            pilot_name: "API User".to_string(),
            theme: "server".to_string(),
            assistant_name: "ΩmegΑ Server".to_string(),
        }
    };
    
    let engine = OmegaEngine::new(config);
    let engine_data = web::Data::new(engine);
    let openapi = ApiDoc::openapi();

    println!("Starting ΩmegΑ Sovereign Server on port {}", port);
    println!("Swagger UI available at http://localhost:{}/swagger-ui/", port);

    HttpServer::new(move || {
        let cors = Cors::permissive();
        App::new()
            .wrap(cors)
            .app_data(engine_data.clone())
            .service(SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", openapi.clone()))
            .route("/health", web::get().to(health_check))
            .route("/api/chat", web::post().to(chat_handler))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
