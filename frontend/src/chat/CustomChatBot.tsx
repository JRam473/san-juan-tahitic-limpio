import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, X, MapPin, Leaf, Music, Mountain } from "lucide-react";

// Definimos los tipos para las props y las quick replies
interface QuickReply {
  text: string;
  action: "navigate" | "question";
  target: string;
  description?: string;
}

interface Message {
  sender: "user" | "bot";
  text: string;
  quickReplies?: QuickReply[];
  timestamp?: number;
  id?: string;
}

interface CustomChatbotProps {
  onNavigate?: (path: string) => void;
}

// Opciones de navegación
const navigationOptions: QuickReply[] = [
  {
    text: "🏞️ Turismo y Atracciones",
    action: "navigate",
    target: "/turismo",
    description: "Descubre cascadas, senderos y paisajes únicos"
  },
  {
    text: "🎭 Cultura y Tradiciones", 
    action: "navigate",
    target: "/cultura",
    description: "Danzas ancestrales, calendario cultural y arte"
  },
  {
    text: "👥 Comunidad Local",
    action: "navigate",
    target: "/comunidad", 
    description: "Conoce nuestra gente y proyectos comunitarios"
  },
  {
    text: "🍽️ Gastronomía",
    action: "navigate",
    target: "/section-gastronomia",
    description: "Sabores tradicionales y cocina local"
  },
  {
    text: "📞 Contacto",
    action: "navigate",
    target: "/contacto",
    description: "Cómo visitarnos y información de contacto"
  },
  {
    text: "🛍️ Cooperativa",
    action: "navigate",
    target: "/section-cooperativa",
    description: "Productos locales y artesanías"
  },
  {
    text: "📅 Calendario Cultural",
    action: "navigate",
    target: "/calendario-cultural",
    description: "Eventos y festividades tradicionales"
  },
  {
    text: "🖼️ Galería",
    action: "navigate",
    target: "/galeria",
    description: "Imágenes y videos de nuestra tierra"
  }
];

// Configuración del backend
const BACKEND_URL = import.meta.env.VITE_API_URL;
// Agrega esto temporalmente en CustomChatBot.tsx para debug
export const CustomChatbot: React.FC<CustomChatbotProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "🌿 **¡Bienvenido/a a San Juan Tahitic!** 🌄\n\n*Donde la naturaleza y la cultura se encuentran* ✨\n\nSoy tu guía virtual. ¿Te gustaría explorar alguna área específica de nuestro paraíso? \n\nPuedes hacer clic en algunos de nuestros siguientes botones directos a la sección de nuestro sitio web, o puedes preguntarnos con palabras claves para saber algo en particular como **Cascadas**, **Danzas**, **Cooperativa**, lo que necesites.",
      quickReplies: navigationOptions,
      timestamp: Date.now(),
      id: "welcome-1"
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);
  const inputRef = useRef<HTMLInputElement>(null);

  // ======================
  // 🔄 EFECTOS Y UTILIDADES
  // ======================

  // Focus en input cuando se abre el chat
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Scroll inteligente mejorado
  useEffect(() => {
    const isNewMessage = messages.length > lastMessageCountRef.current;
    
    if (isNewMessage) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          const lastMessage = messages[messages.length - 1];
          
          if (lastMessage.sender === "user") {
            // Usuario: scroll al final inmediato
            container.scrollTop = container.scrollHeight;
          } else {
            // Bot: scroll suave después de un delay para lectura
            setTimeout(() => {
              container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth"
              });
            }, 100);
          }
        }
      }, 50);
      
      lastMessageCountRef.current = messages.length;
    }
  }, [messages]);

  // ======================
  // 🎯 MANEJADORES PRINCIPALES
  // ======================

  const handleQuickReply = async (reply: QuickReply) => {
    if (reply.action === "navigate" && onNavigate) {
      // Agregar mensaje del usuario
      const userMessage: Message = {
        sender: "user",
        text: reply.text,
        timestamp: Date.now(),
        id: `user-${Date.now()}`
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Mensaje de confirmación del bot
      const confirmationMessage: Message = {
        sender: "bot",
        text: `¡Excelente elección! 🎯\n\nTe estoy llevando a **${reply.text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')}**...\n\n*Navegando...* ✨`,
        timestamp: Date.now(),
        id: `nav-${Date.now()}`
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      // Navegación después de un breve delay
      setTimeout(() => {
        onNavigate(reply.target);
      }, 1800);
      
    } else if (reply.action === "question") {
      // Para preguntas predefinidas
      setInput(reply.target);
      setTimeout(() => handleSend(), 100);
    }
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Crear mensaje de usuario
    const userMessage: Message = { 
      sender: "user", 
      text: trimmedInput,
      timestamp: Date.now(),
      id: `user-${Date.now()}`
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setConnectionError(false);

    // Timeout para evitar requests eternos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_URL}/api/message`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedInput,
          sessionId: `user-${Date.now()}`,
          languageCode: "es",
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        sender: "bot", 
        text: data.reply,
        timestamp: Date.now(),
        id: `bot-${Date.now()}`
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error comunicando con backend:", error);
      setConnectionError(true);
      
      const errorMessage: Message = {
        sender: "bot", 
        text: getErrorMessage(error),
        timestamp: Date.now(),
        id: `error-${Date.now()}`
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (error.name === 'AbortError') {
      return "⏰ **La consulta está tomando más tiempo de lo esperado...**\n\nPor favor, intenta nuevamente con una pregunta más específica o usa los botones de navegación.";
    }
    
    if (error.message?.includes('Failed to fetch')) {
      return "🌐 **No podemos conectarnos con nuestros guías en este momento...**\n\nParece que hay un problema de conexión. Por favor:\n\n• Verifica tu conexión a internet\n• Intenta recargar la página\n• Usa los botones de navegación para explorar";
    }
    
    return "🌀 **La conexión con nuestros guías se ha interrumpido...**\n\nPor favor, intenta nuevamente en unos momentos. Mientras tanto, puedes explorar nuestras secciones usando los botones de arriba. 🌿";
  };

  const clearChat = () => {
    setMessages([
      {
        sender: "bot",
        text: "🌿 **¡Conversación reiniciada!** ✨\n\n¿En qué más puedo ayudarte? Puedes explorar nuestras secciones o hacerme cualquier pregunta.",
        quickReplies: navigationOptions,
        timestamp: Date.now(),
        id: "welcome-restart"
      }
    ]);
  };

  // Sugerencias temáticas para preguntas específicas
  const quickSuggestions = [
    {
      text: "¿Qué cascadas recomiendan visitar?",
      icon: "💧",
      keywords: ["cascadas", "cataratas", "agua", "ríos"]
    },
    {
      text: "Horarios de danzas tradicionales",
      icon: "🎭",
      keywords: ["danzas", "bailes", "tradicional", "cultural"]
    },
    {
      text: "Tours por reservas naturales",
      icon: "🌳",
      keywords: ["tours", "reservas", "naturaleza", "excursiones"]
    },
    {
      text: "Cultura y tradiciones locales",
      icon: "📜",
      keywords: ["cultura", "tradiciones", "historia", "ancestral"]
    }
  ];

  // Verificar si hay quick replies activas en el último mensaje
  const hasActiveQuickReplies = messages.length > 0 && 
    messages[messages.length - 1].sender === "bot" && 
    messages[messages.length - 1].quickReplies;

  return (
    <>
      {/* Botón flotante mejorado */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white p-4 rounded-full shadow-2xl transition-all z-50 flex items-center justify-center group border-2 border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
        style={{
          background: "linear-gradient(135deg, #059669 0%, #0f766e 100%)",
          boxShadow: "0 8px 32px rgba(5, 150, 105, 0.3)"
        }}
      >
        {isOpen ? (
          <X size={24} className="group-hover:rotate-90 transition-transform" />
        ) : (
          <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
        )}
        
        {/* Notificación pulsante cuando hay mensajes nuevos */}
        {!isOpen && messages.length > 1 && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Ventana del chat mejorada */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-emerald-200 z-40
                      sm:w-[420px] sm:h-[520px] md:w-[440px]"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
              boxShadow: "0 20px 60px rgba(5, 150, 105, 0.2)"
            }}
            role="dialog"
            aria-label="Chat de San Juan Tahitic"
          >
            {/* Encabezado compacto con más controles */}
            <div 
              className="px-4 py-3 text-white font-semibold flex justify-between items-center relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #059669 0%, #0d9488 50%, #0f766e 100%)"
              }}
            >
              {/* Elementos decorativos */}
              <div className="absolute inset-0 opacity-10">
                <Leaf className="absolute top-1 left-4" size={16} />
                <Music className="absolute bottom-1 right-8" size={12} />
                <Mountain className="absolute top-2 right-4" size={14} />
              </div>
              
              <div className="flex items-center z-10">
                <div className="bg-white/20 p-1.5 rounded-full mr-2">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <span className="text-base block leading-tight">San Juan Tahitic</span>
                  <span className="text-xs font-normal opacity-90 flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      connectionError ? 'bg-red-400' : 'bg-amber-400'
                    }`}></div>
                    {connectionError ? 'Reconectando...' : 'Guía de Navegación'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 z-10">
                {/* Botón de limpiar chat */}
                {messages.length > 2 && (
                  <button 
                    onClick={clearChat}
                    className="hover:bg-white/20 p-1 rounded-full transition text-xs opacity-80 hover:opacity-100"
                    aria-label="Limpiar conversación"
                    title="Limpiar conversación"
                  >
                    🔄
                  </button>
                )}
                
                <button 
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 p-1 rounded-full transition"
                  aria-label="Cerrar chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Área de mensajes mejorada */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-emerald-50/50 to-teal-50/30 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent"
              style={{ 
                maxHeight: "calc(100% - 120px)",
              }}
            >
              {messages.map((msg) => (
                <div key={msg.id || `msg-${msg.timestamp}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className={`flex ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"} items-end space-x-2 max-w-[95%]`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        msg.sender === "user" 
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 ml-1" 
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 mr-1"
                      }`}>
                        {msg.sender === "user" ? (
                          <span className="text-white text-[10px] font-bold">TÚ</span>
                        ) : (
                          <Leaf size={12} className="text-white" />
                        )}
                      </div>
                      
                      {/* Burbuja de mensaje */}
                      <motion.div
                        className={`relative px-4 py-3 rounded-xl max-w-full min-w-[120px] ${
                          msg.sender === "user"
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none shadow-md"
                            : "bg-white border border-emerald-100 text-gray-800 rounded-bl-none shadow-sm"
                        }`}
                      >
                        <div
                          className="whitespace-pre-wrap leading-relaxed text-sm chatbot-message"
                          style={{ lineHeight: '1.5' }}
                          dangerouslySetInnerHTML={{
                            __html: msg.text
                              .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
                              .replace(/\n/g, "<br />")
                              .replace(/\*(.*?)\*/g, "<em class='italic text-opacity-90'>$1</em>"),
                          }}
                        />
                        
                        {/* Timestamp pequeño */}
                        {msg.timestamp && (
                          <div className={`text-xs mt-2 ${
                            msg.sender === "user" ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            {new Date(msg.timestamp).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Quick Replies */}
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-3 ml-10"
                    >
                      <div className="grid grid-cols-1 gap-2">
                        {msg.quickReplies.map((reply, index) => (
                          <motion.button
                            key={index}
                            onClick={() => handleQuickReply(reply)}
                            className="text-sm bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl transition-all duration-200 text-left group hover:shadow-md hover:border-emerald-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-1"
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="font-medium">{reply.text}</div>
                            {reply.description && (
                              <div className="text-xs text-emerald-600 mt-1 opacity-80">
                                {reply.description}
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
              
              {/* Indicador de escritura */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start ml-10"
                >
                  <div className="flex items-center space-x-2 bg-white border border-emerald-100 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <motion.div
                        className="w-2 h-2 bg-emerald-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-emerald-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-emerald-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                    <span className="text-xs text-emerald-600 italic">Nuestro guía está respondiendo...</span>
                  </div>
                </motion.div>
              )}
              
              {/* Referencia para scroll automático */}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugerencias rápidas (solo si no hay quick replies activas) */}
            {!hasActiveQuickReplies && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="px-4 pb-2 border-t border-emerald-100 pt-3 bg-white/50"
              >
                <p className="text-xs text-emerald-700 mb-2 font-medium">
                  💫 También puedes preguntar sobre:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setInput(suggestion.text);
                        setTimeout(() => handleSend(), 100);
                      }}
                      className="text-xs bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg transition-all duration-200 text-left group hover:shadow-sm hover:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="mr-1">{suggestion.icon}</span>
                      {suggestion.text}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Campo de entrada mejorado */}
            <div className="p-3 border-t border-emerald-200 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full border border-emerald-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 text-sm bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Escribe tu mensaje o elige una sección arriba..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={isLoading}
                    aria-label="Escribe tu mensaje"
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <motion.div
                        className="flex space-x-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                      </motion.div>
                    </div>
                  )}
                </div>
                <motion.button
                  onClick={handleSend}
                  className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!input.trim() || isLoading}
                  style={{ width: '44px', height: '44px' }}
                  aria-label="Enviar mensaje"
                >
                  <Send size={16} />
                </motion.button>
              </div>
              
              {/* Indicador de estado de conexión */}
              {connectionError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 text-xs text-amber-600 flex items-center"
                >
                  <div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
                  Reconectando con el servidor...
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};