#!/bin/bash
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
