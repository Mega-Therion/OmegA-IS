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

// --- Alexa Protocol Models ---
#[derive(Deserialize)]
pub struct AlexaRequest {
    pub request: AlexaRequestDetail,
}

#[derive(Deserialize)]
pub struct AlexaRequestDetail {
    pub r#type: String,
    pub intent: Option<AlexaIntent>,
}

#[derive(Deserialize)]
pub struct AlexaIntent {
    pub name: String,
    pub slots: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct AlexaResponse {
    pub version: String,
    pub response: AlexaResponseDetail,
}

#[derive(Serialize)]
pub struct AlexaResponseDetail {
    pub outputSpeech: AlexaOutputSpeech,
    pub shouldEndSession: bool,
}

#[derive(Serialize)]
pub struct AlexaOutputSpeech {
    pub r#type: String,
    pub text: String,
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

/// Alexa Skill Endpoint
async fn alexa_handler(
    data: web::Data<OmegaEngine>,
    req: web::Json<AlexaRequest>,
) -> impl Responder {
    let message = match req.request.r#type.as_str() {
        "LaunchRequest" => "Welcome to ΩmegΑ Sovereign. How may I assist your mission today?".to_string(),
        "IntentRequest" => {
            if let Some(intent) = &req.request.intent {
                // Simplified: capture everything as a mission
                format!("Execute mission from voice: {}", intent.name)
            } else { "Ready.".to_string() }
        },
        _ => "ΩmegΑ standby.".to_string(),
    };

    let (tx, mut rx) = mpsc::unbounded_channel();
    let engine = data.get_ref().clone();
    engine.process_input(message, false, tx);

    let mut response_text = String::new();
    while let Some(event) = rx.recv().await {
        if let UiEvent::Output(text) = event {
            response_text = text;
            break;
        }
    }

    if response_text.is_empty() { response_text = "Mission acknowledged.".to_string(); }

    HttpResponse::Ok().json(AlexaResponse {
        version: "1.0".to_string(),
        response: AlexaResponseDetail {
            outputSpeech: AlexaOutputSpeech {
                r#type: "PlainText".to_string(),
                text: response_text,
            },
            shouldEndSession: true,
        },
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

/// OpenAPI handler to list all skills
#[utoipa::path(
    get,
    path = "/api/skills",
    responses(
        (status = 200, description = "List all registered WASM skills", body = [SkillMetadata])
    )
)]
pub async fn get_skills_handler(data: actix_web::web::Data<crate::engine::OmegaEngine>) -> impl actix_web::Responder {
    let skills = data.modules.list_skills();
    actix_web::HttpResponse::Ok().json(skills)
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct RunSkillRequest {
    /// Name of the pre-loaded .wasm skill (optional if wat is provided)
    pub skill_name: Option<String>,
    /// WebAssembly Text (WAT) content for on-the-fly execution (optional)
    pub wat: Option<String>,
    pub input: i32,
}

/// OpenAPI handler to execute a skill
#[utoipa::path(
    post,
    path = "/api/skills/run",
    request_body = RunSkillRequest,
    responses(
        (status = 200, description = "Execution result"),
        (status = 404, description = "Skill not found"),
        (status = 400, description = "Invalid request")
    )
)]
pub async fn run_skill_handler(
    data: actix_web::web::Data<crate::engine::OmegaEngine>,
    req: actix_web::web::Json<RunSkillRequest>,
) -> impl actix_web::Responder {
    if let Some(wat) = &req.wat {
        match data.modules.execute_wat(wat, req.input) {
            Ok(res) => actix_web::HttpResponse::Ok().json(serde_json::json!({"result": res, "source": "wat"})),
            Err(e) => actix_web::HttpResponse::BadRequest().json(serde_json::json!({"error": e.to_string()})),
        }
    } else if let Some(name) = &req.skill_name {
        match data.modules.run_skill(name, req.input) {
            Ok(res) => actix_web::HttpResponse::Ok().json(serde_json::json!({"result": res, "source": name})),
            Err(e) => actix_web::HttpResponse::NotFound().json(serde_json::json!({"error": e.to_string()})),
        }
    } else {
        actix_web::HttpResponse::BadRequest().json(serde_json::json!({"error": "Either skill_name or wat must be provided"}))
    }
}

#[derive(OpenApi)]
#[openapi(
    paths(chat_handler, health_check, crate::devices::get_devices_handler, get_skills_handler, run_skill_handler),
    components(schemas(
        ChatRequest, 
        ChatResponse, 
        crate::devices::PhysicalEntity, 
        crate::devices::EntityType,
        crate::modules::SkillMetadata,
        RunSkillRequest
    ))
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
            .route("/api/alexa", web::post().to(chat_handler))
            .route("/api/devices", web::get().to(crate::devices::get_devices_handler))
            .route("/api/skills", web::get().to(get_skills_handler))
            .route("/api/skills/run", web::post().to(run_skill_handler))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
