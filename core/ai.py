# pymesec/core/ai.py

import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# ============================================================
#               CARGA DE VARIABLES DE ENTORNO
# ============================================================

# Cargar archivo .env (si existe) para obtener GEMINI_API_KEY
load_dotenv()

# Clave de API de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    # No lanzamos excepción para no botar el backend; solo avisamos.
    print("⚠️ ADVERTENCIA: GEMINI_API_KEY no encontrada en variables de entorno. "
          "El análisis de IA no estará disponible.")


# ============================================================
#                     MOTOR DE RIESGO
# ============================================================

class RiskEngine:
    """
    Motor de Riesgo Matemático.
    Calcula el Índice de Seguridad Global (ISG) basado en la severidad de
    las vulnerabilidades encontradas en el escaneo.

    La idea es transformar una lista de hallazgos técnicos en un número
    entre 0 y 100 donde:
      - 0  = Muy inseguro
      - 100 = Muy seguro

    Luego, ese número se traduce a una etiqueta cualitativa:
      - RIESGO CRÍTICO
      - RIESGO ALTO
      - RIESGO MEDIO
      - RIESGO BAJO
    """

    def __init__(self):
        # Pesos basados en severidades tipo CVSS simplificadas.
        # Cuanto mayor es el peso, mayor impacto negativo en el puntaje.
        self.weights = {
            "CRITICA": 10.0,
            "CRITICAL": 10.0,
            "ALTA": 6.0,
            "HIGH": 6.0,
            "MEDIA": 3.0,
            "MEDIUM": 3.0,
            "BAJA": 1.0,
            "LOW": 1.0,
            "INFO": 0.1,
        }
        # Puntuación máxima teórica para normalizar (por ejemplo, 100 puntos de daño).
        self.RMAX = 100.0

    def calculate_isg(self, vulnerabilities):
        """
        Calcula el Índice de Seguridad Global (ISG).

        Recibe:
            vulnerabilities: lista de dicts con al menos la clave "severity".

        Retorna:
            (score, label) donde:
              - score es un float entre 0 y 100.
              - label es una cadena con la etiqueta de riesgo.
        """
        # Si no hay vulnerabilidades, asumimos entorno muy seguro
        if not vulnerabilities:
            return 100.0, "RIESGO BAJO"

        total_risk_score = 0.0

        for vuln in vulnerabilities:
            severity = vuln.get("severity", "INFO").upper()
            weight = 0.1  # Valor mínimo por defecto

            # Buscar el peso correspondiente a la severidad
            for key, val in self.weights.items():
                if key in severity:
                    weight = val
                    break

            total_risk_score += weight

        # Limitamos el "daño" máximo a 100 para no desbordar el rango
        damage = min(total_risk_score, 100.0)

        # Fórmula simple: a mayor daño, menor puntaje
        isg_score = 100.0 - damage

        # Clasificación cualitativa según el ISG
        label = "RIESGO BAJO"
        if isg_score < 40:
            label = "RIESGO CRÍTICO"
        elif isg_score < 60:
            label = "RIESGO ALTO"
        elif isg_score < 80:
            label = "RIESGO MEDIO"

        return round(isg_score, 1), label


# ============================================================
#                 MOTOR DE EXPLICACIÓN (IA)
# ============================================================

class ExplainEngine:
    """
    Generador de texto con IA (Gemini).

    Toma los datos de un escaneo y, junto con el resultado del
    RiskEngine, produce un resumen ejecutivo orientado a gerencia,
    con fuerte énfasis en las SOLUCIONES y el plan de acción.
    """

    def generate_summary(self, scan_data, risk_score, risk_label):
        """
        Genera un resumen ejecutivo en texto plano utilizando Gemini.

        Parámetros:
            scan_data: dict con:
                - "vulnerabilities": lista de vulnerabilidades
                - "scan_meta": metadata del escaneo (host, puertos, etc.)
            risk_score: puntaje ISG (float 0-100).
            risk_label: etiqueta de riesgo ("RIESGO BAJO", "RIESGO MEDIO", etc.).

        Retorna:
            Un string con el texto completo del análisis ejecutivo.
        """
        if not GEMINI_API_KEY:
            return (
                "IA no disponible: Falta configurar GEMINI_API_KEY en el servidor. "
                "Solicita al administrador que agregue la clave en el archivo .env."
            )

        try:
            vulnerabilities = scan_data.get("vulnerabilities", [])
            # Resumen ligero de hallazgos para pasarle al modelo
            vulns_summary = [
                f"- {v.get('severity', 'INFO')}: {v.get('name', 'Unknown')}"
                for v in vulnerabilities[:15]  # Top 15 para no saturar el prompt
            ]

            target = scan_data.get("scan_meta", {}).get("host", "Objetivo")

            # Prompt detallado con fuerte foco en SOLUCIONES y PLAN DE ACCIÓN
            prompt = f"""
Actúa como un Consultor de Ciberseguridad Senior especializado en PYMES.

Contexto del escaneo:
- Objetivo analizado: {target}
- Índice de Seguridad Global (ISG): {risk_score}/100 ({risk_label})
- Total de hallazgos técnicos: {len(vulnerabilities)}

Listado resumido de hallazgos más relevantes:
{json.dumps(vulns_summary, indent=2, ensure_ascii=False)}

Con esta información, redacta un INFORME EJECUTIVO EN ESPAÑOL con el siguiente esquema,
poniendo MUY fuerte énfasis en las SOLUCIONES y el PLAN DE ACCIÓN:

1) Encabezado general (1 única línea)
   - Una frase breve que resuma el nivel de riesgo global y la idea principal
     del informe (por ejemplo, "La plataforma presenta riesgo medio con
     oportunidades claras de mejora rápida").

2) Nivel de riesgo
   - 2 o 3 frases que expliquen de forma clara la situación actual de seguridad,
     interpretando el valor {risk_score}/100 y la etiqueta {risk_label}
     en un lenguaje comprensible para gerencia y directorio.

3) Riesgo principal que enfrenta la organización
   - 3 o 4 frases centradas en el problema técnico o de configuración más crítico,
     basado en los hallazgos (por ejemplo: cabeceras de seguridad ausentes,
     puertos innecesarios abiertos, problemas de cifrado, inyección SQL, etc.).
   - Explica qué tipo de ataque se facilita y qué impacto puede tener
     (disponibilidad, confidencialidad, integridad, imagen de la marca).

4) Plan de acción prioritario
   - Este apartado debe ocupar AL MENOS EL 60% de todo el texto.
   - Escribe un listado NUMERADO de entre 4 y 7 medidas concretas.
   - Cada punto debe:
       * Empezar con un verbo en imperativo (por ejemplo:
         "Implementar", "Cerrar", "Configurar", "Revisar",
         "Desplegar", "Fortalecer", "Actualizar").
       * Indicar claramente qué se debe hacer (acción detallada),
         sobre qué componente (servidor web, base de datos, firewall,
         políticas internas, etc.).
       * Incluir, cuando tenga sentido, una referencia de plazo
         ("en las próximas 24-72 horas", "en el corto plazo (1-3 meses)",
         "como proyecto estructural de 6-12 meses").
       * Señalar si la acción es un "quick win" (impacto rápido y fácil)
         o una iniciativa de proyecto de mediano plazo.
   - Incluye tanto acciones técnicas (hardening, parches, configuraciones,
     monitoreo, segmentación de red, backups, etc.) como acciones de gestión
     (políticas de seguridad, procedimientos, capacitación de usuarios,
     definición de roles y responsabilidades).

5) Impacto de no actuar
   - 2 o 3 frases explicando de forma directa y clara qué podría ocurrir si
     la organización NO aplica las recomendaciones, mencionando ejemplos como:
     brechas de datos, indisponibilidad del servicio, sanciones regulatorias,
     pérdida de confianza de clientes y daño reputacional.

Requisitos de formato:
- NO uses Markdown (no utilices viñetas con guiones, no negritas, no cursivas).
- Usa solo texto plano.
- Utiliza títulos sencillos como líneas independientes:
  "Nivel de riesgo", "Riesgo principal", "Plan de acción prioritario",
  "Impacto de no actuar".
- Escribe párrafos cortos, fáciles de leer para una audiencia ejecutiva.
- Mantén un tono profesional pero claro, evitando tecnicismos innecesarios.
"""

            # Modelo de Gemini a utilizar (versión rápida 2.5)
            model = genai.GenerativeModel("gemini-2.5-flash")

            # Llamada al modelo
            response = model.generate_content(prompt)

            # Extraemos el texto puro
            text = getattr(response, "text", None)
            if not text:
                return "No se recibió respuesta válida del modelo de IA."

            return text.strip()

        except Exception as e:
            # Log detallado en servidor, pero mensaje amigable para usuario
            print(f"Error IA (ExplainEngine.generate_summary): {e}")
            return (
                "El análisis de IA no está disponible temporalmente debido "
                "a un error de conexión o configuración con el motor Gemini."
            )


# ============================================================
#         FUNCIÓN PRINCIPAL EXPUESTA AL RESTO DEL CÓDIGO
# ============================================================

def generate_executive_summary(scan_data: dict) -> str:
    """
    Función principal que orquesta el cálculo de riesgo (ISG) y la
    generación de un informe en lenguaje ejecutivo usando IA.

    Parámetros:
        scan_data: diccionario que debería contener:
            - "vulnerabilities": lista de hallazgos técnicos
            - "scan_meta": información de contexto del escaneo

    Retorna:
        Cadena de texto con un encabezado técnico + informe ejecutivo.
    """
    # 1. Calcular riesgo matemático con el motor interno
    risk_engine = RiskEngine()
    vulnerabilities = scan_data.get("vulnerabilities", [])
    score, label = risk_engine.calculate_isg(vulnerabilities)

    # 2. Generar explicación y plan de acción con la IA
    explain_engine = ExplainEngine()
    summary_body = explain_engine.generate_summary(scan_data, score, label)

    # 3. Componer el texto final con un encabezado técnico breve
    header = f"[Nivel de Seguridad Global: {score}/100 - {label}]"
    final_text = f"{header}\n\n{summary_body}"

    return final_text
