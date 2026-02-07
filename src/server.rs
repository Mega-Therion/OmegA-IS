use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use crate::engine::OmegaEngine;
use crate::config::{OmegaConfig, Capabilities, UserProfile, SupabaseConfig};
use crate::devices::{PhysicalEntity, EntityType, TelemetryReading, RobotState};
use tokio::sync::mpsc;
use crate::events::UiEvent;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use actix_web::dev::{Service, ServiceRequest, ServiceResponse, Transform};
use futures::future::{ok, Ready};
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

pub struct GatewayMiddleware;

impl<S, B> Transform<S, ServiceRequest> for GatewayMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = actix_web::Error;
    type InitError = ();
    type Transform = GatewayMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(GatewayMiddlewareService { service })
    }
}

pub struct GatewayMiddlewareService<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for GatewayMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = actix_web::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let engine = req.app_data::<web::Data<OmegaEngine>>().cloned();
        
        // In a real implementation, we would extract the body and pass it to WASM.
        // For this prototype, we log the path and perform a basic WASM-gated check.
        if let Some(engine) = engine {
            let path = req.path().to_string();
            let filter_path = std::path::PathBuf::from("skills/gateway_filter.wasm");
            
            if filter_path.exists() {
                // Execute WASM filter
                match engine.modules.execute_skill(&filter_path, &path, None) {
                    Ok(result) => {
                        if result.starts_with("DENY") {
                            return Box::pin(async move {
                                Err(actix_web::error::ErrorForbidden(result))
                            });
                        }
                    }
                    Err(e) => println!("[GATEWAY ERROR] WASM filter failed: {}", e),
                }
            }
        }

        let fut = self.service.call(req);
        Box::pin(async move {
            let res = fut.await?;
            Ok(res)
        })
    }
}

#[derive(Deserialize, Serialize, utoipa::ToSchema)]
pub struct ChatRequest {
    /// The mission or message for ΩmegΑ
    pub message: String,
}

#[derive(Deserialize, Serialize, utoipa::ToSchema)]
pub struct ChatResponse {
    /// The processed response from ΩmegΑ
    pub response: String,
    /// Time taken in milliseconds
    pub latency_ms: u128,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct ListenRequest {
    /// Duration to listen in seconds
    pub duration_secs: u32,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct ListenResponse {
    /// The transcribed text
    pub transcript: String,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct SpeakRequest {
    /// The text to speak
    pub text: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct SpeakResponse {
    /// Success status
    pub success: bool,
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
    post,
    path = "/api/voice/listen",
    request_body(content = String, description = "Optional JSON with duration_secs or raw WAV bytes", content_type = "application/json"),
    responses(
        (status = 200, description = "Success", body = ListenResponse),
        (status = 500, description = "Error transcribing")
    )
)]
async fn voice_listen(
    data: web::Data<OmegaEngine>,
    req_body: web::Bytes,
) -> impl Responder {
    // Try to parse as JSON first for local recording
    if let Ok(req) = serde_json::from_slice::<ListenRequest>(&req_body) {
        match data.listen(req.duration_secs).await {
            Ok(text) => return HttpResponse::Ok().json(ListenResponse { transcript: text }),
            Err(e) => return HttpResponse::InternalServerError().json(e.to_string()),
        }
    }

    // Otherwise treat as raw audio bytes
    if req_body.is_empty() {
        return HttpResponse::BadRequest().json("Empty body. Provide ListenRequest JSON or WAV bytes.");
    }

    match data.transcribe(req_body.to_vec()).await {
        Ok(text) => HttpResponse::Ok().json(ListenResponse { transcript: text }),
        Err(e) => HttpResponse::InternalServerError().json(e.to_string()),
    }
}

#[utoipa::path(
    post,
    path = "/api/voice/speak",
    request_body = SpeakRequest,
    responses(
        (status = 200, description = "Success", body = SpeakResponse)
    )
)]
async fn voice_speak(
    data: web::Data<OmegaEngine>,
    req: web::Json<SpeakRequest>,
) -> impl Responder {
    data.speak(&req.text);
    HttpResponse::Ok().json(SpeakResponse { success: true })
}

#[utoipa::path(
    post,
    path = "/api/voice/synthesize",
    request_body = SpeakRequest,
    responses(
        (status = 200, description = "Success", body = Vec<u8>, content_type = "audio/wav"),
        (status = 500, description = "Error synthesizing")
    )
)]
async fn voice_synthesize(
    data: web::Data<OmegaEngine>,
    req: web::Json<SpeakRequest>,
) -> impl Responder {
    match data.synthesize(&req.text).await {
        Ok(bytes) => HttpResponse::Ok().content_type("audio/wav").body(bytes),
        Err(e) => HttpResponse::InternalServerError().json(e.to_string()),
    }
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

#[derive(Deserialize, utoipa::ToSchema)]
pub struct CommandRequest {
    /// The command to execute (e.g., REBOOT, ACTIVATE)
    pub command: String,
}

#[utoipa::path(
    get,
    path = "/api/devices",
    responses(
        (status = 200, description = "Success", body = Vec<PhysicalEntity>)
    )
)]
async fn get_devices(data: web::Data<OmegaEngine>) -> impl Responder {
    let devices = data.devices.get_all();
    HttpResponse::Ok().json(devices)
}

#[utoipa::path(
    post,
    path = "/api/devices/{id}/command",
    request_body = CommandRequest,
    responses(
        (status = 200, description = "Success", body = String),
        (status = 404, description = "Device not found")
    )
)]
async fn post_device_command(
    data: web::Data<OmegaEngine>,
    id: web::Path<String>,
    req: web::Json<CommandRequest>,
) -> impl Responder {
    match data.devices.execute_command(&id, &req.command) {
        Ok(msg) => HttpResponse::Ok().json(msg),
        Err(e) => HttpResponse::NotFound().json(e),
    }
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct SkillExecuteRequest {
    /// The input string for the skill
    pub input: String,
}

#[utoipa::path(
    get,
    path = "/api/skills",
    responses(
        (status = 200, description = "List of available WASM skills", body = Vec<String>)
    )
)]
async fn get_skills(data: web::Data<OmegaEngine>) -> impl Responder {
    match data.modules.list_skills() {
        Ok(skills) => HttpResponse::Ok().json(skills),
        Err(e) => HttpResponse::InternalServerError().json(e.to_string()),
    }
}

#[utoipa::path(
    post,
    path = "/api/skills/{name}/execute",
    request_body = SkillExecuteRequest,
    responses(
        (status = 200, description = "Skill executed successfully", body = String),
        (status = 404, description = "Skill not found"),
        (status = 500, description = "Execution error")
    )
)]
async fn post_skill_execute(
    data: web::Data<OmegaEngine>,
    name: web::Path<String>,
    req: web::Json<SkillExecuteRequest>,
) -> impl Responder {
    let path = std::path::PathBuf::from(format!("skills/{}.wasm", name));
    if !path.exists() {
        return HttpResponse::NotFound().json(format!("Skill {} not found", name));
    }
    
    let (tx, _rx) = mpsc::unbounded_channel();
    let input_clone = req.input.clone();
    
    // We execute in a thread to allow for potential ui_broadcast via the channel
    // although for now the handler waits for completion.
    let res = data.modules.execute_skill(&path, &input_clone, Some(tx));
    
    match res {
        Ok(res) => HttpResponse::Ok().json(res),
        Err(e) => HttpResponse::InternalServerError().json(e.to_string()),
    }
}

#[utoipa::path(
    post,
    path = "/api/devices/discover",
    responses(
        (status = 200, description = "Discovered devices", body = Vec<PhysicalEntity>)
    )
)]
async fn discover_devices(data: web::Data<OmegaEngine>) -> impl Responder {
    let discovered = data.devices.discover_entities();
    HttpResponse::Ok().json(discovered)
}

#[utoipa::path(
    get,
    path = "/api/devices/{id}",
    responses(
        (status = 200, description = "Device details", body = PhysicalEntity),
        (status = 404, description = "Device not found")
    )
)]
async fn get_device(
    data: web::Data<OmegaEngine>,
    id: web::Path<String>,
) -> impl Responder {
    match data.devices.get(&id) {
        Some(device) => HttpResponse::Ok().json(device),
        None => HttpResponse::NotFound().json(format!("Device {} not found", id)),
    }
}

#[utoipa::path(
    post,
    path = "/api/devices/{id}/telemetry",
    request_body = TelemetryReading,
    responses(
        (status = 200, description = "Telemetry recorded"),
        (status = 404, description = "Device not found")
    )
)]
async fn post_device_telemetry(
    data: web::Data<OmegaEngine>,
    id: web::Path<String>,
    req: web::Json<TelemetryReading>,
) -> impl Responder {
    match data.devices.push_telemetry(&id, req.into_inner()) {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(e) => HttpResponse::NotFound().json(e),
    }
}

#[derive(OpenApi)]
#[openapi(
    paths(chat_handler, health_check, get_devices, get_device, /*get_device_telemetry,*/ post_device_command, post_device_telemetry, discover_devices, get_skills, post_skill_execute, voice_listen, voice_speak, voice_synthesize),
    components(schemas(ChatRequest, ChatResponse, CommandRequest, PhysicalEntity, EntityType, TelemetryReading, RobotState, SkillExecuteRequest, ListenRequest, ListenResponse, SpeakRequest, SpeakResponse))
)]
struct ApiDoc;

pub async fn run_server(port: u16) -> std::io::Result<()> {
    let config = OmegaConfig {
        capabilities: Capabilities {
            allow_network: true,
            allow_filesystem: true,
            max_parallel_agents: 5,
            is_public: false,
        },
        profile: UserProfile {
            pilot_name: "API User".to_string(),
            theme: "server".to_string(),
            assistant_name: "ΩmegΑ Server".to_string(),
        },
        supabase: SupabaseConfig::default(),
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
            .wrap(GatewayMiddleware)
            .app_data(engine_data.clone())
            .service(SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", openapi.clone()))
            .route("/health", web::get().to(health_check))
            .route("/api/chat", web::post().to(chat_handler))
            .route("/api/devices", web::get().to(get_devices))
            .route("/api/devices/discover", web::post().to(discover_devices))
            .route("/api/devices/{id}", web::get().to(get_device))
            // .route("/api/devices/{id}/telemetry", web::get().to(get_device_telemetry))
            .route("/api/devices/{id}/telemetry", web::post().to(post_device_telemetry))
            .route("/api/devices/{id}/command", web::post().to(post_device_command))
            .route("/api/skills", web::get().to(get_skills))
            .route("/api/skills/{name}/execute", web::post().to(post_skill_execute))
            .route("/api/voice/listen", web::post().to(voice_listen))
            .route("/api/voice/speak", web::post().to(voice_speak))
            .route("/api/voice/synthesize", web::post().to(voice_synthesize))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}