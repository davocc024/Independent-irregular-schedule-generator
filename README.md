# TimeGrid Studio UCE

## Introducción
TimeGrid Studio UCE es una aplicación web para organizar y visualizar horarios universitarios, especialmente aquellos con una distribución irregular de asignaturas durante la semana.
La aplicación representa las asignaturas en una cuadrícula de días y franjas horarias, permitiendo consultar y modificar la distribución semanal desde una misma interfaz.

## Funciones
* Registro y organización de asignaturas.
* Distribución de clases por días y horarios.
* Personalización visual de las asignaturas.
* Importación y exportación de información.
* Adaptación para computadores y dispositivos móviles.
* Instalación como aplicación mediante PWA en navegadores compatibles.

## Tecnologías
HTML5, CSS3 y JavaScript.
Web App Manifest para la configuración PWA.
GitHub Pages para la publicación.

## Acceso
https://davocc024.github.io/Independent-irregular-schedule-generator/

## Estado
Proyecto en desarrollo. Las funcionalidades y la interfaz pueden modificarse mediante futuras actualizaciones.

## Licencia
Distribuido bajo la GNU General Public License v3.0 (GPL-3.0). Los términos completos se encuentran en el archivo `LICENSE` del repositorio.

## Autoría
TimeGrid Studio UCE
Proyecto independiente para la organización y visualización de horarios académicos.

---

## Extracción de horarios mediante IA

TimeGrid Studio UCE puede utilizar un proceso de extracción asistido por inteligencia artificial para convertir horarios universitarios presentados como imágenes en archivos JSON compatibles con la aplicación.

El siguiente prompt está diseñado para herramientas de IA con capacidad de análisis de imágenes. Su función es extraer las asignaturas, horarios y demás campos requeridos por TimeGrid siguiendo una estructura de datos definida.

### Prompt de extracción

```text
Act as an expert OCR data extraction and academic schedule normalization engine for mobile applications. Your sole task is to process the provided university schedule document/image and extract the information for ALL subjects present, generating a 100% accurate, complete JSON file without omitting any subjects or time slots.

### STRICT EXTRACTION AND FORMATTING RULES:

1. **JSON Structure per Subject:**
   - "id": Sequential unique integer (e.g., 1, 2, 3...).
   - "name": Official subject name in Title Case (e.g., "Physical Chemistry I").
   - "level": Deduce the semester from the image title (e.g., if the title says BF4-P01, it is "Semestre 4"). Use strict Spanish format: "Semestre X".
   - "course": Deduce the parallel/section from the image title (e.g., if the title says BF4-P02, it is "P-2"). Use strict format "P-X" without leading zeros. NEVER use "P-01".
   - "note": Professor's name and classroom (e.g., "Orbea C. / Lab AL3-2"). If unavailable, leave as `""`.
   - "isMandatory": Boolean (`false` by default, set to `true` only if explicitly instructed).
   - "color": Assign the SAME hex color to all sections of the same subject. Choose strictly from this list: ["#a8c7fa", "#e5c07b", "#81c995", "#fde293", "#f28b82", "#78d9ec", "#fcaded", "#a8dab5", "#fcb97d", "#8ab4f8"].
   - "slots": Array of time blocks. Each object must contain:
     - "day": Day of the week in Spanish UPPERCASE with correct accent marks ("LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES").
     - "start": Start time as a 24-hour integer (e.g., 7, 10, 14). No decimals.
     - "end": End time as a 24-hour integer (e.g., 9, 13, 17). No decimals.

2. **Consecutive Hours Merging (CRITICAL):**
   - Carefully read the grid rows (7:00 to 20:00).
   - If a class spans back-to-back hours on the same day (e.g., 14:00 to 15:00 and 15:00 to 16:00), you MUST combine them into a single continuous time slot (`start: 14`, `end: 16`). Do not leave separate 1-hour blocks if they are continuous.

3. **MANDATORY INTERNAL AUDIT PROTOCOL (Self-Correction):**
   Before generating the final output, perform a silent internal check:
   - *Course Check:* Is the `course` field formatted exactly as `"P-1"` (no central zero)?
   - *Completeness Check:* Have all visible hours for ALL subjects been extracted without omission?
   - *Syntax Check:* Are `start` and `end` formatted as integers? Is `isMandatory` a boolean? Are the Spanish accents correct on the days?
   - If you detect any discrepancy, fix the affected block internally before outputting the data.

Return ONLY the final JSON code block. Absolutely no greetings, explanations, or text outside the JSON block.
```
