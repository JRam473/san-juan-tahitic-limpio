// backend/server/index.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dialogflow from "@google-cloud/dialogflow";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(bodyParser.json());

// Rate Limiting
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { error: "Demasiadas consultas. Por favor espera un momento." },
  standardHeaders: true,
});

app.use("/api/message", chatLimiter);

// Configuración Dialogflow
let sessionClient;
let isDialogflowEnabled = false;

function initializeDialogflow() {
  try {
    const requiredEnvVars = ['DIALOGFLOW_PROJECT_ID', 'DIALOGFLOW_CLIENT_EMAIL', 'DIALOGFLOW_PRIVATE_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log("💡 Usando respuestas estáticas. Configura Dialogflow en .env para habilitar IA");
      return null;
    }

    sessionClient = new dialogflow.SessionsClient({
      credentials: {
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      projectId: process.env.DIALOGFLOW_PROJECT_ID,
    });

    isDialogflowEnabled = true;
    console.log("✅ Dialogflow configurado");
    return sessionClient;

  } catch (error) {
    console.error("Error inicializando Dialogflow:", error.message);
    return null;
  }
}

sessionClient = initializeDialogflow();

// Respuestas estáticas
const staticResponses = {
  "hola": "🌿 **¡Hola! Bienvenido/a a San Juan Tahitic** ✨\n\nSoy tu guía virtual. ¿Te gustaría explorar alguna área específica?",
  "que cascadas hay": "💧 **¡Nuestras cascadas son mágicas!** \n\nEn San Juan Tahitic tenemos varias cascadas hermosas para visitar.",
  // ... resto de respuestas estáticas
  "default": "🌿 **Interesante pregunta...**\n\nTe invito a explorar nuestras secciones usando los botones de arriba."
};

// Endpoints
app.post("/api/message", async (req, res) => {
  const { message, sessionId = "visitante", languageCode = "es" } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      reply: "📝 Por favor, escribe un mensaje para poder ayudarte.",
      type: "validation_error"
    });
  }

  const userMessage = message.trim().toLowerCase();
  
  try {
    let reply, intent;

    // Intentar con Dialogflow si está disponible
    if (isDialogflowEnabled && sessionClient) {
      try {
        const sessionPath = sessionClient.projectAgentSessionPath(
          process.env.DIALOGFLOW_PROJECT_ID, 
          sessionId
        );

        const request = {
          session: sessionPath,
          queryInput: {
            text: {
              text: userMessage,
              languageCode,
            },
          },
        };

        const [response] = await sessionClient.detectIntent(request);
        const result = response.queryResult;
        
        reply = result.fulfillmentText;
        intent = result.intent?.displayName;
        
      } catch (dialogflowError) {
        // Fallback a respuestas estáticas
      }
    }

    // Usar respuesta estática si Dialogflow falló
    if (!reply) {
      reply = staticResponses[userMessage] || staticResponses.default;
      intent = "static_response";
    }

    res.json({
      reply,
      intent: intent || "static_fallback",
      timestamp: new Date().toISOString(),
      source: isDialogflowEnabled ? "dialogflow" : "static"
    });

  } catch (error) {
    console.error("Error procesando mensaje:", error);
    
    res.json({
      reply: "🌀 **La conexión con nuestros guías se ha interrumpido...**\n\nPor favor, intenta nuevamente.",
      intent: "error_fallback",
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "San Juan Tahitic Chatbot API",
    timestamp: new Date().toISOString(),
    dialogflow: isDialogflowEnabled ? "connected" : "disabled"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🎉 SAN JUAN TAHITIC CHATBOT API`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔮 Dialogflow: ${isDialogflowEnabled ? "✅ CONECTADO" : "⚠️  RESP. ESTÁTICAS"}`);
});