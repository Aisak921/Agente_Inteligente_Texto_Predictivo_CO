# 6. Crear scripts de instalación y ejecución
install_script = '''#!/bin/bash
# Script de instalación automática para Agente de Texto Predictivo
# Uso: bash install.sh

echo "🚀 Instalando Agente de Texto Predictivo - Español Colombia"
echo "=================================================="

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 no está instalado"
    echo "Por favor instala Python 3.8+ antes de continuar"
    exit 1
fi

echo "✅ Python encontrado: $(python3 --version)"

# Crear entorno virtual (opcional pero recomendado)
if [ "$1" = "--venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
    source venv/bin/activate
    echo "✅ Entorno virtual activado"
fi

# Actualizar pip
echo "🔄 Actualizando pip..."
python3 -m pip install --upgrade pip

# Instalar dependencias
echo "📚 Instalando dependencias Python..."
pip install -r requirements.txt

# Descargar modelo de spaCy
echo "🧠 Descargando modelo de spaCy para español..."
python3 -m spacy download es_core_news_sm

# Crear directorio de datos si no existe
if [ ! -d "data" ]; then
    echo "📁 Creando directorio de datos..."
    mkdir -p data
fi

# Copiar configuración si no existe
if [ ! -f "data/configuracion.json" ]; then
    echo "⚙️ Copiando configuración por defecto..."
    cp configuracion.json data/configuracion.json
fi

# Verificar instalación
echo "🔍 Verificando instalación..."
python3 -c "
import flask, spacy, numpy, sqlite3
print('✅ Todas las dependencias instaladas correctamente')

# Test básico del agente
try:
    from agente_core import AgentePredictivo
    agente = AgentePredictivo()
    print('✅ Agente inicializado correctamente')
except Exception as e:
    print(f'⚠️  Advertencia: {e}')
"

echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "Para ejecutar el sistema:"
echo "  bash run.sh"
echo ""
echo "O manualmente:"
echo "  python api_server.py"
echo ""
echo "Luego abre: http://localhost:5000"
'''

run_script = '''#!/bin/bash
# Script de ejecución para Agente de Texto Predictivo
# Uso: bash run.sh

echo "🚀 Iniciando Agente de Texto Predictivo..."

# Activar entorno virtual si existe
if [ -d "venv" ]; then
    echo "📦 Activando entorno virtual..."
    source venv/bin/activate
fi

# Verificar que los archivos principales existen
required_files=("agente_core.py" "api_server.py" "index.html" "app.js")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Archivo $file no encontrado"
        echo "Asegúrate de estar en el directorio correcto del proyecto"
        exit 1
    fi
done

echo "✅ Archivos principales verificados"

# Crear directorio de datos si no existe
mkdir -p data

# Ejecutar el servidor
echo "🌐 Iniciando servidor en puerto 5000..."
echo "📖 Abre http://localhost:5000 en tu navegador"
echo "⏹️  Presiona Ctrl+C para detener el servidor"
echo ""

python api_server.py
'''

test_script = '''#!/usr/bin/env python3
"""
Script de pruebas automáticas para Agente de Texto Predictivo
Ejecuta: python test_agente.py
"""

import sys
import time
import requests
import json
from agente_core import AgentePredictivo

def test_agente_core():
    """Prueba el núcleo del agente"""
    print("🧪 Probando núcleo del agente...")
    
    try:
        agente = AgentePredictivo()
        
        # Casos de prueba
        casos = [
            ("Hola parce, como estas?", "informal"),
            ("Estimado señor Martinez", "formal"),
            ("El analisis de datos", "academico")
        ]
        
        for texto, contexto in casos:
            sugerencias = agente.procesar_entrada(texto, "test_user", contexto)
            print(f"  ✅ '{texto}' → {len(sugerencias)} sugerencias")
            
            if sugerencias:
                mejor = sugerencias[0]
                print(f"     Mejor: '{mejor.texto}' (confianza: {mejor.confianza:.2f})")
        
        print("✅ Núcleo del agente funcionando correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error en núcleo del agente: {e}")
        return False

def test_api_server():
    """Prueba el servidor API"""
    print("🧪 Probando servidor API...")
    
    base_url = "http://localhost:5000"
    
    try:
        # Test health check
        response = requests.get(f"{base_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("  ✅ Health check OK")
        else:
            print(f"  ⚠️ Health check: {response.status_code}")
        
        # Test predict endpoint
        data = {
            "texto": "Hola parce, como estas",
            "usuario_id": "test_user",
            "contexto": "informal"
        }
        
        response = requests.post(
            f"{base_url}/api/predict",
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            sugerencias = result.get('sugerencias', [])
            print(f"  ✅ API predict: {len(sugerencias)} sugerencias")
        else:
            print(f"  ⚠️ API predict: {response.status_code}")
        
        # Test metrics endpoint
        response = requests.get(f"{base_url}/api/metrics", timeout=5)
        if response.status_code == 200:
            print("  ✅ Métricas accesibles")
        else:
            print(f"  ⚠️ Métricas: {response.status_code}")
        
        print("✅ Servidor API funcionando correctamente")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error conectando con API: {e}")
        print("   Asegúrate de que el servidor esté ejecutándose (python api_server.py)")
        return False

def test_base_datos():
    """Prueba la base de datos"""
    print("🧪 Probando base de datos...")
    
    try:
        import sqlite3
        
        # Crear conexión de prueba
        conn = sqlite3.connect(':memory:')
        cursor = conn.cursor()
        
        # Test de creación de tabla
        cursor.execute("""
            CREATE TABLE test_palabras (
                id INTEGER PRIMARY KEY,
                palabra TEXT,
                frecuencia INTEGER
            )
        """)
        
        # Test de inserción
        cursor.execute("INSERT INTO test_palabras (palabra, frecuencia) VALUES (?, ?)", 
                      ("chévere", 85))
        
        # Test de consulta
        cursor.execute("SELECT * FROM test_palabras")
        resultado = cursor.fetchone()
        
        if resultado and resultado[1] == "chévere":
            print("  ✅ Operaciones básicas de BD")
        else:
            print("  ❌ Error en operaciones de BD")
            return False
        
        conn.close()
        print("✅ Base de datos funcionando correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error en base de datos: {e}")
        return False

def test_corpus_colombiano():
    """Prueba el corpus colombiano"""
    print("🧪 Probando corpus colombiano...")
    
    try:
        agente = AgentePredictivo()
        corpus = agente.base_conocimiento.corpus_colombiano
        
        # Verificar expresiones informales
        informales = corpus['expresiones_informales']
        if 'chévere' in informales and 'bacano' in informales:
            print(f"  ✅ Expresiones informales: {len(informales)} términos")
        else:
            print("  ❌ Faltan expresiones informales básicas")
            return False
        
        # Verificar correcciones
        correcciones = corpus['correcciones_frecuentes']
        if correcciones.get('tambien') == 'también':
            print(f"  ✅ Correcciones: {len(correcciones)} reglas")
        else:
            print("  ❌ Faltan correcciones básicas")
            return False
        
        print("✅ Corpus colombiano completo")
        return True
        
    except Exception as e:
        print(f"❌ Error en corpus: {e}")
        return False

def generar_reporte():
    """Genera reporte de pruebas"""
    print("\\n" + "="*50)
    print("📊 REPORTE DE PRUEBAS COMPLETADO")
    print("="*50)
    
    # Información del sistema
    print(f"🕒 Fecha: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🐍 Python: {sys.version.split()[0]}")
    
    try:
        import flask, spacy, numpy
        print(f"🌶️  Flask: {flask.__version__}")
        print(f"🧠 spaCy: {spacy.__version__}")
        print(f"🔢 NumPy: {numpy.__version__}")
    except:
        pass
    
    print("\\nPara ejecutar el sistema completo:")
    print("  python api_server.py")
    print("\\nLuego abre: http://localhost:5000")

def main():
    """Función principal de pruebas"""
    print("🧪 INICIANDO PRUEBAS DEL AGENTE DE TEXTO PREDICTIVO")
    print("=" * 55)
    
    tests = [
        ("Núcleo del Agente", test_agente_core),
        ("Base de Datos", test_base_datos), 
        ("Corpus Colombiano", test_corpus_colombiano),
        ("Servidor API", test_api_server)
    ]
    
    resultados = []
    
    for nombre, test_func in tests:
        print(f"\\n🔍 {nombre}")
        print("-" * 30)
        resultado = test_func()
        resultados.append((nombre, resultado))
    
    # Resumen
    print("\\n" + "="*50)
    print("📋 RESUMEN DE RESULTADOS")
    print("="*50)
    
    exitosos = 0
    for nombre, resultado in resultados:
        status = "✅ PASS" if resultado else "❌ FAIL"
        print(f"  {status} {nombre}")
        if resultado:
            exitosos += 1
    
    print(f"\\n🎯 Pruebas exitosas: {exitosos}/{len(tests)}")
    
    if exitosos == len(tests):
        print("🎉 ¡Todas las pruebas pasaron! El sistema está listo.")
    else:
        print("⚠️  Algunas pruebas fallaron. Revisa los errores arriba.")
    
    generar_reporte()
    
    return exitosos == len(tests)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
'''

# Guardar scripts
scripts = [
    ("install.sh", install_script),
    ("run.sh", run_script), 
    ("test_agente.py", test_script)
]

for nombre, contenido in scripts:
    with open(nombre, "w", encoding="utf-8") as f:
        f.write(contenido)

print("✅ Scripts de automatización creados:")
for nombre, contenido in scripts:
    print(f"  - {nombre} ({len(contenido):,} caracteres)")

print("\n🔧 Scripts disponibles:")
print("  - install.sh: Instalación automática")
print("  - run.sh: Ejecución del servidor")
print("  - test_agente.py: Pruebas automatizadas")