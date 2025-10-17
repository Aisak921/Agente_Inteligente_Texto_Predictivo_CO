# 2. Crear servidor API REST (api_server.py)
api_server_code = '''"""
Servidor API REST para el Agente de Texto Predictivo
Proporciona endpoints HTTP para integración con aplicaciones
"""

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import json
import os
import logging
from datetime import datetime
from agente_core import AgentePredictivo

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar Flask
app = Flask(__name__, 
           template_folder='../web',
           static_folder='../web')
CORS(app)

# Instancia global del agente
agente = None

def inicializar_agente():
    """Inicializa el agente predictivo"""
    global agente
    try:
        agente = AgentePredictivo()
        logger.info("Agente inicializado correctamente")
        return True
    except Exception as e:
        logger.error(f"Error inicializando agente: {e}")
        return False

@app.route('/')
def index():
    """Página principal con interfaz web"""
    return render_template('index.html')

@app.route('/demo')
def demo():
    """Página de demostración"""
    return render_template('demo.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Endpoint principal para obtener sugerencias predictivas
    
    Body JSON:
    {
        "texto": "Hola parce, como",
        "usuario_id": "user123",
        "contexto": "informal"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'texto' not in data:
            return jsonify({
                'error': 'Texto requerido',
                'status': 'error'
            }), 400
        
        texto = data['texto']
        usuario_id = data.get('usuario_id', 'anonimo')
        contexto = data.get('contexto', 'general')
        
        # Procesar con el agente
        sugerencias = agente.procesar_entrada(texto, usuario_id, contexto)
        
        # Formatear respuesta
        sugerencias_json = []
        for sug in sugerencias:
            sugerencias_json.append({
                'texto': sug.texto,
                'confianza': round(sug.confianza, 3),
                'tipo': sug.tipo,
                'contexto': sug.contexto,
                'metadata': sug.metadata
            })
        
        return jsonify({
            'sugerencias': sugerencias_json,
            'total': len(sugerencias_json),
            'tiempo_procesamiento': 'calculado_en_cliente',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error en /api/predict: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/feedback', methods=['POST'])
def feedback():
    """
    Endpoint para registrar feedback del usuario
    
    Body JSON:
    {
        "usuario_id": "user123",
        "sugerencia": "chévere",
        "accion": "acepta",
        "contexto": "informal"
    }
    """
    try:
        data = request.get_json()
        
        required_fields = ['usuario_id', 'sugerencia', 'accion']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': f'Campo {field} requerido',
                    'status': 'error'
                }), 400
        
        usuario_id = data['usuario_id']
        sugerencia = data['sugerencia']
        accion = data['accion']
        contexto = data.get('contexto', 'general')
        
        # Validar acción
        if accion not in ['acepta', 'rechaza', 'ignora']:
            return jsonify({
                'error': 'Acción debe ser: acepta, rechaza o ignora',
                'status': 'error'
            }), 400
        
        # Registrar feedback
        agente.registrar_feedback(usuario_id, sugerencia, accion, contexto)
        
        return jsonify({
            'mensaje': 'Feedback registrado exitosamente',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error en /api/feedback: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/metrics', methods=['GET'])
def metrics():
    """Endpoint para obtener métricas del sistema"""
    try:
        metricas = agente.obtener_metricas_rendimiento()
        
        return jsonify({
            'metricas': metricas,
            'timestamp': datetime.now().isoformat(),
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error en /api/metrics: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de health check"""
    try:
        # Verificar estado del agente
        test_sugerencias = agente.procesar_entrada("test", "health_check", "general")
        
        return jsonify({
            'status': 'healthy',
            'agente_operativo': True,
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error en health check: {e}")
        return jsonify({
            'status': 'unhealthy',
            'agente_operativo': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/contexts', methods=['GET'])
def contexts():
    """Endpoint para obtener contextos soportados"""
    try:
        contextos = agente.config.get('contextos_soportados', [
            'general', 'formal', 'informal', 'academico'
        ])
        
        return jsonify({
            'contextos': contextos,
            'descripcion': {
                'general': 'Contexto neutro, detecta automáticamente',
                'formal': 'Comunicación empresarial y oficial',
                'informal': 'Chat, redes sociales, conversación casual',
                'academico': 'Textos académicos y científicos'
            },
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error en /api/contexts: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/corpus/stats', methods=['GET'])
def corpus_stats():
    """Endpoint para estadísticas del corpus colombiano"""
    try:
        stats = {
            'total_palabras': len(agente.base_conocimiento.corpus_colombiano['expresiones_informales']) + 
                            len(agente.base_conocimiento.corpus_colombiano['expresiones_formales']),
            'expresiones_informales': len(agente.base_conocimiento.corpus_colombiano['expresiones_informales']),
            'expresiones_formales': len(agente.base_conocimiento.corpus_colombiano['expresiones_formales']),
            'modismos': len(agente.base_conocimiento.corpus_colombiano['modismos']),
            'correcciones': len(agente.base_conocimiento.corpus_colombiano['correcciones_frecuentes']),
            'ejemplos_colombianismos': agente.base_conocimiento.corpus_colombiano['expresiones_informales'][:5]
        }
        
        return jsonify({
            'estadisticas': stats,
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error en /api/corpus/stats: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/test', methods=['POST'])
def test_endpoint():
    """Endpoint para pruebas rápidas del sistema"""
    try:
        data = request.get_json()
        casos_prueba = data.get('casos', [
            {"texto": "Hola parce, como estas?", "contexto": "informal"},
            {"texto": "Estimado señor Martinez", "contexto": "formal"},
            {"texto": "El analisis de datos", "contexto": "academico"}
        ])
        
        resultados = []
        for caso in casos_prueba:
            sugerencias = agente.procesar_entrada(
                caso['texto'], 
                'test_user', 
                caso['contexto']
            )
            
            resultados.append({
                'entrada': caso,
                'sugerencias': [
                    {
                        'texto': sug.texto,
                        'confianza': round(sug.confianza, 3),
                        'tipo': sug.tipo
                    } for sug in sugerencias
                ],
                'total_sugerencias': len(sugerencias)
            })
        
        return jsonify({
            'resultados_prueba': resultados,
            'total_casos': len(casos_prueba),
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error en /api/test: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.errorhandler(404)
def not_found(error):
    """Manejo de errores 404"""
    return jsonify({
        'error': 'Endpoint no encontrado',
        'status': 'error',
        'code': 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Manejo de errores 500"""
    return jsonify({
        'error': 'Error interno del servidor',
        'status': 'error',
        'code': 500
    }), 500

def main():
    """Función principal para ejecutar el servidor"""
    print("🚀 Iniciando Servidor API del Agente de Texto Predictivo...")
    
    # Inicializar agente
    if not inicializar_agente():
        print("❌ Error: No se pudo inicializar el agente")
        return
    
    print("✅ Agente inicializado correctamente")
    print("📚 Endpoints disponibles:")
    print("  GET  /                    - Interfaz web principal")
    print("  GET  /demo                - Página de demostración")
    print("  POST /api/predict         - Obtener sugerencias")
    print("  POST /api/feedback        - Registrar feedback")
    print("  GET  /api/metrics         - Métricas del sistema")
    print("  GET  /api/health          - Health check")
    print("  GET  /api/contexts        - Contextos soportados")
    print("  GET  /api/corpus/stats    - Estadísticas del corpus")
    print("  POST /api/test            - Pruebas del sistema")
    print()
    print("🌐 Servidor ejecutándose en: http://localhost:5000")
    print("📖 Documentación API: http://localhost:5000/api/health")
    
    # Ejecutar servidor
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )

if __name__ == '__main__':
    main()
'''

# Guardar el archivo API
with open("api_server.py", "w", encoding="utf-8") as f:
    f.write(api_server_code)

print("✅ Archivo API creado: api_server.py")
print(f"📊 Tamaño: {len(api_server_code):,} caracteres")
print("\n🔗 Endpoints implementados:")
print("- POST /api/predict - Sugerencias predictivas")
print("- POST /api/feedback - Registro de feedback")
print("- GET /api/metrics - Métricas de rendimiento")
print("- GET /api/health - Health check")
print("- GET /api/contexts - Contextos soportados")
print("- GET /api/corpus/stats - Estadísticas del corpus")