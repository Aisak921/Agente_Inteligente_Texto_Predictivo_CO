#!/bin/bash
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
